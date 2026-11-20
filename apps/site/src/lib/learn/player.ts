import { useSyncExternalStore } from "react";

/**
 * One sound at a time across a lesson page. A control asks whether its own key is the one playing,
 * so a button, a key or a word shows activity only while its sound plays.
 */
let audio: HTMLAudioElement | null = null;
let playingKey: string | null = null;
const listeners = new Set<() => void>();
const emit = () => {
  for (const listener of listeners) listener();
};

export function stopSound(): void {
  audio?.pause();
  audio = null;
  if (playingKey !== null) {
    playingKey = null;
    emit();
  }
}

/** Plays `src`, marked as `key`, and resolves when it ends or fails. `onFrame` gets its current time. */
export function playSound(
  src: string,
  key: string = src,
  onFrame?: (seconds: number) => void,
): Promise<void> {
  stopSound();
  const sound = new Audio(src);
  audio = sound;
  playingKey = key;
  emit();
  return new Promise((resolve) => {
    let frame = 0;
    const tick = () => {
      onFrame?.(sound.currentTime);
      if (!sound.paused) frame = requestAnimationFrame(tick);
    };
    const done = () => {
      cancelAnimationFrame(frame);
      if (audio === sound) {
        audio = null;
        playingKey = null;
        emit();
      }
      resolve();
    };
    sound.onended = done;
    sound.onerror = done;
    sound.onpause = done;
    if (onFrame) sound.onplay = () => (frame = requestAnimationFrame(tick));
    sound.play().catch(done);
  });
}

export async function playInTurn(items: readonly { src: string; key: string }[]): Promise<void> {
  for (const item of items) {
    await playSound(item.src, item.key);
    await new Promise((resolve) => setTimeout(resolve, 260));
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePlaying(key: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => playingKey === key,
    () => false,
  );
}

const decoded = new Map<string, Promise<{ bars: number[]; seconds: number; lead: number }>>();
let context: AudioContext | null = null;

/**
 * A clip's loudness in 12 ms steps, from 0 to 1, with the silence at either end cut off; `lead`
 * is how much silence came before the first sound.
 */
export function loudness(src: string): Promise<{ bars: number[]; seconds: number; lead: number }> {
  let pending = decoded.get(src);
  if (!pending) {
    pending = fetch(src)
      .then((response) => response.arrayBuffer())
      .then((buffer) => {
        context ??= new AudioContext();
        return context.decodeAudioData(buffer);
      })
      .then((clip) => {
        const data = clip.getChannelData(0);
        const step = Math.round(clip.sampleRate * 0.012);
        const levels: number[] = [];
        for (let i = 0; i < data.length; i += step) {
          let sum = 0;
          const end = Math.min(i + step, data.length);
          for (let j = i; j < end; j++) sum += (data[j] ?? 0) ** 2;
          levels.push(Math.sqrt(sum / step));
        }
        const max = Math.max(...levels) || 1;
        const floor = max * 0.07;
        const first = Math.max(
          0,
          levels.findIndex((v) => v > floor),
        );
        const last = levels.length - 1 - [...levels].reverse().findIndex((v) => v > floor);
        const bars = levels.slice(first, last + 1).map((v) => Math.min(1, v / max));
        return { bars, seconds: bars.length * 0.012, lead: first * 0.012 };
      });
    decoded.set(src, pending);
  }
  return pending;
}

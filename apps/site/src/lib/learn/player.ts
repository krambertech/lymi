import { useSyncExternalStore } from "react";

/**
 * One sound at a time across a lesson page. A control asks whether its own key is the one playing,
 * so a button, a key or a word shows activity only while its sound plays.
 */
/**
 * One audio element for the whole page, its source swapped per clip. iOS Safari lets an element
 * play once a tap has started it, so a later clip in a sequence still plays after the tap is past.
 */
let element: HTMLAudioElement | null = null;
export type SoundEnd = "ended" | "cut" | "failed";

/** Ends the clip playing now: resolves its promise and clears its mark. */
let finish: ((end: SoundEnd) => void) | null = null;
/** Bumped by every sound started from outside a sequence, so a running sequence knows to stop. */
let turn = 0;
let playingKey: string | null = null;
const listeners = new Set<() => void>();
const emit = () => {
  for (const listener of listeners) listener();
};

export function stopSound(): void {
  const end = finish;
  finish = null;
  element?.pause();
  if (playingKey !== null) {
    playingKey = null;
    emit();
  }
  end?.("cut");
}

export function setSoundRate(key: string, rate: number): void {
  if (element && playingKey === key) element.playbackRate = rate;
}

/** Plays `src`, marked as `key`, and resolves when it ends or fails. `onFrame` gets its current time. */
export function playSound(
  src: string,
  key: string = src,
  onFrame?: (seconds: number) => void,
  /** Where to start, in seconds. */
  from = 0,
  rate = 1,
): Promise<SoundEnd> {
  turn += 1;
  setSequence(null);
  return start(src, key, onFrame, from, rate);
}

export function toggleSound(src: string, key: string = src): Promise<SoundEnd> {
  if (isPlaying(key)) return Promise.resolve(stopAll());
  return playSound(src, key);
}

export function toggleSlowly(src: string): Promise<SoundEnd> {
  if (isPlaying(slowKey(src))) return Promise.resolve(stopAll());
  return playSlowly(src);
}

export const SLOW_RATE = 0.75;
export const slowKey = (src: string) => `${src}#slow`;

export function playSlowly(src: string): Promise<SoundEnd> {
  turn += 1;
  setSequence(null);
  return start(src, slowKey(src), undefined, 0, SLOW_RATE);
}

function start(
  src: string,
  key: string,
  onFrame?: (seconds: number) => void,
  from = 0,
  rate = 1,
): Promise<SoundEnd> {
  stopSound();
  element ??= new Audio();
  const sound = element;
  sound.preservesPitch = true;
  sound.defaultPlaybackRate = rate;
  // The same clip again keeps its loaded audio, unless loading it failed: then it loads anew.
  if (!sound.src.endsWith(src) || sound.error) sound.src = src;
  sound.playbackRate = rate;
  sound.currentTime = from;
  playingKey = key;
  emit();
  return new Promise((resolve) => {
    let frame = 0;
    let over = false;
    const tick = () => {
      onFrame?.(sound.currentTime);
      if (!over) frame = requestAnimationFrame(tick);
    };
    const done = (end: SoundEnd) => {
      if (over) return;
      over = true;
      cancelAnimationFrame(frame);
      sound.onended = null;
      sound.onerror = null;
      sound.onplay = null;
      sound.onplaying = null;
      sound.onpause = null;
      if (finish === done) {
        finish = null;
        playingKey = null;
        emit();
      }
      resolve(end);
    };
    finish = done;
    sound.onended = () => done("ended");
    sound.onerror = () => done("failed");
    // A pause from outside the page (the lock screen, a call) ends the clip too. It is listened for
    // only once this clip plays, so the pause that stopped the clip before it can't end this one.
    sound.onplaying = () => {
      sound.onpause = () => done(sound.ended ? "ended" : "cut");
    };
    if (onFrame) sound.onplay = () => (frame = requestAnimationFrame(tick));
    sound.play().catch(() => done("failed"));
  });
}

let sequenceKey: string | null = null;

const isPlaying = (key: string) => playingKey === key || sequenceKey === key;

export function stopAll(): SoundEnd {
  turn += 1;
  stopSound();
  setSequence(null);
  return "cut";
}

function setSequence(key: string | null) {
  if (sequenceKey === key) return;
  sequenceKey = key;
  emit();
}

/** Plays clips one after another; any other sound started meanwhile ends the sequence. */
export async function playInTurn(
  items: readonly { src: string; key: string }[],
  key: string | null = null,
): Promise<{ finished: boolean; at: number }> {
  turn += 1;
  const mine = turn;
  setSequence(key);
  try {
    for (const [i, item] of items.entries()) {
      if (turn !== mine) return { finished: false, at: i };
      if ((await start(item.src, item.key)) === "cut") return { finished: false, at: i };
      if (i < items.length - 1) await new Promise((resolve) => setTimeout(resolve, 260));
    }
    return { finished: true, at: items.length };
  } finally {
    if (turn === mine) setSequence(null);
  }
}

export function toggleInTurn(
  items: readonly { src: string; key: string }[],
  key: string,
): Promise<{ finished: boolean; at: number }> | null {
  if (sequenceKey !== key) return playInTurn(items, key);
  stopAll();
  return null;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePlaying(key: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => isPlaying(key),
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
      .then((response) => {
        if (!response.ok) throw new Error(`${src} answered ${response.status}`);
        return response.arrayBuffer();
      })
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
    // A failed load isn't kept, so the next look tries again.
    pending.catch(() => decoded.delete(src));
    decoded.set(src, pending);
  }
  return pending;
}

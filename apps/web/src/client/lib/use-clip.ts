import { useCallback, useEffect, useRef } from "react";

let speaking: HTMLAudioElement | null = null;

interface LoadOptions {
  onReady?: () => void;
  onEnd?: () => void;
}

export interface Clip {
  play: () => Promise<boolean>;
}

export function useClip() {
  const turn = useRef<{ audio: HTMLAudioElement } | null>(null);
  const mounted = useRef(false);

  const stop = useCallback(() => {
    const last = turn.current;
    turn.current = null;
    last?.audio.pause();
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stop();
    };
  }, [stop]);

  const load = useCallback((src: string, { onReady, onEnd }: LoadOptions = {}): Clip => {
    const audio = new Audio(src);
    const end = () => {
      if (turn.current?.audio !== audio) return;
      turn.current = null;
      onEnd?.();
    };
    audio.addEventListener("ended", end);
    audio.addEventListener("pause", () => {
      if (audio.paused) end();
    });
    if (onReady) audio.addEventListener("canplaythrough", onReady, { once: true });

    const play = async () => {
      if (!mounted.current) return false;
      if (speaking !== audio) speaking?.pause();
      speaking = audio;
      const mine = { audio };
      turn.current = mine;
      audio.currentTime = 0;
      try {
        await audio.play();
      } catch (error) {
        if (turn.current !== mine) return false;
        turn.current = null;
        throw error;
      }
      return turn.current === mine;
    };
    return { play };
  }, []);

  return { load, stop };
}

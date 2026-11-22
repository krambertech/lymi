import { useCallback, useEffect, useRef, useState } from "react";

type ClipState =
  | { status: "idle" }
  | { status: "playing"; id: string; at: number }
  | { status: "failed"; id: string };

const IDLE: ClipState = { status: "idle" };

interface Options {
  progress?: boolean;
}

export function useClip({ progress = false }: Options = {}) {
  const current = useRef<HTMLAudioElement | null>(null);
  const frame = useRef(0);
  const mounted = useRef(false);
  const [state, setState] = useState<ClipState>(IDLE);

  const release = useCallback(() => {
    const clip = current.current;
    current.current = null;
    cancelAnimationFrame(frame.current);
    clip?.pause();
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      release();
    };
  }, [release]);

  const stop = useCallback(() => {
    release();
    setState(IDLE);
  }, [release]);

  const play = useCallback(
    (id: string, src: string) => {
      if (!mounted.current) return;
      release();
      const clip = new Audio(src);
      current.current = clip;
      setState({ status: "playing", id, at: 0 });
      const end = (next: ClipState) => {
        if (current.current !== clip) return;
        release();
        setState(next);
      };
      const follow = () => {
        if (current.current !== clip) return;
        const at = clip.duration ? clip.currentTime / clip.duration : 0;
        setState({ status: "playing", id, at });
        frame.current = requestAnimationFrame(follow);
      };
      const ended = () => end(IDLE);
      const failed = () => end({ status: "failed", id });
      clip.addEventListener("ended", ended);
      clip.addEventListener("pause", ended);
      clip.addEventListener("error", failed);
      clip.play().then(progress ? follow : undefined, failed);
    },
    [progress, release],
  );

  return {
    playing: state.status === "playing" ? state : null,
    failed: state.status === "failed" ? state.id : null,
    play,
    stop,
  };
}

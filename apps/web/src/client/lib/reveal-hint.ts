import { useEffect, useState } from "react";

const KEY = "lymi-reveals";
/** Reveals after which the learner has shown they know the card is the button. */
export const LEARNED_AFTER = 3;
const NEW_LEARNER_DELAY_MS = 1_000;
const IDLE_DELAY_MS = 60_000;

// Kept in memory as well, so a browser that refuses storage still stops hinting in one session.
let memory = 0;

function readReveals(): number {
  try {
    return Math.max(Number(localStorage.getItem(KEY)) || 0, memory);
  } catch {
    return memory;
  }
}

/** Counts a reveal, by tap or keyboard, until the learner has made enough to stop the hint. */
export function recordReveal(): void {
  const next = readReveals() + 1;
  if (next > LEARNED_AFTER) return;
  memory = next;
  try {
    localStorage.setItem(KEY, String(next));
  } catch {}
}

/** A new learner is shown the hint after a second; everyone else only after a minute idle. */
export function hintDelayMs(reveals: number): number {
  return reveals < LEARNED_AFTER ? NEW_LEARNER_DELAY_MS : IDLE_DELAY_MS;
}

const ACTIVITY = ["pointerdown", "keydown", "wheel"] as const;

/**
 * Whether the unrevealed card should show how to reveal it. The clock starts with each card and,
 * until the hint appears, restarts on any press, key or scroll, so it only answers a learner who
 * is looking at the card and doing nothing.
 */
export function useRevealHint(cardKey: string | undefined, revealed: boolean): boolean {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(false);
    if (!cardKey || revealed) return;
    const delay = hintDelayMs(readReveals());
    let timer = 0;
    const start = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        setShow(true);
        for (const e of ACTIVITY) window.removeEventListener(e, start);
      }, delay);
    };
    start();
    for (const e of ACTIVITY) window.addEventListener(e, start, { passive: true });
    return () => {
      window.clearTimeout(timer);
      for (const e of ACTIVITY) window.removeEventListener(e, start);
    };
  }, [cardKey, revealed]);
  return show;
}

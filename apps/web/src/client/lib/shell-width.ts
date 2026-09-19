import { type RefObject, useLayoutEffect, useState } from "react";

/** The width at which the rail appears and chrome takes its desktop place: `@3xl/shell` in CSS. */
const WIDE = 768;

function shellOf(el: Element): Element | null {
  for (let at = el.parentElement; at; at = at.parentElement) {
    if (getComputedStyle(at).containerName.split(" ").includes("shell")) return at;
  }
  return null;
}

/**
 * Whether the shell container around `ref` is wide, for chrome that must mount in one place rather
 * than hide a copy with CSS. It measures the container, not the window, so a phone frame on the
 * design page still reads as a phone.
 */
export function useShellWide(ref: RefObject<Element | null>): boolean {
  const [wide, setWide] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= WIDE,
  );
  useLayoutEffect(() => {
    const shell = ref.current && shellOf(ref.current);
    if (!shell) return;
    setWide(shell.clientWidth >= WIDE);
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWide(entry.contentRect.width >= WIDE);
    });
    observer.observe(shell);
    return () => observer.disconnect();
  }, [ref]);
  return wide;
}

import { useCallback, useLayoutEffect, useRef } from "react";

const scrollerOf = (node: HTMLElement): HTMLElement => {
  for (let up = node.parentElement; up; up = up.parentElement)
    if (up.scrollHeight > up.clientHeight && /auto|scroll/.test(getComputedStyle(up).overflowY))
      return up;
  return (document.scrollingElement ?? document.documentElement) as HTMLElement;
};

export function useHoldInPlace(): (node: HTMLElement) => void {
  const held = useRef<{ node: HTMLElement; top: number } | null>(null);
  useLayoutEffect(() => {
    const { current } = held;
    if (!current) return;
    held.current = null;
    if (!current.node.isConnected) return;
    const moved = current.node.getBoundingClientRect().top - current.top;
    if (Math.abs(moved) >= 1)
      scrollerOf(current.node).scrollBy({ top: moved, behavior: "instant" });
  });
  return useCallback((node) => {
    held.current = { node, top: node.getBoundingClientRect().top };
  }, []);
}

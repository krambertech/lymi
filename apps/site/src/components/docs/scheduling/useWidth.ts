import { type RefObject, useEffect, useState } from "react";

/** The element's content width, so a chart draws at its real size and its text stays legible. */
export function useWidth(ref: RefObject<HTMLElement | null>, initial: number): number {
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

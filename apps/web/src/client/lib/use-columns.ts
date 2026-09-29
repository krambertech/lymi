import { type RefObject, useEffect, useState } from "react";

/**
 * How many tracks of at least `min` px, `gap` px apart, fit the element's width: the column count
 * `repeat(auto-fill, minmax(min, 1fr))` lays out, so a caller can render exactly one row of it.
 */
export function useColumns(ref: RefObject<HTMLElement | null>, min: number, gap: number): number {
  const [columns, setColumns] = useState(1);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const read = () => setColumns(Math.max(1, Math.floor((node.clientWidth + gap) / (min + gap))));
    read();
    const size = new ResizeObserver(read);
    size.observe(node);
    return () => size.disconnect();
  }, [ref, min, gap]);
  return columns;
}

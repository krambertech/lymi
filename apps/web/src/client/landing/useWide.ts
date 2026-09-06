import { useEffect, useState } from "react";

/**
 * True when there is room for a column of cards beside the headline.
 *
 * The hero has two shapes and only one of them may exist at a time. Hiding the other with a
 * class is not enough: it still mounts, still runs its own animation loop, and still reports
 * a position for the lamp, which is how the light ended up in the corner of the page.
 */
const WIDE = "(min-width: 768px)";

export function useWide(): boolean {
  const [wide, setWide] = useState(
    () => typeof window !== "undefined" && window.matchMedia(WIDE).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(WIDE);
    const onChange = () => setWide(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return wide;
}

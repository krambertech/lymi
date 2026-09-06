import { useEffect, useState } from "react";

/**
 * True when there is room for a column of cards beside the headline.
 *
 * The hero has two shapes and only one of them may exist at a time. Hiding the other with a
 * class is not enough: it still mounts, still runs its own animation loop, and still reports
 * a position for the lamp, which is how the light ended up in the corner of the page.
 */
/**
 * 640px, not a tablet breakpoint. The column shrinks with the viewport, so it fits beside the
 * headline far earlier than a fixed 292px one would, and the cards belong next to the copy
 * rather than trailing underneath it wherever there is any room at all.
 */
const WIDE = "(min-width: 640px)";

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

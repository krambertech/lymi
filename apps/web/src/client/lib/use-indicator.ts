import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

/**
 * A chip that slides to the pressed option of a segmented group. The container must be
 * positioned and hold the options as `aria-pressed` buttons; the chip is placed with `translate`
 * and `width` so the options never reflow. The first placement, a resize and a change made from
 * the keyboard jump instead of sliding.
 */
export function useIndicator<T extends HTMLElement>(value: string) {
  const containerRef = useRef<T>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const instant = useRef(true);

  const place = useCallback(() => {
    const container = containerRef.current;
    const chip = indicatorRef.current;
    if (!container || !chip) return;
    const on = container.querySelector<HTMLElement>('[aria-pressed="true"]');
    chip.hidden = !on;
    if (!on) return;
    if (instant.current) chip.dataset.instant = "";
    const rtl = getComputedStyle(container).direction === "rtl";
    const start = rtl ? container.clientWidth - on.offsetLeft - on.offsetWidth : on.offsetLeft;
    chip.style.width = `${on.offsetWidth}px`;
    chip.style.translate = `${rtl ? -start : start}px 0`;
    if (instant.current) {
      chip.getBoundingClientRect();
      delete chip.dataset.instant;
      instant.current = false;
    }
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `value` is what moves the chip.
  useLayoutEffect(place, [value, place]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      instant.current = true;
      place();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [place]);

  /** Call before a change the keyboard made, so the chip jumps. */
  const jump = useCallback(() => {
    instant.current = true;
  }, []);

  return { containerRef, indicatorRef, jump };
}

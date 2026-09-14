import { cn } from "cn";
import { animate, motion, useMotionValue, useReducedMotionConfig } from "motion/react";
import * as React from "react";
import { CHOICE_FADE, CHOICE_SLIDE } from "../../lib/choice-motion";

interface SlidingPlateProps {
  /** Selector for the chosen item among the plate's siblings. */
  chosen: string;
  /** The attribute whose change moves the choice. */
  attribute: string;
  /** Selector for the plate's own group, so a nested group's choice is never taken for this one's. */
  within?: string | undefined;
  "data-slot"?: string | undefined;
  className?: string | undefined;
}

/**
 * The plate under the chosen item of a horizontal row, first inside its positioned parent. It
 * springs to a pointer's choice and jumps for a key; DESIGN.md "Motion" has its timing.
 */
export function SlidingPlate({
  chosen,
  attribute,
  within,
  "data-slot": slot,
  className,
}: SlidingPlateProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotionConfig() ?? false;
  const reduceRef = React.useRef(reduce);
  reduceRef.current = reduce;
  const x = useMotionValue(0);
  const width = useMotionValue(0);
  const opacity = useMotionValue(1);

  React.useLayoutEffect(() => {
    const chip = ref.current;
    const group = chip?.parentElement;
    if (!chip || !group) return;
    let placed = false;
    let keyboard = false;

    const place = (glide: boolean) => {
      const on = Array.from(group.querySelectorAll<HTMLElement>(chosen)).find(
        (item) => !within || item.closest(within) === group,
      );
      chip.hidden = !on;
      if (!on) {
        placed = false;
        return;
      }
      // Measured inside the group, so the plate never chases the group itself across the page.
      const rtl = getComputedStyle(group).direction === "rtl";
      const start = rtl ? group.clientWidth - on.offsetLeft - on.offsetWidth : on.offsetLeft;
      const toX = rtl ? -start : start;
      const toWidth = on.offsetWidth;
      if (placed && glide && !reduceRef.current) {
        animate(x, toX, CHOICE_SLIDE);
        animate(width, toWidth, CHOICE_SLIDE);
      } else {
        const moved = placed && (toX !== x.get() || toWidth !== width.get());
        x.jump(toX);
        width.jump(toWidth);
        // Under reduced motion the plate fades in where it lands instead of travelling there.
        if (moved && glide) animate(opacity, [0, 1], CHOICE_FADE);
      }
      placed = true;
    };

    place(false);
    // A click the keyboard made has no pointer detail; the flag lasts only for the change that click causes.
    const onClick = (event: MouseEvent) => {
      keyboard = event.detail === 0;
      setTimeout(() => {
        keyboard = false;
      });
    };
    group.addEventListener("click", onClick, true);
    const changed = new MutationObserver(() => place(!keyboard));
    changed.observe(group, { subtree: true, attributeFilter: [attribute] });
    const resized = new ResizeObserver(() => place(false));
    resized.observe(group);
    return () => {
      group.removeEventListener("click", onClick, true);
      changed.disconnect();
      resized.disconnect();
    };
  }, [x, width, opacity, chosen, attribute, within]);

  return (
    <motion.span
      ref={ref}
      aria-hidden="true"
      data-slot={slot}
      style={{ x, width, opacity }}
      className={cn("pointer-events-none absolute start-0", className)}
    />
  );
}

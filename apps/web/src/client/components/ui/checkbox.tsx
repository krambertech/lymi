import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { cn } from "cn";
import { motion, useAnimate, useReducedMotionConfig } from "motion/react";
import * as React from "react";
import {
  CHOICE_DRAW,
  CHOICE_FADE,
  CHOICE_LEAVE,
  CHOICE_POP,
  INSTANT,
} from "../../lib/choice-motion";
import { useField, useFieldControl } from "./field";

// shadcn's Checkbox; the indicator draws the box and stays mounted so the tick can leave as well as arrive.

function Checkbox({ className, disabled, ...props }: CheckboxPrimitive.Root.Props) {
  const field = useField();
  const control = useFieldControl(props);
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      disabled={disabled || field?.disabled}
      className={cn(
        "group/checkbox relative inline-grid size-5 shrink-0 cursor-pointer place-items-center rounded-[6px] outline-none",
        "transition-[scale] duration-150 ease-(--ease-out) active:scale-90 motion-reduce:active:scale-100",
        // Carries the touch target to 44 px without moving anything around it.
        "after:absolute after:-inset-3 after:content-['']",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "data-disabled:cursor-not-allowed data-disabled:opacity-45 data-disabled:active:scale-100",
        className,
      )}
      {...props}
      {...control}
    >
      <CheckboxPrimitive.Indicator
        keepMounted
        data-slot="checkbox-indicator"
        className="absolute inset-0"
        render={(indicatorProps, state) => (
          <span {...indicatorProps}>
            <CheckboxBox checked={state.checked} indeterminate={state.indeterminate} />
          </span>
        )}
      />
    </CheckboxPrimitive.Root>
  );
}

function CheckboxBox({ checked, indeterminate }: { checked: boolean; indeterminate: boolean }) {
  const reduce = useReducedMotionConfig() ?? false;
  const on = checked || indeterminate;
  const [scope, animate] = useAnimate<HTMLSpanElement>();
  const previous = React.useRef(on);
  React.useEffect(() => {
    if (previous.current === on) return;
    previous.current = on;
    // The box catches the tick: it gives a little and springs back as the fill lands.
    if (on && !reduce && scope.current) animate(scope.current, { scale: [0.78, 1] }, CHOICE_POP);
  }, [on, reduce, animate, scope]);

  const mark = (shown: boolean) => ({
    animate: { pathLength: shown || reduce ? 1 : 0, opacity: shown ? 1 : 0 },
    transition: shown
      ? { pathLength: reduce ? INSTANT : CHOICE_DRAW, opacity: reduce ? CHOICE_FADE : INSTANT }
      : CHOICE_LEAVE,
  });

  return (
    <span
      ref={scope}
      className={cn(
        "absolute inset-0 grid place-items-center rounded-[6px] text-amber-ink transition-[background-color,box-shadow] duration-150",
        on ? "bg-amber" : "edge-2 bg-plate hoverable:group-hover/checkbox:bg-hover",
        "group-aria-invalid/checkbox:shadow-[0_0_0_1px_var(--danger)]",
      )}
    >
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        className="size-3.5 overflow-visible"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <motion.path
          d="M3.25 8.5 6.5 11.75 12.75 4.5"
          initial={false}
          {...mark(checked && !indeterminate)}
        />
        <motion.path d="M4 8h8" initial={false} {...mark(indeterminate)} />
      </svg>
    </span>
  );
}

export { Checkbox };

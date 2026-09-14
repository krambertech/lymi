import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "cn";
import { motion, useReducedMotionConfig } from "motion/react";
import * as React from "react";
import { CHOICE_SLIDE, INSTANT } from "../../lib/choice-motion";
import { useField, useFieldControl } from "./field";

// shadcn's Switch: on or off, taking effect the moment it changes.

const TRAVEL = 18;
/** How far a held thumb stretches toward the side it is about to leave for. */
const STRETCH = 5;

function Switch({ className, disabled, onPointerDown, ...props }: SwitchPrimitive.Root.Props) {
  const field = useField();
  const control = useFieldControl(props);
  const [held, setHeld] = React.useState(false);

  React.useEffect(() => {
    if (!held) return;
    const release = () => setHeld(false);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, [held]);

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      disabled={disabled || field?.disabled}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        if (event.button === 0) setHeld(true);
      }}
      className={cn(
        "group/switch relative inline-flex h-[26px] w-[44px] shrink-0 cursor-pointer rounded-full outline-none",
        "edge-2 bg-plate-2 transition-[background-color,box-shadow] duration-200 ease-(--ease-out) data-checked:bg-amber data-checked:shadow-none",
        // Carries the touch target to 44 px tall without moving anything around it.
        "after:absolute after:-inset-y-[9px] after:inset-x-0 after:content-['']",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "aria-invalid:shadow-[0_0_0_1px_var(--danger)] data-disabled:cursor-not-allowed data-disabled:opacity-45",
        className,
      )}
      {...props}
      {...control}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        // Laid out left to right and mirrored in a right-to-left page, so the travel needs no sign.
        className="pointer-events-none absolute start-[3px] top-[3px] h-5 w-[38px] [direction:ltr] rtl:-scale-x-100"
        render={(thumbProps, state) => (
          <span {...thumbProps}>
            <SwitchThumb checked={state.checked} held={held && !state.disabled} />
          </span>
        )}
      />
    </SwitchPrimitive.Root>
  );
}

function SwitchThumb({ checked, held }: { checked: boolean; held: boolean }) {
  const reduce = useReducedMotionConfig() ?? false;
  const stretch = held && !reduce ? STRETCH : 0;
  const x = checked ? TRAVEL - stretch : 0;
  return (
    <motion.span
      initial={false}
      // Held, the thumb widens like a fingertip pressed flat; let go, it springs across and settles.
      animate={{ x, width: 20 + stretch }}
      transition={reduce ? INSTANT : CHOICE_SLIDE}
      className={cn(
        "block h-5 rounded-full transition-[background-color,box-shadow] duration-200",
        checked ? "bg-amber-ink" : "edge-2 bg-plate",
      )}
    />
  );
}

export { Switch };

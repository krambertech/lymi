import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { cn } from "cn";
import { motion, useReducedMotion } from "motion/react";
import { CHOICE_FADE, CHOICE_LEAVE, CHOICE_POP } from "../../lib/choice-motion";
import { FieldItems, useField, useFieldControl } from "./field";

// shadcn's Radio Group. Selection is carried by the ring and a filled dot, both ink: amber stays on the flame.

function RadioGroup<Value>({
  className,
  disabled,
  children,
  ...props
}: RadioGroupPrimitive.Props<Value>) {
  const field = useField();
  const control = useFieldControl(props);
  return (
    <RadioGroupPrimitive<Value>
      data-slot="radio-group"
      disabled={disabled || field?.disabled}
      className={cn("group/radio-group grid w-full gap-2", className)}
      {...props}
      {...control}
    >
      <FieldItems>{children}</FieldItems>
    </RadioGroupPrimitive>
  );
}

function RadioGroupItem({ className, disabled, ...props }: RadioPrimitive.Root.Props) {
  const field = useField();
  const control = useFieldControl(props);
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      disabled={disabled || field?.disabled}
      className={cn(
        "group/radio relative inline-grid size-[18px] shrink-0 cursor-pointer place-items-center rounded-full outline-none",
        "edge-2 transition-[box-shadow,scale] duration-150 ease-(--ease-out) data-checked:shadow-[0_0_0_1px_var(--text)]",
        "active:scale-90 motion-reduce:active:scale-100",
        // Carries the touch target to 44 px without moving anything around it.
        "after:absolute after:-inset-[13px] after:content-['']",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "aria-invalid:shadow-[0_0_0_1px_var(--danger)] group-aria-invalid/radio-group:shadow-[0_0_0_1px_var(--danger)]",
        "data-disabled:cursor-not-allowed data-disabled:opacity-45 data-disabled:active:scale-100",
        className,
      )}
      {...props}
      {...control}
    >
      <RadioPrimitive.Indicator
        keepMounted
        data-slot="radio-group-indicator"
        className="grid place-items-center"
        render={(indicatorProps, state) => (
          <span {...indicatorProps}>
            <RadioDot checked={state.checked} />
          </span>
        )}
      />
    </RadioPrimitive.Root>
  );
}

function RadioDot({ checked }: { checked: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      aria-hidden="true"
      initial={false}
      // Swells in past its size and settles; on the way out it just shrinks away.
      animate={checked ? { scale: 1, opacity: 1 } : { scale: reduce ? 1 : 0.3, opacity: 0 }}
      transition={
        reduce
          ? CHOICE_FADE
          : checked
            ? { scale: CHOICE_POP, opacity: { duration: 0.08 } }
            : CHOICE_LEAVE
      }
      className="block size-2.5 rounded-full bg-text"
    />
  );
}

export { RadioGroup, RadioGroupItem };

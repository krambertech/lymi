import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { cn } from "cn";
import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import * as React from "react";
import { CHOICE_FADE, CHOICE_SLIDE } from "../../lib/choice-motion";

/*
 * shadcn's Toggle Group, without its variants: the look belongs to the Lymi component built on it,
 * such as Segmented. `ToggleGroupIndicator` is Lymi's addition, the plate that moves to the pressed
 * item, so every group that has one moves it the same way.
 */

const GROUP = '[data-slot="toggle-group"]';
// By state rather than slot, since an item composed into another trigger takes that trigger's slot.
const PRESSED = "[data-pressed]";

interface ToggleGroupProps<Value extends string> extends ToggleGroupPrimitive.Props<Value> {
  /** Submits each pressed value under this name, as a native control would. */
  name?: string | undefined;
}

function ToggleGroup<Value extends string>({
  className,
  name,
  value,
  defaultValue,
  onValueChange,
  children,
  ...props
}: ToggleGroupProps<Value>) {
  const [uncontrolled, setUncontrolled] = React.useState<readonly Value[]>(defaultValue ?? []);
  const pressed = value ?? uncontrolled;
  return (
    <ToggleGroupPrimitive<Value>
      data-slot="toggle-group"
      value={value}
      defaultValue={defaultValue}
      onValueChange={(next, details) => {
        setUncontrolled(next);
        onValueChange?.(next, details);
      }}
      className={cn("relative flex w-fit items-center", className)}
      {...props}
    >
      {children}
      {name && pressed.map((v) => <input key={v} type="hidden" name={name} value={v} />)}
    </ToggleGroupPrimitive>
  );
}

function ToggleGroupItem<Value extends string>({
  className,
  ...props
}: TogglePrimitive.Props<Value>) {
  return (
    <TogglePrimitive<Value>
      data-slot="toggle-group-item"
      className={cn(
        "relative inline-flex cursor-pointer items-center justify-center gap-1.5 font-medium whitespace-nowrap text-muted outline-none select-none",
        "transition-[color,scale] duration-150 ease-(--ease-out) active:scale-[0.97] motion-reduce:active:scale-100",
        "hoverable:hover:text-text data-pressed:text-text",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "data-disabled:cursor-not-allowed data-disabled:opacity-45 data-disabled:active:scale-100 hoverable:data-disabled:hover:text-muted",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}

/**
 * The plate under the pressed item of a horizontal group. Put it first inside `ToggleGroup`. It springs to
 * a new choice made with the pointer, and jumps for a key, a resize and its first placement.
 */
function ToggleGroupIndicator({ className }: { className?: string | undefined }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
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
      const on = Array.from(group.querySelectorAll<HTMLElement>(PRESSED)).find(
        (item) => item.closest(GROUP) === group,
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
    const onKeyDown = () => {
      keyboard = true;
    };
    const onPointerDown = () => {
      keyboard = false;
    };
    group.addEventListener("keydown", onKeyDown, true);
    group.addEventListener("pointerdown", onPointerDown, true);
    const pressed = new MutationObserver(() => place(!keyboard));
    pressed.observe(group, { subtree: true, attributeFilter: ["data-pressed"] });
    const resized = new ResizeObserver(() => place(false));
    resized.observe(group);
    return () => {
      group.removeEventListener("keydown", onKeyDown, true);
      group.removeEventListener("pointerdown", onPointerDown, true);
      pressed.disconnect();
      resized.disconnect();
    };
  }, [x, width, opacity]);

  return (
    <motion.span
      ref={ref}
      aria-hidden="true"
      data-slot="toggle-group-indicator"
      style={{ x, width, opacity }}
      className={cn("pointer-events-none absolute start-0", className)}
    />
  );
}

export { ToggleGroup, ToggleGroupIndicator, ToggleGroupItem };

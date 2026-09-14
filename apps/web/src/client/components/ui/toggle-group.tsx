import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { cn } from "cn";
import * as React from "react";
import { focusChosen, leavesGroup } from "../../lib/choice-focus";
import { SlidingPlate } from "./sliding-plate";

// shadcn's Toggle Group without its variants, plus the plate that moves under the pressed item; Segmented owns the look.

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
  onBlur,
  onFocus,
  multiple,
  disabled,
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
      multiple={multiple}
      disabled={disabled}
      onValueChange={(next, details) => {
        onValueChange?.(next, details);
        // A change the owner cancelled leaves the old item pressed, so the form keeps the old value too.
        if (!details.isCanceled) setUncontrolled(next);
      }}
      onFocus={(event) => {
        if (!multiple) focusChosen(event, "[aria-pressed]", PRESSED);
        onFocus?.(event);
      }}
      // Once, as focus leaves the group, the way a single native control reports it.
      onBlur={(event) => {
        if (leavesGroup(event)) onBlur?.(event);
      }}
      className={cn("relative flex w-fit items-center", className)}
      {...props}
    >
      {children}
      {name &&
        pressed.map((v) => (
          <input key={v} type="hidden" name={name} value={v} disabled={disabled} />
        ))}
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
        "relative inline-flex cursor-pointer items-center justify-center gap-1.5 font-medium whitespace-nowrap text-muted select-none",
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

/** The plate under the pressed item of a horizontal group, first inside `ToggleGroup`; DESIGN.md "Motion" has its timing. */
function ToggleGroupIndicator({ className }: { className?: string | undefined }) {
  return (
    <SlidingPlate
      chosen={PRESSED}
      attribute="data-pressed"
      within={GROUP}
      data-slot="toggle-group-indicator"
      className={className}
    />
  );
}

export { ToggleGroup, ToggleGroupIndicator, ToggleGroupItem };

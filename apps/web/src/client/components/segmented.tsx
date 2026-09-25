import { clsx } from "clsx";
import type { ReactNode, Ref } from "react";
import { smallControlHeight } from "./ui/input";
import { ToggleGroup, ToggleGroupIndicator, ToggleGroupItem } from "./ui/toggle-group";

interface Option<T extends string> {
  value: T;
  label: ReactNode;
  disabled?: boolean | undefined;
}

interface Props<T extends string> {
  value: T;
  onValueChange: (v: T) => void;
  options: Option<T>[];
  /** Accessible name for the group. */
  label: string;
  size?: "sm" | "md" | undefined;
  /** Submits the chosen value with a form. */
  name?: string | undefined;
  disabled?: boolean | undefined;
  onBlur?: (() => void) | undefined;
  ref?: Ref<HTMLDivElement> | undefined;
  className?: string | undefined;
}

/**
 * Two to four mutually exclusive views of the same thing. Not for navigation. At `md` it is
 * the same height and type as an input, so it lines up with the fields around it.
 */
export function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  label,
  size = "md",
  name,
  disabled,
  onBlur,
  ref,
  className,
}: Props<T>) {
  return (
    <ToggleGroup<T>
      ref={ref}
      aria-label={label}
      name={name}
      disabled={disabled}
      onBlur={onBlur}
      value={[value]}
      // One option is always chosen: pressing the chosen one again leaves it chosen.
      onValueChange={(next) => {
        const chosen = next[0];
        if (chosen !== undefined && chosen !== value) onValueChange(chosen);
      }}
      className={clsx(
        "gap-0.5 rounded-md bg-plate-2 p-[3px]",
        // Same box as an input, so a segmented control in a form is a row like every other.
        size === "md" ? "h-11 md:h-10" : smallControlHeight,
        className,
      )}
    >
      <ToggleGroupIndicator className="edge inset-y-[3px] rounded-[11px] bg-plate" />
      {options.map((o) => (
        <ToggleGroupItem<T>
          key={o.value}
          value={o.value}
          disabled={o.disabled}
          className={clsx(
            "rounded-[11px] px-3",
            // The pseudo-element carries the touch target to the track's edge (md) or 8 px past
            // the 28 px pill (sm), clearing the 44 px floor without changing layout.
            "before:absolute before:inset-x-0 before:content-['']",
            size === "md"
              ? "h-full text-[1rem] before:-inset-y-[3px] md:text-base"
              : "h-7 text-xs before:-inset-y-2",
          )}
        >
          {o.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

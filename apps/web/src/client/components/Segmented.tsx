import { clsx } from "clsx";
import type { ReactNode } from "react";
import { useIndicator } from "../lib/use-indicator";

interface Option<T extends string> {
  value: T;
  label: ReactNode;
}

/**
 * Two to four mutually exclusive views of the same thing. Not for navigation. At `md` it is
 * the same height and type as an input, so it lines up with the fields around it.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = "md",
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Option<T>[];
  /** Accessible name for the group. */
  label: string;
  size?: "sm" | "md" | undefined;
  className?: string | undefined;
}) {
  const { containerRef, indicatorRef, jump } = useIndicator<HTMLFieldSetElement>(value);
  return (
    <fieldset
      ref={containerRef}
      className={clsx(
        "relative inline-flex w-fit gap-0.5 rounded-md bg-plate-2 p-[3px]",
        // Same box as an input, so a segmented control in a form is a row like every other.
        size === "md" && "h-11 md:h-10",
        className,
      )}
    >
      <legend className="sr-only">{label}</legend>
      <span
        ref={indicatorRef}
        aria-hidden="true"
        className="segment-chip edge absolute inset-y-[3px] start-0 rounded-[11px] bg-plate"
      />
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={(e) => {
              if (e.detail === 0) jump();
              onChange(o.value);
            }}
            className={clsx(
              "relative rounded-[11px] px-3 font-medium transition-[color,scale] duration-150 active:scale-[0.97]",
              // The pseudo-element carries the touch target to the track's edge (md) or 8 px past
              // the 28 px pill (sm), clearing the 44 px floor without changing layout.
              "before:absolute before:inset-x-0 before:content-['']",
              size === "md"
                ? "h-full text-[16px] before:-inset-y-[3px] md:text-base"
                : "h-7 text-xs before:-inset-y-2",
              on ? "text-text" : "text-muted hoverable:hover:text-text",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </fieldset>
  );
}

import { clsx } from "clsx";
import type { ReactNode } from "react";

interface Option<T extends string> {
  value: T;
  label: ReactNode;
}

/** Two to four mutually exclusive views of the same thing. Not for navigation. */
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
  return (
    <fieldset
      className={clsx("inline-flex w-fit gap-0.5 rounded-md bg-plate-2 p-[3px]", className)}
    >
      <legend className="sr-only">{label}</legend>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={clsx(
              "relative rounded-[11px] px-3 font-medium transition-[background-color,color,box-shadow,scale] duration-150 active:scale-[0.97]",
              "before:absolute before:inset-x-0 before:content-['']",
              size === "md"
                ? "h-[34px] text-sm before:-inset-y-1"
                : "h-7 text-xs before:-inset-y-1.5",
              on ? "edge bg-plate text-text" : "text-muted hoverable:hover:text-text",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </fieldset>
  );
}

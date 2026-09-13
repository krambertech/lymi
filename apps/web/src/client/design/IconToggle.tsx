import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../components/ui/tooltip";
import { useIndicator } from "../lib/use-indicator";

export interface IconOption<T extends string> {
  value: T;
  /** The accessible name, shown as the tooltip. */
  label: string;
  Icon: LucideIcon;
}

/** A small segmented control of icons, for choices that sit in a corner. */
export function IconToggle<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: IconOption<T>[];
  label: string;
}) {
  const { containerRef, indicatorRef, jump } = useIndicator<HTMLFieldSetElement>(value);
  return (
    <fieldset
      ref={containerRef}
      className="edge relative flex gap-0.5 rounded-full bg-plate-2 p-0.5"
    >
      <legend className="sr-only">{label}</legend>
      <span
        ref={indicatorRef}
        aria-hidden="true"
        className="segment-chip edge absolute inset-y-0.5 start-0 rounded-full bg-plate"
      />
      {options.map((o) => (
        <Option
          key={o.value}
          option={o}
          on={o.value === value}
          onSelect={(keyboard) => {
            if (keyboard) jump();
            onChange(o.value);
          }}
        />
      ))}
    </fieldset>
  );
}

function Option<T extends string>({
  option,
  on,
  onSelect,
}: {
  option: IconOption<T>;
  on: boolean;
  onSelect: (keyboard: boolean) => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={option.label}
            aria-pressed={on}
            onClick={(e) => onSelect(e.detail === 0)}
            className={clsx(
              "relative grid size-6 place-items-center rounded-full transition-colors duration-150",
              on ? "text-text" : "text-muted hoverable:hover:text-text",
            )}
          />
        }
      >
        <option.Icon aria-hidden="true" className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent>{option.label}</TooltipContent>
    </Tooltip>
  );
}

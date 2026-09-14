import type { LucideIcon } from "lucide-react";
import { ToggleGroup, ToggleGroupIndicator, ToggleGroupItem } from "../components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "../components/ui/tooltip";

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
  return (
    <ToggleGroup<T>
      aria-label={label}
      value={[value]}
      onValueChange={(next) => {
        const chosen = next[0];
        if (chosen !== undefined && chosen !== value) onChange(chosen);
      }}
      className="edge gap-0.5 rounded-full bg-plate-2 p-0.5"
    >
      <ToggleGroupIndicator className="edge inset-y-0.5 rounded-full bg-plate" />
      {options.map((o) => (
        <Tooltip key={o.value}>
          <TooltipTrigger
            render={
              <ToggleGroupItem<T>
                value={o.value}
                aria-label={o.label}
                className="grid size-6 place-items-center rounded-full"
              />
            }
          >
            <o.Icon aria-hidden="true" className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent>{o.label}</TooltipContent>
        </Tooltip>
      ))}
    </ToggleGroup>
  );
}

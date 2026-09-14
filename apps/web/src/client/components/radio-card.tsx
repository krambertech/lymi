import { clsx } from "clsx";
import { type ReactNode, useId } from "react";
import { RadioGroupItem } from "./ui/radio-group";

interface Props {
  value: string;
  title: ReactNode;
  description: ReactNode;
  /** Drawn inside a container that carries the edge, so the row adds none of its own. */
  bare?: boolean | undefined;
  disabled?: boolean | undefined;
}

/**
 * One row of a settings choice, inside a `RadioGroup`. Selection is carried by the edge and the dot:
 * amber stays on the flame and the one primary action.
 */
export function RadioCard({ value, title, description, bare, disabled }: Props) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={clsx(
        "flex cursor-pointer items-start gap-3 rounded-md p-3.5",
        "transition-[box-shadow,background-color,scale] duration-150 ease-(--ease-out) active:scale-[0.99] motion-reduce:active:scale-100",
        "has-[[data-slot=radio-group-item]:focus-visible]:outline-2 has-[[data-slot=radio-group-item]:focus-visible]:outline-offset-2 has-[[data-slot=radio-group-item]:focus-visible]:outline-ring",
        "hoverable:hover:not-has-data-checked:bg-hover",
        !bare && "edge bg-plate has-data-checked:edge-2",
        "has-data-disabled:cursor-not-allowed has-data-disabled:opacity-45 has-data-disabled:active:scale-100",
      )}
    >
      <RadioGroupItem
        id={id}
        value={value}
        disabled={disabled}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        className="mt-0.5 focus-visible:outline-none data-disabled:opacity-100"
      />
      <span className="grid gap-0.5">
        <span id={`${id}-title`} className="text-base font-medium text-text">
          {title}
        </span>
        <span id={`${id}-description`} className="text-sm text-text-2">
          {description}
        </span>
      </span>
    </label>
  );
}

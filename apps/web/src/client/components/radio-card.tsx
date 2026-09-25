import { cn } from "cn";
import { type ComponentProps, type ReactNode, useId } from "react";
import { RadioGroupItem } from "./ui/radio-group";

interface Props extends Omit<ComponentProps<"label">, "title"> {
  value: string;
  /** The choice's name; with `description`, the usual two-line row. Use `children` for any other content. */
  title?: ReactNode;
  description?: ReactNode;
  /** `bare` draws no edge of its own, for a row inside a container that carries one. */
  variant?: "card" | "bare" | undefined;
  disabled?: boolean | undefined;
}

/**
 * One row of a settings choice, inside a `RadioGroup`. Selection is carried by the edge and the dot:
 * amber stays on the flame and the one primary action.
 */
export function RadioCard({
  value,
  title,
  description,
  variant = "card",
  disabled,
  className,
  children,
  ...rest
}: Props) {
  const id = useId();
  const titled = title !== undefined;
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-md p-3.5",
        "transition-[box-shadow,background-color,scale] duration-150 ease-(--ease-out) active:scale-[0.99] motion-reduce:active:scale-100",
        "has-[[data-slot=radio-group-item]:focus-visible]:outline-2 has-[[data-slot=radio-group-item]:focus-visible]:outline-offset-2 has-[[data-slot=radio-group-item]:focus-visible]:outline-ring",
        "hoverable:hover:not-has-data-checked:bg-hover",
        variant === "card" && "edge bg-plate has-data-checked:edge-2",
        "has-data-disabled:cursor-not-allowed has-data-disabled:opacity-45 has-data-disabled:active:scale-100",
        className,
      )}
      {...rest}
    >
      <RadioGroupItem
        id={id}
        value={value}
        disabled={disabled}
        aria-labelledby={titled ? `${id}-title` : undefined}
        aria-describedby={description !== undefined ? `${id}-description` : undefined}
        // The dot sits on the title's first line.
        className={cn("focus-visible:outline-none data-disabled:opacity-100", titled && "mt-0.5")}
      />
      {titled && (
        <span className="grid gap-0.5">
          <span id={`${id}-title`} className="text-base font-medium text-text">
            {title}
          </span>
          {description !== undefined && (
            <span id={`${id}-description`} className="text-sm text-text-2">
              {description}
            </span>
          )}
        </span>
      )}
      {children}
    </label>
  );
}

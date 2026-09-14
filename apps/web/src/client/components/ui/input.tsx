import { cn } from "cn";
import type * as React from "react";
import { useField, useFieldControl } from "./field";

/** The box every form control shares. An invalid box keeps its red edge under hover, focus and an open list. */
export const controlBase =
  "w-full min-w-0 rounded-md bg-plate text-text edge transition-[box-shadow,background-color] duration-150 " +
  "placeholder:text-muted hoverable:hover:not-aria-invalid:edge-2 focus-visible:not-aria-invalid:edge-2 " +
  "disabled:cursor-not-allowed disabled:bg-plate-2 disabled:text-muted " +
  "aria-invalid:shadow-[0_0_0_1px_var(--danger)]";

/** The control height and text size; DESIGN.md "Forms" says why they follow the viewport. */
export const controlSize = "h-11 text-[1rem] md:h-10 md:hoverable:text-base";

/** Text size alone, for a control whose height follows its content. */
export const controlText = "text-[1rem] md:hoverable:text-base";

// A plain input rather than Base UI's, which validates natively on Enter and would overrule the Field.
function Input({ className, disabled, ...props }: React.ComponentProps<"input">) {
  const field = useField();
  const control = useFieldControl(props);
  return (
    <input
      data-slot="input"
      disabled={disabled || field?.disabled}
      className={cn(controlBase, controlSize, "px-3.5", className)}
      {...props}
      {...control}
    />
  );
}

export { Input };

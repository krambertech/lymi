import { cn } from "cn";
import type * as React from "react";
import { useField, useFieldControl } from "./field";
import { controlBase, controlText } from "./input";

function Textarea({ className, disabled, ...props }: React.ComponentProps<"textarea">) {
  const field = useField();
  const control = useFieldControl(props);
  return (
    <textarea
      data-slot="textarea"
      disabled={disabled || field?.disabled}
      className={cn(
        controlBase,
        controlText,
        "min-h-24 resize-y px-3.5 py-2.5 leading-relaxed",
        className,
      )}
      {...props}
      {...control}
    />
  );
}

export { Textarea };

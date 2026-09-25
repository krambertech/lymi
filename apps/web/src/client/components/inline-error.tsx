import { cn } from "cn";
import { AlertCircle } from "lucide-react";
import type * as React from "react";

interface Props {
  children: React.ReactNode;
  className?: string | undefined;
}

/** An error line outside a Field, marked the way FieldError marks one; the container owns the live region. */
export function InlineError({ children, className }: Props) {
  return (
    <span className={cn("inline-flex items-start gap-1.5 text-start text-danger", className)}>
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0">{children}</span>
    </span>
  );
}

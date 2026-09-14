import { clsx } from "clsx";
import type { ReactNode } from "react";

interface Props {
  caption: ReactNode;
  children: ReactNode;
  /** Figures that are already a table or a list sit on the canvas, not on a plate. */
  plate?: boolean;
  className?: string;
}

/** A picture of a rule. The caption says what to look for, not what the picture is. */
export function Figure({ caption, children, plate = true, className }: Props) {
  return (
    <figure className={clsx("my-6", className)}>
      <div className={clsx(plate && "rounded-md bg-plate p-4 edge sm:p-5")}>{children}</div>
      <figcaption className="mt-2.5 max-w-[60ch] text-sm text-muted">{caption}</figcaption>
    </figure>
  );
}

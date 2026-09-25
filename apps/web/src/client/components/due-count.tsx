import { clsx } from "clsx";
import type { ReactNode } from "react";

/**
 * How many cards are due, on the lantern's amber as a tint. The tint says "act" and the ink keeps
 * the number readable; docs/design/system/colour.md.
 */
export function DueCount({
  size = "sm",
  children,
  className,
}: {
  /** `lg` leads a row, as on Today's deck list. */
  size?: "sm" | "lg" | undefined;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center justify-center whitespace-nowrap bg-amber-tint text-amber-tint-ink tabular-nums",
        size === "sm" && "h-[22px] min-w-[22px] rounded-full px-2 text-xs font-semibold",
        size === "lg" &&
          "h-11 min-w-11 rounded-lg px-2 text-2xl font-medium leading-none tracking-[-0.02em]",
        className,
      )}
    >
      {children}
    </span>
  );
}

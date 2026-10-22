import { useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import type { ComponentProps, ReactNode } from "react";

interface Props extends Omit<ComponentProps<"span">, "children"> {
  /** Formatted for the locale here, so every badge groups digits the same way. */
  count: number;
  /** Read instead of the bare number, such as "8 due today". The number is then hidden from screen readers. */
  label?: ReactNode;
  /** `lg` leads a row, as on Today's deck list. */
  size?: "sm" | "lg" | undefined;
}

/**
 * How many cards are due, on the lantern's amber as a tint. The tint says "act" and the ink keeps
 * the number readable; docs/design/system/colour.md.
 */
export function DueCount({ count, label, size = "sm", className, ...rest }: Props) {
  const { i18n } = useLingui();
  const shown = i18n.number(count);
  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center justify-center whitespace-nowrap bg-amber-tint text-amber-tint-ink tabular-nums",
        size === "sm" && "h-[22px] min-w-[22px] rounded-full px-2 text-xs font-semibold",
        size === "lg" &&
          "h-11 min-w-11 rounded-lg px-2 text-2xl font-medium leading-none tracking-[-0.02em]",
        className,
      )}
      {...rest}
    >
      {label ? (
        <>
          <span aria-hidden="true">{shown}</span>
          <span className="sr-only">{label}</span>
        </>
      ) : (
        shown
      )}
    </span>
  );
}

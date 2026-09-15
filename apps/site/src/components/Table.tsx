import { clsx } from "clsx";
import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

/** Dense data. Right-aligned tabular numbers do the work stripes would. */
export function Table({ className, ...p }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table className={clsx("w-full border-collapse text-base", className)} {...p} />
    </div>
  );
}
export function Th({ className, align, ...p }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={clsx(
        "border-b border-edge px-3 py-2 text-start align-bottom text-xs font-medium text-muted",
        align === "right" && "text-end",
        className,
      )}
      {...p}
    />
  );
}
export function Td({ className, align, ...p }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={clsx(
        // Baseline, so a code cell sits level with the first line of a wrapped note.
        "border-b border-edge px-3 py-2.5 align-baseline",
        align === "right" && "text-end tabular-nums",
        className,
      )}
      {...p}
    />
  );
}

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
        "border-b border-edge px-3 py-2 text-left text-xs font-medium text-muted",
        align === "right" && "text-right",
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
        "border-b border-edge px-3 py-2.5 align-middle",
        align === "right" && "text-right tabular-nums",
        className,
      )}
      {...p}
    />
  );
}

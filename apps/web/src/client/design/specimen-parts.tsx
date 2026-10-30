import { clsx } from "clsx";
import type { ReactNode } from "react";

/**
 * A filter chip's look, for do and don't pictures only: `selected` is the real chosen state,
 * `amber` is the mistake a don't shows. Product code uses the real filter chips.
 */
export function ChipLike({
  selected,
  amber,
  children,
}: {
  selected?: boolean | undefined;
  amber?: boolean | undefined;
  children: ReactNode;
}) {
  return (
    <span
      className={clsx(
        "inline-flex h-8 items-center rounded-full px-3 text-sm font-medium",
        selected ? "bg-ink text-canvas" : amber ? "bg-amber text-amber-ink" : "bg-plate-nested",
      )}
    >
      {children}
    </span>
  );
}

/** A line of code, set as the docs set it: mono, in ink, on a plate. */
export function Snippet({ children }: { children: ReactNode }) {
  return (
    <code className="edge block max-w-full overflow-x-auto rounded-md bg-plate px-4 py-3 font-mono text-sm whitespace-pre text-ink">
      {children}
    </code>
  );
}

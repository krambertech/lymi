import type { ReactNode } from "react";

/**
 * A word picked out of a source, its highlight sweeping in once it has been read. The sweep is a
 * background size, so a highlight that breaks across lines lights each line in turn.
 */
export function Pick({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    <mark
      data-on={on}
      className="rounded-xs bg-transparent bg-[linear-gradient(var(--color-amber-soft),var(--color-amber-soft))] bg-no-repeat px-0.5 text-inherit transition-[background-size] duration-500 ease-out [background-size:0%_100%] [box-decoration-break:clone] data-[on=true]:[background-size:100%_100%] motion-reduce:transition-none"
    >
      {children}
    </mark>
  );
}

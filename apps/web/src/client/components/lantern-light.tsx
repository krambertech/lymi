import type { EndEmber } from "@lymi/design";
import { clsx } from "clsx";
import type { CSSProperties, ReactNode } from "react";

/** When the last ember of a burst has gone, from the burst's start. */
export const embersEnd = (embers: EndEmber[]) => Math.max(0, ...embers.map((e) => e.at + e.dur));

interface Props {
  /** The lantern itself, drawn over its pool and under its embers. */
  children: ReactNode;
  /** When the pool of glow blooms; it stays out while the lantern is. */
  poolAt?: number | undefined;
  /** Half strength, for a light that marks no new work. */
  dim?: boolean | undefined;
  lit?: boolean | undefined;
  /** From `endEmbers` in `@lymi/design`, so every burst drifts the same way on web and phone. */
  embers?: EndEmber[] | undefined;
  embersAt?: number | undefined;
}

/**
 * The lantern lighting the room: a pool of its glow that blooms and breathes behind it, and embers
 * that lift off the flame once. The parent is `relative isolate` and sized to the lantern.
 * docs/design/system/surfaces.md, "The glow".
 */
export function LanternLight({
  children,
  poolAt = 0,
  dim = false,
  lit = true,
  embers = [],
  embersAt = 0,
}: Props) {
  return (
    <>
      {lit && (
        <div
          aria-hidden="true"
          className={clsx(
            "light-pool pointer-events-none absolute -inset-[85%] -z-10 rounded-full",
            dim && "opacity-50",
          )}
          style={{ "--at": `${poolAt}ms` } as CSSProperties}
        >
          <div className="light-pool-breath size-full rounded-full" />
        </div>
      )}
      {children}
      {embers.length > 0 && (
        <div aria-hidden="true" className="pointer-events-none absolute start-1/2 top-[52%]">
          {embers.map((e) => (
            <i
              key={e.at}
              className="ember absolute -ms-0.5 -mt-0.5 block rounded-full bg-flame-core shadow-[0_0_4px_1px_var(--amber),0_0_10px_var(--glow)]"
              style={
                {
                  width: e.size,
                  height: e.size,
                  "--x": `${e.x}px`,
                  "--y": `${e.y}px`,
                  "--dur": `${e.dur}ms`,
                  "--at": `${embersAt + e.at}ms`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}
    </>
  );
}

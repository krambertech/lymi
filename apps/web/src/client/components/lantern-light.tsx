import type { EndEmber } from "@lymi/design";
import { clsx } from "clsx";
import {
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useLayoutEffect,
  useState,
} from "react";

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

interface RoomProps {
  /** The lantern's place, measured untransformed so the light never follows it in flight. */
  anchor: RefObject<HTMLElement | null>;
  poolAt?: number | undefined;
  dim?: boolean | undefined;
  /** The sequence was finished early, so the light is simply on. */
  skip?: boolean | undefined;
}

/**
 * The lantern's light reaching the edges of the window, centred on the lantern. It sits behind
 * the nearest isolated ancestor's content, so that ancestor must not paint a background. motion.md "The end of a review".
 */
export function RoomLight({ anchor, poolAt = 0, dim = false, skip = false }: RoomProps) {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    let frame = 0;
    const place = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = anchor.current?.getBoundingClientRect();
        if (box) setAt({ x: box.left + box.width / 2, y: box.top + box.height / 2 });
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place);
    };
  }, [anchor]);
  if (!at) return null;
  return (
    <div
      aria-hidden="true"
      data-skip={skip || undefined}
      className={clsx("room-light pointer-events-none fixed inset-0 -z-10", dim && "opacity-50")}
      style={{ "--x": `${at.x}px`, "--y": `${at.y}px`, "--at": `${poolAt}ms` } as CSSProperties}
    />
  );
}

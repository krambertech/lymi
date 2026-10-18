import { useLingui } from "@lingui/react/macro";
import { FLAME_BOUNDS } from "@lymi/design";
import { clsx } from "clsx";
import { useInView } from "motion/react";
import { useMemo, useRef } from "react";
import { FLAME_PARTS } from "../lantern-geometry";
import { usePlayback, useStill } from "./playback";

/** Six reviews of one card: the gap grows each time it's remembered, and the reading goes once it's Known. */
const STOPS = [
  { day: 0, state: "new" },
  { day: 1, state: "learning" },
  { day: 3, state: "learning" },
  { day: 8, state: "known" },
  { day: 21, state: "known" },
  { day: 50, state: "known" },
] as const;

const BEATS = { s0: 200, s1: 850, s2: 1500, s3: 2150, s4: 2800, s5: 3450 };
const KEYS = ["s0", "s1", "s2", "s3", "s4", "s5"] as const;

/** The streak's flame, lit at each review. */
function FlameMark({ className }: { className: string }) {
  const { left, top, right, bottom } = FLAME_BOUNDS;
  return (
    <svg
      viewBox={`${left} ${top} ${right - left} ${bottom - top}`}
      aria-hidden="true"
      className={className}
    >
      {FLAME_PARTS()}
    </svg>
  );
}

export function ReturnLane() {
  const { t } = useLingui();
  const root = useRef<HTMLOListElement>(null);
  const still = useStill();
  const inView = useInView(root, { amount: 0.4 });
  const beats = useMemo(() => BEATS, []);
  const { at } = usePlayback(beats, inView, still);
  const label = (day: number) => (day === 0 ? t`Today` : t`Day ${day}`);
  const stateName = { new: t`New`, learning: t`Learning`, known: t`Known` };
  const lit = KEYS.filter((k) => at(k)).length;

  return (
    <div className="mt-12 @4xl:mt-16">
      <ol
        ref={root}
        className="relative grid gap-3 @3xl:grid-cols-6 @3xl:gap-0"
        aria-label={t`One card's reviews over seven weeks`}
      >
        {/* Across on a wide screen: the line runs through the flames, lit as far as the reviews have come. */}
        <span
          aria-hidden="true"
          className="absolute inset-x-[8.33%] top-[125px] hidden h-0.5 rounded-full bg-edge-2 @3xl:block"
        />
        <span
          aria-hidden="true"
          style={{ width: `${(Math.max(lit - 1, 0) / (STOPS.length - 1)) * 83.34}%` }}
          className="absolute start-[8.33%] top-[125px] hidden h-0.5 rounded-full bg-amber transition-[width] duration-700 ease-out @3xl:block"
        />
        {STOPS.map((stop, i) => {
          const on = at(KEYS[i] as (typeof KEYS)[number]);
          return (
            <li
              key={stop.day}
              className="grid grid-cols-[76px_24px_minmax(0,1fr)] items-center gap-4 @3xl:grid-cols-1 @3xl:justify-items-center @3xl:gap-2.5 @3xl:text-center"
            >
              <span
                lang="ja"
                className={clsx(
                  "grid h-[86px] w-[76px] place-items-center rounded-md bg-plate text-2xl leading-[1.6] font-medium text-text edge-2 transition-[opacity,translate] duration-500 @3xl:h-[104px] @3xl:w-[92px] @3xl:text-[26px]",
                  !on && "translate-y-1.5 opacity-35",
                )}
              >
                <ruby>
                  電車
                  <rt
                    className={clsx(
                      "text-[0.45em] text-amber-text",
                      stop.state === "known" && "invisible opacity-0",
                    )}
                  >
                    でんしゃ
                  </rt>
                </ruby>
              </span>
              {/* The room's colour around the flame breaks the line, so the line meets each flame without crossing it. */}
              <span className="relative grid place-items-center @3xl:bg-canvas @3xl:px-3">
                <FlameMark
                  className={clsx(
                    "h-6 w-[18px] transition-[opacity,scale] duration-500",
                    !on && "scale-80 opacity-20",
                  )}
                />
              </span>
              <span className="grid">
                <span className="text-md font-medium text-text">{label(stop.day)}</span>
                <span className="text-sm text-muted">{stateName[stop.state]}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

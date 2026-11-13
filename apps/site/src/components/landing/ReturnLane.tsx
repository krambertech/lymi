import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { FLAME_BOUNDS } from "@lymi/design";
import { clsx } from "clsx";
import { CircleCheck, CircleDashed, createLucideIcon } from "lucide-react";
import { useInView } from "motion/react";
import { type CSSProperties, type ReactNode, useMemo, useRef } from "react";
import { FLAME_PARTS } from "../lantern-geometry";
import { usePlayback, useStill } from "./playback";

/** Lucide's `contrast` with its half filled, as the app marks a card it is still teaching. */
const CircleHalf = createLucideIcon("circle-half", [
  ["circle", { cx: "12", cy: "12", r: "10", key: "circle" }],
  ["path", { d: "M12 18a6 6 0 0 0 0-12v12z", fill: "currentColor", key: "half" }],
]);

/** Six reviews of one card: the gap grows each time it's remembered. */
const STOPS = [
  { day: 0, state: "new" },
  { day: 1, state: "learning" },
  { day: 3, state: "learning" },
  { day: 8, state: "known" },
  { day: 21, state: "known" },
  { day: 50, state: "known" },
] as const;

const KEYS = ["s0", "s1", "s2", "s3", "s4", "s5"] as const;

/** How long the line takes to reach each stop, in ms: a longer wait draws for longer. */
const DRAW = [0, 450, 550, 750, 1100, 1600];
/** When each stop's line starts drawing; the stop itself lights as its line arrives. */
const BEATS = Object.fromEntries(
  KEYS.map((key, i) => [key, 200 + DRAW.slice(1, i).reduce((sum, ms) => sum + ms, i ? 300 : 0)]),
) as Record<(typeof KEYS)[number], number>;

/** Days waited before a stop; 0 for the first. */
const waitBefore = (i: number) => (i ? (STOPS[i]?.day ?? 0) - (STOPS[i - 1]?.day ?? 0) : 0);
/** Down a phone, the room above a stop: enough for the wait's label, then 3.3px for each day more. */
const roomAbove = (i: number) => (i ? 24 + Math.round((waitBefore(i) - 1) * 3.3) : 0);

const STATE_ICON = {
  new: { Icon: CircleDashed, tint: "text-state-new" },
  learning: { Icon: CircleHalf, tint: "text-state-learning" },
  known: { Icon: CircleCheck, tint: "text-state-known" },
};

/** The streak's flame, lit at each review. */
function FlameMark({ className, style }: { className: string; style?: CSSProperties }) {
  const { left, top, right, bottom } = FLAME_BOUNDS;
  return (
    <svg
      viewBox={`${left} ${top} ${right - left} ${bottom - top}`}
      aria-hidden="true"
      style={style}
      className={className}
    >
      {FLAME_PARTS()}
    </svg>
  );
}

interface Props {
  /** The card's face at one review, told whether the card is Known by then. */
  term: (known: boolean) => ReactNode;
  lang: string;
}

/**
 * One card at each of its reviews, set apart by how long Lymi waited: across on a wide screen, down
 * the start edge on a narrow one. Each wait is named on its stretch of line, so the growth can be
 * read as well as seen.
 */
export function ReturnLane({ term, lang }: Props) {
  const { t } = useLingui();
  const root = useRef<HTMLOListElement>(null);
  const still = useStill();
  const inView = useInView(root, { amount: 0.4 });
  const beats = useMemo(() => BEATS, []);
  const { at } = usePlayback(beats, inView, still);
  const label = (day: number) => (day === 0 ? t`Today` : t`Day ${day}`);
  const stateName = { new: t`New`, learning: t`Learning`, known: t`Known` };

  return (
    <div className="mt-12 @4xl:mt-16">
      <ol
        ref={root}
        // A stop is 96px wide across; the space between two stops is 24px plus a share of what is left.
        style={{ "--stop": "96px" } as CSSProperties}
        className="flex flex-col @3xl:flex-row"
        aria-label={t`One card’s reviews over seven weeks`}
      >
        {STOPS.map((stop, i) => {
          const on = at(KEYS[i] as (typeof KEYS)[number]);
          const wait = waitBefore(i);
          const draw = DRAW[i] ?? 0;
          // The stop lights as its line arrives, not as the line sets off.
          const arrive = { transitionDelay: on && !still ? `${Math.round(draw * 0.8)}ms` : "0ms" };
          const { Icon, tint } = STATE_ICON[stop.state];
          return (
            <li
              key={stop.day}
              style={
                { "--room": `${roomAbove(i)}px`, "--grow": Math.max(wait - 1, 0) } as CSSProperties
              }
              className={clsx(
                "relative grid grid-cols-[24px_auto_minmax(0,1fr)] items-center gap-x-4 pt-[var(--room)]",
                "@3xl:flex @3xl:justify-end @3xl:pt-0",
                i
                  ? "@3xl:grow-[var(--grow)] @3xl:basis-[calc(var(--stop)+24px)]"
                  : "@3xl:grow-0 @3xl:basis-[var(--stop)]",
              )}
            >
              {i > 0 && (
                <>
                  {/* The line from the flame before to this one, stopping short of both. */}
                  <span
                    aria-hidden="true"
                    className="absolute start-[11px] -top-[14px] bottom-[46px] w-0.5 overflow-hidden rounded-full bg-edge-strong @3xl:start-[calc(var(--stop)/-2+21px)] @3xl:end-[calc(var(--stop)/2+21px)] @3xl:top-[125px] @3xl:bottom-auto @3xl:h-0.5 @3xl:w-auto"
                  >
                    <span
                      style={{ transitionDuration: still ? "0ms" : `${draw}ms` }}
                      className={clsx(
                        "absolute inset-0 origin-top bg-amber transition-[scale] ease-linear motion-reduce:transition-none @3xl:ltr:origin-left @3xl:rtl:origin-right",
                        !on && "scale-y-0 @3xl:scale-x-0 @3xl:scale-y-100",
                      )}
                    />
                  </span>
                  {/* The wait, named: beside the line on a phone, on it across. */}
                  <span className="absolute start-10 top-0 flex h-[var(--room)] items-center text-xs text-ink-muted @3xl:start-[calc(var(--stop)/-2)] @3xl:end-[calc(var(--stop)/2)] @3xl:top-[126px] @3xl:h-0 @3xl:justify-center">
                    <span className="whitespace-nowrap @3xl:bg-canvas @3xl:px-1.5">
                      {t`${plural(wait, { one: "# day", other: "# days" })}`}
                    </span>
                  </span>
                </>
              )}
              <div className="contents @3xl:flex @3xl:w-[var(--stop)] @3xl:shrink-0 @3xl:flex-col @3xl:items-center @3xl:gap-2.5 @3xl:text-center">
                {/* The tile grows with its word: a fixed width cut off неділя and молоко. */}
                <span
                  lang={lang}
                  style={arrive}
                  className={clsx(
                    "order-2 grid h-[60px] min-w-[68px] place-items-center rounded-md bg-plate px-2.5 text-xl leading-[1.6] font-medium whitespace-nowrap text-ink edge-strong transition-[opacity,translate] duration-500 motion-reduce:transition-none @3xl:order-1 @3xl:h-[104px] @3xl:min-w-[92px] @3xl:px-3 @3xl:text-[22px] @5xl:text-[26px]",
                    !on && "opacity-35 @3xl:translate-y-1.5",
                  )}
                >
                  {term(stop.state === "known")}
                </span>
                <span className="order-1 grid h-[60px] place-items-center @3xl:order-2 @3xl:h-auto">
                  <FlameMark
                    style={arrive}
                    className={clsx(
                      "h-6 w-[18px] transition-[opacity,scale] duration-500 motion-reduce:transition-none",
                      !on && "scale-80 opacity-20",
                    )}
                  />
                </span>
                <span className="order-3 grid @3xl:justify-items-center">
                  <span className="text-md font-medium whitespace-nowrap text-ink">
                    {label(stop.day)}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-ink-muted">
                    <Icon
                      aria-hidden="true"
                      strokeWidth={2.25}
                      className={clsx("size-3.5 shrink-0", tint)}
                    />
                    {stateName[stop.state]}
                  </span>
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

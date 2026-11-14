import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { FLAME_BOUNDS } from "@lymi/design";
import { clsx } from "clsx";
import { useInView } from "motion/react";
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { FLAME_PARTS } from "../lantern-geometry";
import { usePlayback, useStill } from "./playback";

/** Six reviews of one card: the gap grows each time it's remembered. */
const STOPS = [
  { day: 0, state: "new" },
  { day: 1, state: "learning" },
  { day: 3, state: "learning" },
  { day: 8, state: "known" },
  { day: 21, state: "known" },
  { day: 50, state: "known" },
] as const;

/** How long the line takes to reach each stop, in ms: a longer wait draws for longer. */
const DRAW = [0, 220, 260, 340, 460, 620];
/** A stop's parts arrive one after another inside this long, in ms. */
const SETTLE = 220;

type Beat = `stop${number}` | `line${number}`;
/**
 * The order of arrival: a stop with all its parts, then the line to the next one, then that stop.
 * The whole lane takes about 3.2 s.
 */
const BEATS = (() => {
  const beats: Record<Beat, number> = {};
  let now = 150;
  STOPS.forEach((_, i) => {
    if (i) {
      beats[`line${i}`] = now;
      now += Math.round((DRAW[i] ?? 0) * 0.9);
    }
    beats[`stop${i}`] = now;
    now += SETTLE;
  });
  return beats;
})();

/** Days waited before a stop; 0 for the first. */
const waitBefore = (i: number) => (i ? (STOPS[i]?.day ?? 0) - (STOPS[i - 1]?.day ?? 0) : 0);
/** The longest wait: on a phone its bar spans the row, and the others are cut to scale. */
const LONGEST = Math.max(...STOPS.map((_, i) => waitBefore(i)));

/**
 * Whether the lane waits, unlit, to play as it scrolls in. Only a lane that hydrates wholly off
 * screen waits; the prerendered page, a lane already in view and reduced motion all show it
 * finished, so nothing depends on the sequence running.
 */
function useWaiting(root: { current: Element | null }, still: boolean) {
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    const lane = root.current;
    if (!lane || still) return;
    const first = new IntersectionObserver(([entry]) => {
      if (entry && !entry.isIntersecting) setWaiting(true);
      first.disconnect();
    });
    first.observe(lane);
    return () => first.disconnect();
  }, [root, still]);
  return waiting && !still;
}

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
 * One card's reviews, set apart by how long Lymi waited. Across a wide screen the card stands at
 * each review and the line between two stretches with the wait. On a phone one card follows the
 * reviews above a bar for each wait, cut to scale, because six cards in a column bury the growth.
 */
export function ReturnLane({ term, lang }: Props) {
  const { t } = useLingui();
  const root = useRef<HTMLDivElement>(null);
  const still = useStill();
  const inView = useInView(root, { amount: 0.4 });
  const waiting = useWaiting(root, still);
  const { at } = usePlayback(BEATS, inView, still);
  const reached = (beat: Beat) => !waiting || at(beat);
  const label = (day: number) => (day === 0 ? t`Today` : t`Day ${day}`);
  const days = (count: number) => t`${plural(count, { one: "# day", other: "# days" })}`;
  const stateName = { new: t`New`, learning: t`Learning`, known: t`Known` };
  // A part of a stop: it rises in place, each a beat after the one before.
  const part = (on: boolean, order: number) => ({
    style: { transitionDelay: on && waiting ? `${order * 60}ms` : "0ms" },
    className: clsx(
      "transition-[opacity,translate,scale] duration-300 ease-out motion-reduce:transition-none",
      !on && "opacity-0",
    ),
  });

  // On a phone the one card shows the latest review the sequence has reached.
  const latest = Math.max(
    STOPS.findLastIndex((_, i) => reached(`stop${i}`)),
    0,
  );
  const shown = STOPS[latest] as (typeof STOPS)[number];
  const total = STOPS.length;
  /** Days until the review after the one shown; 0 once the card has had its last. */
  const next = latest < total - 1 ? waitBefore(latest + 1) : 0;
  const span = STOPS[total - 1]?.day ?? 0;

  return (
    <div ref={root} className="mt-10 @3xl:mt-12 @4xl:mt-16">
      <div className="@3xl:hidden">
        <div className="flex items-center gap-4">
          <span
            lang={lang}
            className="grid h-[84px] min-w-[104px] shrink-0 place-items-center rounded-md bg-plate px-3 text-[26px] leading-[1.6] font-medium whitespace-nowrap text-ink edge-strong"
          >
            {term(shown.state === "known")}
          </span>
          <p className="grid min-w-0 gap-0.5">
            <span className="text-lg leading-tight font-medium text-ink tabular-nums">
              {label(shown.day)}
            </span>
            <span className="text-sm text-ink-secondary">{stateName[shown.state]}</span>
            <span className="min-h-5 text-sm text-ink-muted tabular-nums">
              {next ? t`Next review in ${days(next)}` : t`${total} reviews in ${span} days`}
            </span>
          </p>
        </div>
        <ol aria-label={t`The wait before each review`} className="mt-6 grid gap-3">
          {STOPS.slice(1).map((stop, index) => {
            const i = index + 1;
            const wait = waitBefore(i);
            const on = reached(`line${i}`);
            const from = label(STOPS[index]?.day ?? 0);
            const to = label(stop.day);
            return (
              <li key={stop.day} className="grid gap-1">
                <span className="sr-only">{t`${from} to ${to}: ${days(wait)}`}</span>
                <p
                  aria-hidden="true"
                  className={clsx(
                    "flex items-baseline justify-between gap-3 text-sm transition-opacity duration-300 ease-out motion-reduce:transition-none",
                    !on && "opacity-0",
                  )}
                >
                  <span className="text-ink tabular-nums">
                    {from} → {to}
                  </span>
                  <span className="text-ink-muted tabular-nums">{days(wait)}</span>
                </p>
                <span aria-hidden="true" className="flex h-5 items-center gap-1.5">
                  <FlameMark
                    className={clsx(
                      "h-5 w-[15px] shrink-0 transition-[opacity,scale] duration-300 ease-out motion-reduce:transition-none",
                      !on && "scale-80 opacity-0",
                    )}
                  />
                  <span className="relative h-1.5 flex-1">
                    <span
                      style={{
                        width: `${(wait / LONGEST) * 100}%`,
                        transitionDuration: waiting ? `${DRAW[i] ?? 0}ms` : "0ms",
                      }}
                      className={clsx(
                        "absolute inset-y-0 start-0 min-w-1.5 rounded-full bg-amber transition-[scale] ease-linear motion-reduce:transition-none ltr:origin-left rtl:origin-right",
                        !on && "scale-x-0",
                      )}
                    />
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <ol
        // A stop is 96px wide; the space between two stops is 24px plus a share of what is left.
        style={{ "--stop": "96px" } as CSSProperties}
        className="hidden @3xl:flex"
        aria-label={t`One card’s reviews over seven weeks`}
      >
        {STOPS.map((stop, i) => {
          const on = reached(`stop${i}`);
          const drawn = reached(`line${i}`);
          const wait = waitBefore(i);
          const draw = DRAW[i] ?? 0;
          const card = part(on, 0);
          const flame = part(on, 1);
          const words = part(on, 2);
          return (
            <li
              key={stop.day}
              style={{ "--grow": Math.max(wait - 1, 0) } as CSSProperties}
              className={clsx(
                "relative flex justify-end",
                i
                  ? "grow-[var(--grow)] basis-[calc(var(--stop)+24px)]"
                  : "grow-0 basis-[var(--stop)]",
              )}
            >
              {i > 0 && (
                <>
                  {/* The line from the flame before to this one, stopping short of both. */}
                  <span
                    aria-hidden="true"
                    className={clsx(
                      "absolute start-[calc(var(--stop)/-2+21px)] end-[calc(var(--stop)/2+21px)] top-[125px] h-0.5 overflow-hidden rounded-full bg-edge-strong transition-opacity duration-200 ease-out motion-reduce:transition-none",
                      // The track shows with its line, so no grey stretch waits ahead of the sequence.
                      !drawn && "opacity-0",
                    )}
                  >
                    <span
                      style={{ transitionDuration: waiting ? `${draw}ms` : "0ms" }}
                      className={clsx(
                        "absolute inset-0 bg-amber transition-[scale] ease-linear motion-reduce:transition-none ltr:origin-left rtl:origin-right",
                        !drawn && "scale-x-0",
                      )}
                    />
                  </span>
                  {/* The wait, named on the line as the line reaches its middle. */}
                  <span
                    style={{
                      transitionDelay: drawn && waiting ? `${Math.round(draw / 2)}ms` : "0ms",
                    }}
                    className={clsx(
                      "absolute start-[calc(var(--stop)/-2)] end-[calc(var(--stop)/2)] top-[126px] flex h-0 items-center justify-center text-xs text-ink-muted transition-opacity duration-200 ease-out motion-reduce:transition-none",
                      !drawn && "opacity-0",
                    )}
                  >
                    <span className="bg-canvas px-1.5 whitespace-nowrap">{days(wait)}</span>
                  </span>
                </>
              )}
              <div className="flex w-[var(--stop)] shrink-0 flex-col items-center gap-2.5 text-center">
                {/* The tile grows with its word: a fixed width cut off неділя and молоко. */}
                <span
                  lang={lang}
                  style={card.style}
                  className={clsx(
                    "grid h-[104px] min-w-[92px] place-items-center rounded-md bg-plate px-3 text-[22px] leading-[1.6] font-medium whitespace-nowrap text-ink edge-strong @5xl:text-[26px]",
                    card.className,
                    !on && "translate-y-1.5",
                  )}
                >
                  {term(stop.state === "known")}
                </span>
                <FlameMark
                  style={flame.style}
                  className={clsx("h-6 w-[18px]", flame.className, !on && "scale-80")}
                />
                <span
                  style={words.style}
                  className={clsx("grid justify-items-center", words.className)}
                >
                  <span className="text-md font-medium whitespace-nowrap text-ink">
                    {label(stop.day)}
                  </span>
                  <span className="text-sm text-ink-muted">{stateName[stop.state]}</span>
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

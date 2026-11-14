import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { FLAME_BOUNDS } from "@lymi/design";
import { clsx } from "clsx";
import { useInView } from "motion/react";
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react";
import { FLAME_PARTS } from "../lantern-geometry";
import { useStill } from "./playback";

/** Six reviews of one card: the gap grows each time it's remembered. */
const STOPS = [
  { day: 0, state: "new" },
  { day: 1, state: "learning" },
  { day: 3, state: "learning" },
  { day: 8, state: "known" },
  { day: 21, state: "known" },
  { day: 50, state: "known" },
] as const;

/** A soft landing for things arriving, and a slight lift for a flame as it lights. */
const ARRIVE = "cubic-bezier(0.22, 1, 0.36, 1)";
const LIGHT = "cubic-bezier(0.34, 1.3, 0.64, 1)";
/** The first card shows, then the line sets off and crosses the whole lane at one even pace. */
const FIRST_MS = 120;
const SET_OFF_MS = 420;
const LINE_MS = 2700;

/** When each stop arrives and when the line to it starts and how long it runs, in ms. */
interface Timeline {
  stop: number[];
  line: number[];
  draw: number[];
}

/**
 * The phone's bars, one per wait: a longer wait grows for longer, and each bar starts before the
 * one above has finished, so the rows pour in rather than step.
 */
const PHONE: Timeline = (() => {
  const t: Timeline = { stop: [FIRST_MS], line: [0], draw: [0] };
  let next = FIRST_MS + 260;
  STOPS.forEach((stop, i) => {
    if (!i) return;
    const wait = stop.day - (STOPS[i - 1]?.day ?? 0);
    const draw = 360 + wait * 22;
    t.line[i] = next;
    t.draw[i] = draw;
    t.stop[i] = next + draw;
    next += Math.round(draw * 0.55);
  });
  return t;
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
  const seen = useInView(root, { amount: 0.4, once: true });
  const waiting = useWaiting(root, still);
  const lines = useRef<(HTMLSpanElement | null)[]>([]);
  const [timeline, setTimeline] = useState<Timeline>(PHONE);
  const [play, setPlay] = useState(false);
  const label = (day: number) => (day === 0 ? t`Today` : t`Day ${day}`);
  const days = (count: number) => t`${plural(count, { one: "# day", other: "# days" })}`;
  const stateName = { new: t`New`, learning: t`Learning`, known: t`Known` };

  // On a wide screen the line keeps one pace, so each stretch runs as long as it is wide.
  useEffect(() => {
    if (!waiting || !seen) return;
    const widths = STOPS.map((_, i) => (i ? (lines.current[i]?.offsetWidth ?? 0) : 0));
    const total = widths.reduce((sum, w) => sum + w, 0);
    if (total) {
      const next: Timeline = { stop: [FIRST_MS], line: [0], draw: [0] };
      let now = FIRST_MS + SET_OFF_MS;
      widths.forEach((width, i) => {
        if (!i) return;
        const draw = Math.round((width / total) * LINE_MS);
        next.line[i] = now;
        next.draw[i] = draw;
        now += draw;
        next.stop[i] = now;
      });
      setTimeline(next);
    }
    // Two frames, so the hidden state is painted before the transitions start.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setPlay(true));
    });
    return () => cancelAnimationFrame(frame);
  }, [waiting, seen]);

  const on = !waiting || play;
  /**
   * A transition that starts at a point on the timeline. None at rest, and none while the lane hides
   * itself to wait, or the later parts would fade out one by one on their delays first.
   */
  const timed = (
    at: number,
    ms: number,
    ease = ARRIVE,
    properties = "opacity, translate, scale",
  ) =>
    waiting && play
      ? {
          transitionProperty: properties,
          transitionDuration: `${ms}ms`,
          transitionTimingFunction: ease,
          transitionDelay: `${Math.round(at)}ms`,
        }
      : undefined;

  // The phone's card follows the reviews as their bars land.
  const [reachedOnPhone, setReachedOnPhone] = useState(0);
  useEffect(() => {
    if (!waiting || !play) return;
    const timers = PHONE.stop.map((at, i) =>
      window.setTimeout(() => setReachedOnPhone((r) => Math.max(r, i)), at),
    );
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [waiting, play]);

  // On a phone the one card shows the latest review the bars have reached.
  const latest = waiting ? reachedOnPhone : STOPS.length - 1;
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
          {/* Keyed by the review, so each new one fades in rather than snapping. */}
          <p key={latest} className={clsx("grid min-w-0 gap-0.5", waiting && "lane-swap")}>
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
            const start = PHONE.line[i] ?? 0;
            const draw = PHONE.draw[i] ?? 0;
            const from = label(STOPS[index]?.day ?? 0);
            const to = label(stop.day);
            return (
              <li key={stop.day} className="grid gap-1">
                <span className="sr-only">{t`${from} to ${to}: ${days(wait)}`}</span>
                <p
                  aria-hidden="true"
                  style={timed(start, 420)}
                  className={clsx(
                    "flex items-baseline justify-between gap-3 text-sm",
                    !on && "translate-y-1 opacity-0",
                  )}
                >
                  <span className="text-ink tabular-nums">
                    {from} → {to}
                  </span>
                  <span className="text-ink-muted tabular-nums">{days(wait)}</span>
                </p>
                <span aria-hidden="true" className="flex h-5 items-center gap-1.5">
                  <FlameMark
                    style={timed(start + 60, 380, LIGHT)}
                    className={clsx("h-5 w-[15px] shrink-0", !on && "scale-50 opacity-0")}
                  />
                  <span className="relative h-1.5 flex-1">
                    <span
                      style={{
                        width: `${(wait / LONGEST) * 100}%`,
                        ...timed(start + 120, draw, ARRIVE, "scale"),
                      }}
                      className={clsx(
                        "absolute inset-y-0 start-0 min-w-1.5 rounded-full bg-amber ltr:origin-left rtl:origin-right",
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
          const wait = waitBefore(i);
          const start = timeline.line[i] ?? 0;
          const draw = timeline.draw[i] ?? 0;
          const arrive = timeline.stop[i] ?? 0;
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
                    ref={(el) => {
                      lines.current[i] = el;
                    }}
                    aria-hidden="true"
                    className="absolute start-[calc(var(--stop)/-2+21px)] end-[calc(var(--stop)/2+21px)] top-[125px] h-0.5 overflow-hidden rounded-full"
                  >
                    {/* One even pace across every stretch, so the line reads as one journey. */}
                    <span
                      style={timed(start, draw, "linear", "scale")}
                      className={clsx(
                        "absolute inset-0 bg-amber ltr:origin-left rtl:origin-right",
                        !on && "scale-x-0",
                      )}
                    />
                  </span>
                  {/* The wait, named on the line as the line passes its middle. */}
                  <span
                    style={timed(start + draw * 0.4, 360)}
                    className={clsx(
                      "absolute start-[calc(var(--stop)/-2)] end-[calc(var(--stop)/2)] top-[126px] flex h-0 items-center justify-center text-xs text-ink-muted",
                      !on && "opacity-0",
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
                  style={timed(arrive - 80, 560)}
                  className={clsx(
                    "grid h-[104px] min-w-[92px] place-items-center rounded-md bg-plate px-3 text-[22px] leading-[1.6] font-medium whitespace-nowrap text-ink edge-strong @5xl:text-[26px]",
                    !on && "translate-y-2 scale-[0.97] opacity-0",
                  )}
                >
                  {term(stop.state === "known")}
                </span>
                {/* The flame lights as the line touches it. */}
                <FlameMark
                  style={timed(arrive, 420, LIGHT)}
                  className={clsx("h-6 w-[18px]", !on && "scale-50 opacity-0")}
                />
                <span
                  style={timed(arrive + 60, 460)}
                  className={clsx("grid justify-items-center", !on && "translate-y-1 opacity-0")}
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

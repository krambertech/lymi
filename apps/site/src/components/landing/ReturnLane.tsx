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
/** Down a phone, the room above a stop: enough for the wait's label, then 3.3px for each day more. */
const roomAbove = (i: number) => (i ? 24 + Math.round((waitBefore(i) - 1) * 3.3) : 0);

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
 * One card at each of its reviews, set apart by how long Lymi waited: across on a wide screen, down
 * the start edge on a narrow one. Each wait is named on its stretch of line, so the growth can be
 * read as well as seen.
 */
export function ReturnLane({ term, lang }: Props) {
  const { t } = useLingui();
  const root = useRef<HTMLOListElement>(null);
  const still = useStill();
  const inView = useInView(root, { amount: 0.4 });
  const waiting = useWaiting(root, still);
  const { at } = usePlayback(BEATS, inView, still);
  const reached = (beat: Beat) => !waiting || at(beat);
  const label = (day: number) => (day === 0 ? t`Today` : t`Day ${day}`);
  const stateName = { new: t`New`, learning: t`Learning`, known: t`Known` };
  // A part of a stop: it rises in place, each a beat after the one before.
  const part = (on: boolean, order: number) => ({
    style: { transitionDelay: on && waiting ? `${order * 60}ms` : "0ms" },
    className: clsx(
      "transition-[opacity,translate,scale] duration-300 ease-out motion-reduce:transition-none",
      !on && "opacity-0",
    ),
  });

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
                    className={clsx(
                      "absolute start-[11px] -top-[14px] bottom-[46px] w-0.5 overflow-hidden rounded-full bg-edge-strong @3xl:start-[calc(var(--stop)/-2+21px)] @3xl:end-[calc(var(--stop)/2+21px)] @3xl:top-[125px] @3xl:bottom-auto @3xl:h-0.5 @3xl:w-auto transition-opacity duration-200 ease-out motion-reduce:transition-none",
                      // The track shows with its line, so no grey stretch waits ahead of the sequence.
                      !drawn && "opacity-0",
                    )}
                  >
                    <span
                      style={{ transitionDuration: waiting ? `${draw}ms` : "0ms" }}
                      className={clsx(
                        "absolute inset-0 origin-top bg-amber transition-[scale] ease-linear motion-reduce:transition-none @3xl:ltr:origin-left @3xl:rtl:origin-right",
                        !drawn && "scale-y-0 @3xl:scale-x-0 @3xl:scale-y-100",
                      )}
                    />
                  </span>
                  {/* The wait, named as the line reaches its middle: tied to the line by a tick on a
                      phone, set on the line across. */}
                  <span
                    style={{
                      transitionDelay: drawn && waiting ? `${Math.round(draw / 2)}ms` : "0ms",
                    }}
                    className={clsx(
                      "absolute start-[17px] top-0 flex h-[var(--room)] items-center gap-1.5 text-xs text-ink-muted transition-opacity duration-200 ease-out motion-reduce:transition-none @3xl:start-[calc(var(--stop)/-2)] @3xl:end-[calc(var(--stop)/2)] @3xl:top-[126px] @3xl:h-0 @3xl:justify-center",
                      !drawn && "opacity-0",
                    )}
                  >
                    <span aria-hidden="true" className="h-px w-2.5 bg-edge-strong @3xl:hidden" />
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
                  style={card.style}
                  className={clsx(
                    "order-2 grid h-[60px] min-w-[68px] place-items-center rounded-md bg-plate px-2.5 text-xl leading-[1.6] font-medium whitespace-nowrap text-ink edge-strong @3xl:order-1 @3xl:h-[104px] @3xl:min-w-[92px] @3xl:px-3 @3xl:text-[22px] @5xl:text-[26px]",
                    card.className,
                    !on && "translate-y-1.5",
                  )}
                >
                  {term(stop.state === "known")}
                </span>
                <span className="order-1 grid h-[60px] place-items-center @3xl:order-2 @3xl:h-auto">
                  <FlameMark
                    style={flame.style}
                    className={clsx("h-6 w-[18px]", flame.className, !on && "scale-80")}
                  />
                </span>
                <span
                  style={words.style}
                  className={clsx("order-3 grid @3xl:justify-items-center", words.className)}
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

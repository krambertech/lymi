import type { StreakOut } from "@lymi/core";
import { Play } from "lucide-react";
import { MotionConfig } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "../components/button";
import { Flame } from "../components/flame";
import {
  FLAME_MOTION,
  STREAK_FLAME_SIZE,
  type StreakFlameState,
  streakFlameFor,
} from "../lib/flame";
import { DocLink } from "./doc-link";
import { Doc, Pair, Sub } from "./frame";

type Spring = (typeof FLAME_MOTION)[keyof typeof FLAME_MOTION];
const spec = (s: Spring) =>
  `spring ${Math.round(s.visualDuration * 1000)} ms${s.bounce ? `, bounce ${s.bounce}` : ""}`;

const link =
  "font-medium text-text underline decoration-edge-2 underline-offset-4 hoverable:hover:decoration-current";

/** The flame where the product uses it: the streak modal, the phone pill and the rail pill. */
function Sizes({
  state,
  flicker = state === "full",
}: {
  state: StreakFlameState;
  flicker?: boolean;
}) {
  return (
    <div className="flex items-end gap-5">
      <Flame className="h-11 w-9" state={state} flicker={flicker} />
      <Flame className="h-5 w-4" state={state} flicker={flicker} />
      <Flame className="h-4 w-[13px]" state={state} flicker={flicker} />
    </div>
  );
}

const STATES: { state: StreakFlameState; name: string; note: string }[] = [
  {
    state: "out",
    name: "Out",
    note: "No streak and no review yet today. The lantern's ember, scaled to the flame's height.",
  },
  {
    state: "lit",
    name: "Lit",
    note: "Today's goal still open after the first review, or all day on a streak, nothing due included. The brand flame, held still.",
  },
  {
    state: "full",
    name: "Full",
    note: `Today's goal is met. ${STREAK_FLAME_SIZE.full}× the brand flame, and the only state that flickers.`,
  },
];

function summary(
  current: number,
  attempts: number,
  outcome: StreakOut["today"]["outcome"],
): StreakOut {
  return {
    today: { date: "2026-09-13", attempts, goal: 10, outcome },
    goal: 10,
    current,
    longest: current,
    reviewedDays: current,
    restDays: [],
    days: [],
  };
}

/** Each streak situation, read through `streakFlameFor`, so the table is the code's answer. */
const SITUATIONS: [string, StreakOut][] = [
  ["A new learner", summary(0, 0, "open")],
  ["The morning after a day that ended short of its goal", summary(0, 0, "open")],
  ["No streak, after today's first review", summary(0, 1, "open")],
  ["A streak, today's goal still open", summary(6, 4, "open")],
  ["A streak, nothing due today", summary(6, 0, "nothing_due")],
  ["Today's goal met", summary(7, 10, "goal_met")],
  ["Every available review done below the goal", summary(7, 6, "exhausted")],
];

/** Mounts in one state and moves to another on the next frame, the way a refetch moves it. */
function Replay({ from, to }: { from: StreakFlameState; to: StreakFlameState }) {
  const [state, setState] = useState(from);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setState(to));
    return () => cancelAnimationFrame(frame);
  }, [to]);
  return <Sizes state={state} />;
}

const MOVEMENTS: {
  name: string;
  timing: string;
  note: string;
  from: StreakFlameState;
  to: StreakFlameState;
}[] = [
  {
    name: "Catch",
    timing: spec(FLAME_MOTION.catch),
    note: "Out to lit, at the first review of a day with no streak. The one movement with a trace of overshoot.",
    from: "out",
    to: "lit",
  },
  {
    name: "Rise",
    timing: spec(FLAME_MOTION.rise),
    note: "Lit to full, when today's goal is met. Once a day, and it stays.",
    from: "lit",
    to: "full",
  },
  {
    name: "Settle",
    timing: spec(FLAME_MOTION.settle),
    note: "Full to lit, when a new day opens on a kept streak.",
    from: "full",
    to: "lit",
  },
  {
    name: "Go out",
    timing: spec(FLAME_MOTION.goOut),
    note: "A new day opens with no streak and no review yet. Slow, so it dies down rather than switches off.",
    from: "lit",
    to: "out",
  },
];

function MovementCard({ m }: { m: (typeof MOVEMENTS)[number] }) {
  const [run, setRun] = useState(0);
  return (
    <div className="edge grid content-start gap-4 rounded-lg bg-plate p-5">
      <div className="grid h-24 place-items-center">
        <Replay key={run} from={m.from} to={m.to} />
      </div>
      <div className="grid gap-1">
        <div className="flex min-h-8 items-center justify-between gap-3">
          <h3 className="text-base font-medium">{m.name}</h3>
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Play ${m.name}`}
            onClick={() => setRun((n) => n + 1)}
          >
            <Play aria-hidden="true" className="size-3.5" />
            Play
          </Button>
        </div>
        <p className="font-mono text-xs text-muted tabular-nums">{m.timing}</p>
        <p className="mt-1 text-sm text-pretty text-text-2">{m.note}</p>
      </div>
    </div>
  );
}

/** Lit to full twice, with and without motion. What is left without motion is the size. */
function ReducedSideBySide() {
  const [state, setState] = useState<StreakFlameState>("lit");
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const play = () => {
    window.clearTimeout(timer.current);
    setState("lit");
    timer.current = window.setTimeout(() => setState("full"), 700);
  };
  return (
    <div className="edge grid overflow-hidden rounded-lg bg-canvas">
      <div className="grid gap-6 p-6 @xl:grid-cols-2">
        {(["never", "always"] as const).map((mode) => (
          <figure key={mode} className="grid justify-items-center gap-3">
            <MotionConfig reducedMotion={mode}>
              <Sizes state={state} flicker={mode === "never" && state === "full"} />
            </MotionConfig>
            <figcaption className="font-mono text-xs text-muted">
              {mode === "never" ? "Motion" : "Reduced motion"}
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="flex justify-center border-t border-edge p-3">
        <Button size="sm" variant="ghost" onClick={play}>
          <Play aria-hidden="true" className="size-3.5" />
          Reach the goal
        </Button>
      </div>
    </div>
  );
}

const PROPS: [string, string, string][] = [
  ["state", '"out" | "lit" | "full"', "From streakFlameFor(streak). Defaults to lit."],
  ["flicker", "boolean", "The ambient loop. Pass it only when the state is full."],
  ["title", "string", "An accessible name, when the flame stands without a label beside it."],
];

function Row({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-edge px-5 py-3 text-base last:border-b-0 @3xl:grid-cols-[1fr_120px] @3xl:items-center @3xl:gap-4">
      {children}
    </div>
  );
}

export function FlamePage() {
  return (
    <Doc
      title="Flame"
      lede="The flame on its own, beside the streak number in the pill and the streak modal. It says where today stands in the lantern's words: out, lit or full. Whether the streak is alive is the number's job. It is small, it is on every screen, and it is never a gauge."
    >
      <Sub
        title="States"
        note="Three, and nothing between them. Growth with each review belongs to the lantern, where there is room for it; at 16 px it would be unreadable and, on every screen, restless. Each state at the modal, the phone pill and the rail pill."
      >
        <div className="grid gap-3">
          {STATES.map((s) => (
            <div key={s.state} className="grid gap-2">
              <Pair>{() => <Sizes state={s.state} />}</Pair>
              <p className="px-1 text-sm text-text-2">
                <span className="font-medium text-text">{s.name}.</span> {s.note}
              </p>
            </div>
          ))}
        </div>
      </Sub>

      <Sub
        title="When each state shows"
        note="streakFlameFor reads the streak summary. It is out only with no streak and no review yet today; the first review lights it; a nothing-due day keeps a streak's flame without growing it; every grade counts toward the goal the same."
      >
        <div className="edge overflow-hidden rounded-lg bg-plate">
          {SITUATIONS.map(([label, s]) => {
            const state = streakFlameFor(s);
            return (
              <Row key={label}>
                <span className="text-sm text-text-2">{label}</span>
                <span className="flex items-center gap-2.5">
                  <Flame className="h-5 w-4" state={state} flicker={state === "full"} />
                  <span className="font-mono text-sm">{state}</span>
                </span>
              </Row>
            );
          })}
        </div>
      </Sub>

      <Sub
        title="Movements"
        note="Springs, not durations, so a movement that is interrupted keeps its speed. They are the lantern's springs from FLAME_MOTION, so a flame that catches here catches the way the lantern does."
      >
        <div className="grid gap-3 @2xl:grid-cols-2">
          {MOVEMENTS.map((m) => (
            <MovementCard key={m.name} m={m} />
          ))}
        </div>
      </Sub>

      <Sub
        title="Reduced motion"
        note="The flame jumps to its new state and does not flicker. The three states still read apart without movement: an ember, the brand flame, a taller flame."
      >
        <ReducedSideBySide />
      </Sub>

      <Sub
        title="The drawing"
        note="The flame from lantern-geometry, cropped to its own bounds. The tip sits on the top edge of the box and a full or flickering flame grows past it, so the drawing overflows rather than clipping: a cut-off tip is the one thing that makes the mark look broken."
      >
        <Pair>
          {() => (
            <div className="flex items-end justify-center gap-8 py-4">
              {STATES.map((s) => (
                <Flame
                  key={s.state}
                  className="h-28 w-[91px] outline-1 outline-edge-2 outline-dashed"
                  state={s.state}
                />
              ))}
            </div>
          )}
        </Pair>
      </Sub>

      <Sub title="Using it">
        <div className="edge overflow-hidden rounded-lg bg-plate">
          {PROPS.map(([name, type, what]) => (
            <div
              key={name}
              className="grid gap-1 border-b border-edge px-5 py-3 text-base last:border-b-0 @3xl:grid-cols-[120px_200px_1fr] @3xl:gap-4"
            >
              <span className="font-mono text-sm font-medium">{name}</span>
              <span className="font-mono text-sm text-text-2">{type}</span>
              <span className="text-sm text-muted">{what}</span>
            </div>
          ))}
        </div>
        <pre className="edge overflow-x-auto rounded-lg bg-plate-2 p-4 font-mono text-sm text-text-2">
          {`const state = streakFlameFor(streak);
<Flame state={state} flicker={state === "full"} />`}
        </pre>
        <p className="text-base text-text-2">
          What the streak itself means is on{" "}
          <DocLink to={{ kind: "page", page: "streak" }} className={link}>
            Streak
          </DocLink>
          . The lantern, and the flame growing inside it, is on{" "}
          <DocLink to={{ kind: "page", page: "lantern" }} className={link}>
            Lantern
          </DocLink>
          .
        </p>
      </Sub>

      <Sub title="Don’t">
        <ul className="grid gap-2 text-base text-text-2 @3xl:grid-cols-2">
          {[
            "Don’t grow it or spark it with each review. That is the lantern’s job.",
            "Don’t put it out for nothing due, an ended session or an unfinished morning.",
            "Don’t give it movements of its own. Change its state and let it move.",
            "Don’t use it as a brand mark. It always shows a learner’s streak.",
          ].map((t) => (
            <li key={t} className="edge rounded-md bg-plate px-4 py-3">
              {t}
            </li>
          ))}
        </ul>
      </Sub>
    </Doc>
  );
}

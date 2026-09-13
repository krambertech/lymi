import { clsx } from "clsx";
import { Play } from "lucide-react";
import { MotionConfig } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "../components/Button";
import { Lantern } from "../components/Lantern";
import { Segmented } from "../components/Segmented";
import { FLAME_BREATH, FLAME_MOTION, FLAME_SIZE } from "../lib/flame";
import { Doc, type FrameTheme, ROOM_THEMES, Sub, usePageTheme, Variants } from "./Frame";
import { IconToggle } from "./IconToggle";

type Spring = (typeof FLAME_MOTION)[keyof typeof FLAME_MOTION];
const ms = (s: Spring) => `${Math.round(s.visualDuration * 1000)} ms`;
const spec = (s: Spring) => `spring ${ms(s)}${s.bounce ? `, bounce ${s.bounce}` : ""}`;

/** Timeouts that die with the component, for demos that play a sequence. */
function useTimeline() {
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  return {
    clear: () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    },
    at: (ms: number, fn: () => void) => {
      timers.current.push(window.setTimeout(fn, ms));
    },
  };
}

/** A canvas in one room, with its own switch, following the page until picked. */
function Room({ children, className }: { children: ReactNode; className?: string | undefined }) {
  const page = usePageTheme();
  const [picked, setPicked] = useState<FrameTheme | null>(null);
  const theme = picked ?? page;
  return (
    <div
      data-theme={theme}
      className={clsx("edge relative overflow-hidden rounded-lg bg-canvas text-text", className)}
    >
      <div className="absolute end-3 top-3 z-10">
        <IconToggle
          label="Canvas theme"
          value={theme}
          onChange={(t) => setPicked(t === page ? null : t)}
          options={ROOM_THEMES}
        />
      </div>
      {children}
    </div>
  );
}

/** The same lantern where the product uses it: the hero, the review header, and small. */
function Sizes({ hero = "size-24", ...props }: Parameters<typeof Lantern>[0] & { hero?: string }) {
  return (
    <div className="flex items-end gap-6">
      <Lantern {...props} className={hero} />
      <Lantern {...props} className="size-11" />
      <Lantern {...props} className="size-6" />
    </div>
  );
}

const GRADES = ["Forgot", "Hard", "Good", "Easy"] as const;
type Goal = "10" | "25" | "50";

interface Day {
  number: number;
  reviewed: number;
  /** Days in a row whose goal was met, today included once it is. */
  streak: number;
  nothingDue: boolean;
}

const FIRST_DAY: Day = { number: 1, reviewed: 0, streak: 0, nothingDue: false };

/** A review, and the streak it starts or extends the moment today's goal is met. */
function reviewed(d: Day, count: number, goal: number): Day {
  const met = d.reviewed < goal && count >= goal;
  return { ...d, reviewed: count, streak: met ? d.streak + 1 : d.streak };
}

function describe(day: Day, goal: number) {
  if (day.streak === 0)
    return "Out. No streak, no flame. Reviews still count, and the flame catches when today’s goal is met.";
  if (day.nothingDue)
    return "Nothing due. The small flame stays alive: the streak is kept, not grown.";
  if (day.reviewed === 0) return "The start of a day. Small and steady.";
  if (day.reviewed >= goal)
    return "Goal reached. The flame stands full and settled. More reviews still feed it.";
  return "Tending. Each review adds a little, whatever the grade.";
}

/** A learner's day, played by hand: the component driven the way Today and Review drive it. */
function DayAtTheLantern() {
  const [goal, setGoal] = useState<Goal>("10");
  const [day, setDay] = useState<Day>(FIRST_DAY);
  const [fed, setFed] = useState(0);
  const [motion, setMotion] = useState<"system" | "full" | "reduced">("system");
  const timeline = useTimeline();
  const target = Number(goal);
  const reduced = motion === "reduced";

  const review = () => {
    setFed((n) => n + 1);
    setDay((d) => reviewed(d, d.reviewed + 1, target));
  };
  const burst = () => {
    timeline.clear();
    for (let i = 0; i < 6; i++) timeline.at(i * 320, review);
  };
  const nextDay = () => {
    timeline.clear();
    setDay((d) => {
      const kept = d.nothingDue || d.reviewed >= target;
      return { number: d.number + 1, reviewed: 0, nothingDue: false, streak: kept ? d.streak : 0 };
    });
  };

  return (
    <Room>
      <div className="grid @3xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="grid min-h-80 content-center justify-items-center gap-8 px-6 pt-14 pb-8">
          <MotionConfig reducedMotion={motion === "system" ? "user" : reduced ? "always" : "never"}>
            <Sizes
              hero="size-40"
              progress={day.nothingDue ? 0 : Math.min(day.reviewed / target, 1)}
              out={day.streak === 0}
              fed={fed}
              flicker={!reduced}
              glow
            />
          </MotionConfig>
          <div className="grid max-w-[40ch] gap-1 text-center">
            <p className="font-mono text-xs text-muted tabular-nums">
              Day {day.number} · {day.reviewed} of {target} · streak {day.streak}
            </p>
            <p className="text-sm text-pretty text-text-2" aria-live="polite">
              {describe(day, target)}
            </p>
          </div>
        </div>
        <div className="grid content-start gap-5 border-t border-edge p-5 @3xl:border-t-0 @3xl:border-s @3xl:pt-14">
          <Control label="Daily goal">
            <Segmented
              size="sm"
              label="Daily goal"
              value={goal}
              onChange={setGoal}
              options={[
                { value: "10", label: "10" },
                { value: "25", label: "25" },
                { value: "50", label: "50" },
              ]}
            />
          </Control>
          <Control label="Grade a card">
            <div className="grid grid-cols-2 gap-1.5">
              {GRADES.map((g) => (
                <Button
                  key={g}
                  size="sm"
                  variant="secondary"
                  onClick={review}
                  disabled={day.nothingDue}
                >
                  {g}
                </Button>
              ))}
            </div>
          </Control>
          <Control label="Then">
            <div className="grid gap-1.5">
              <Button size="sm" variant="secondary" onClick={burst} disabled={day.nothingDue}>
                Six reviews, quickly
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={day.nothingDue || day.reviewed >= target}
                onClick={() => {
                  setFed((n) => n + 1);
                  setDay((d) => reviewed(d, target, target));
                }}
              >
                Reach the goal
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={day.reviewed > 0 || day.streak === 0}
                onClick={() => setDay((d) => ({ ...d, nothingDue: true }))}
              >
                Nothing due today
              </Button>
              <Button size="sm" variant="secondary" onClick={nextDay}>
                Next day
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  timeline.clear();
                  setDay(FIRST_DAY);
                }}
              >
                Start over
              </Button>
            </div>
          </Control>
          <Control label="Motion">
            <Segmented
              size="sm"
              label="Motion"
              value={motion}
              onChange={setMotion}
              options={[
                { value: "system", label: "System" },
                { value: "full", label: "Full" },
                { value: "reduced", label: "Reduced" },
              ]}
            />
          </Control>
        </div>
      </div>
    </Room>
  );
}

function Control({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <p className="font-mono text-xs text-muted">{label}</p>
      {children}
    </div>
  );
}

interface Movement {
  name: string;
  timing: string;
  note: string;
  /** Renders the movement; a new `run` replays it. */
  render: (run: number) => ReactNode;
  /** Movements that loop have nothing to replay. */
  loops?: boolean | undefined;
}

const MOVEMENTS: Movement[] = [
  {
    name: "Feed",
    timing: `breath in ${ms(FLAME_MOTION.breathIn)}, out ${ms(FLAME_MOTION.breathOut)}; settle ${ms(FLAME_MOTION.settle)}`,
    note: "Every accepted review, Forgot as much as Easy. The flame draws up and thin, the halo swells, and it settles a little taller.",
    render: (run) => <Lantern className="size-24" progress={0.4} fed={run} flicker glow />,
  },
  {
    name: "Reviews close together",
    timing: "each breath starts from the last",
    note: "A fast run of grades reads as one long breath, never a stutter of restarts.",
    render: (run) => <Burst run={run} />,
  },
  {
    name: "Rise",
    timing: `${spec(FLAME_MOTION.rise)}, breath ×${FLAME_BREATH.rise}`,
    note: "The daily goal reached. Growth stops short of full, so this is its own moment. Once a day, and it stays.",
    render: (run) => (
      <Lantern key={run} className="size-24" from={0.95} progress={1} flicker glow />
    ),
  },
  {
    name: "Catch",
    timing: spec(FLAME_MOTION.catch),
    note: "Out to alive, when today’s goal starts a new streak. The wick takes; the only movement with a trace of overshoot.",
    render: (run) => <Lantern key={run} className="size-24" from="out" progress={1} flicker glow />,
  },
  {
    name: "Go out",
    timing: spec(FLAME_MOTION.goOut),
    note: "The streak has broken. Slow, so it dies down rather than switches off. Learners mostly see the result, not the movement.",
    render: (run) => <Lantern key={run} className="size-24" from={0.4} out flicker glow />,
  },
  {
    name: "Flicker",
    timing: "2.6 s loop",
    note: "Ambient. The flame, its core out of phase, and the halo breathe on one loop. Whatever the flame's size, it multiplies it.",
    render: () => <Lantern className="size-24" progress={0.4} flicker glow />,
    loops: true,
  },
  {
    name: "Carried",
    timing: "2.6 s loop, ±5°",
    note: "The body rocks from the bail's pivot and the bail counters at ∓3.5°. App launch and pull to refresh.",
    render: () => <Lantern className="size-24" carry flicker glow />,
    loops: true,
  },
];

function Burst({ run }: { run: number }) {
  const [fed, setFed] = useState(0);
  const timeline = useTimeline();
  const first = useRef(true);
  // biome-ignore lint/correctness/useExhaustiveDependencies: replays on `run` only.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    timeline.clear();
    for (let i = 0; i < 5; i++) timeline.at(i * 260, () => setFed((n) => n + 1));
  }, [run]);
  return <Lantern className="size-24" progress={0.4} fed={fed} flicker glow />;
}

function MovementCard({ m }: { m: Movement }) {
  const [run, setRun] = useState(0);
  return (
    <div className="edge grid content-start gap-4 rounded-lg bg-plate p-5">
      <div className="grid h-32 place-items-center">{m.render(run)}</div>
      <div className="grid gap-1">
        <div className="flex min-h-8 items-center justify-between gap-3">
          <h3 className="text-base font-medium">{m.name}</h3>
          {!m.loops && (
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Play ${m.name}`}
              onClick={() => setRun((n) => n + 1)}
            >
              <Play aria-hidden="true" className="size-3.5" />
              Play
            </Button>
          )}
        </div>
        <p className="font-mono text-xs text-muted tabular-nums">{m.timing}</p>
        <p className="mt-1 text-sm text-pretty text-text-2">{m.note}</p>
      </div>
    </div>
  );
}

/** One sequence twice: three reviews, then the goal. What survives without movement is the meaning. */
function ReducedSideBySide() {
  const start = { out: false, progress: 0, fed: 0 };
  const [step, setStep] = useState(start);
  const timeline = useTimeline();
  const play = () => {
    timeline.clear();
    setStep(start);
    const seq = [
      { out: false, progress: 0.3, fed: 1 },
      { out: false, progress: 0.6, fed: 2 },
      { out: false, progress: 0.9, fed: 3 },
      { out: false, progress: 1, fed: 4 },
    ];
    for (const [i, s] of seq.entries()) timeline.at(700 + i * 1100, () => setStep(s));
  };
  return (
    <Room>
      <div className="grid gap-6 px-5 pt-14 pb-5 @xl:grid-cols-2">
        {(["never", "always"] as const).map((mode) => (
          <figure key={mode} className="grid justify-items-center gap-3">
            <MotionConfig reducedMotion={mode}>
              <Lantern
                className="size-28"
                out={step.out}
                progress={step.progress}
                fed={step.fed}
                flicker={mode === "never"}
                glow
              />
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
          Play the sequence
        </Button>
      </div>
    </Room>
  );
}

const PROPS: [string, string, string][] = [
  [
    "progress",
    "number, 0 to 1",
    "Today's accepted reviews over the daily goal. Omit it for the brand flame.",
  ],
  ["out", "boolean", "There is no streak. Never set it for nothing due."],
  ["fed", "number", "Add one per accepted review. Every change is a breath."],
  [
    "from",
    'number | "brand" | "out"',
    "Where to grow from on mount, so a lantern that arrives continues the one before it.",
  ],
  ["flicker", "boolean", "The ambient loop. Stops under reduced motion by itself."],
  ["glow", "boolean", "The halo. Its width follows the flame."],
  ["carry", "boolean", "The swing from the bail."],
];

export function LanternPage() {
  return (
    <Doc
      title="Lantern"
      lede="The flame is the continuity of remembering. Repetition keeps it alive, so it starts each day small, grows a little with every review whatever the grade, and stands full when the daily goal is reached. It goes out only when the streak breaks. It is one fire the whole time: nothing on this page swaps a drawing."
    >
      <Sub
        title="A day at the lantern"
        note="The component, driven the way Today and Review drive it. Start with no streak, grade cards up to the goal, then move to the next day. Try a nothing-due day and a day that ends short of the goal."
      >
        <DayAtTheLantern />
      </Sub>

      <Sub
        title="States"
        note={`There are no named states in the component, only one size. These are the stops worth recognising, each at the hero, the review header and 24 px. The flame stands at ${FLAME_SIZE.start}× the brand flame at the start of a day, ${FLAME_SIZE.nearly}× just before the goal and ${FLAME_SIZE.full}× once it is reached; height carries the change and width follows at half the rate.`}
      >
        <Variants
          items={[
            {
              label: "Out",
              note: "No streak: a new learner, or a day that ended short of its goal. An ember in unlit glass. Reviews still count and the flame catches at the goal.",
              render: () => <Sizes out glow />,
            },
            {
              label: "Start of the day",
              note: "Small and steady before the first review. A confirmed nothing-due day stays here: alive, not grown.",
              render: () => <Sizes progress={0} flicker glow />,
            },
            {
              label: "Tending",
              note: "Partway to the goal. The flame and its halo have grown with each review.",
              render: () => <Sizes progress={0.45} flicker glow />,
            },
            {
              label: "Nearly there",
              note: "Growth stops short of full, so reaching the goal keeps a rise of its own.",
              render: () => <Sizes progress={0.95} flicker glow />,
            },
            {
              label: "Goal reached",
              note: "Full height, the widest halo. Settled for the rest of the day; extra rounds still feed it.",
              render: () => <Sizes progress={1} flicker glow />,
            },
            {
              label: "Brand",
              note: "The canonical flame for login, the app icon and public pages. It never shows a learner's state.",
              render: () => <Sizes flicker glow />,
            },
          ]}
        />
      </Sub>

      <Sub
        title="Movements"
        note="Springs, not durations, so a movement that is interrupted keeps its speed instead of starting over. The numbers come from FLAME_MOTION in the component."
      >
        <div className="grid gap-3 @2xl:grid-cols-2 @5xl:grid-cols-3">
          {MOVEMENTS.map((m) => (
            <MovementCard key={m.name} m={m} />
          ))}
        </div>
      </Sub>

      <Sub
        title="Reduced motion"
        note="The flame jumps to its new size and the halo to its new width, with no breath and no flicker. Size and light carry the meaning, so a learner who has motion reduced reads the same day."
      >
        <ReducedSideBySide />
      </Sub>

      <Sub
        title="Using it"
        note="The product passes facts, never effects. A screen does not decide to celebrate; it says how far today has come and the lantern moves."
      >
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
          {`<Lantern
  {...lanternFor(streak)}
  fed={reviewedToday}
  flicker
  glow
/>`}
        </pre>
      </Sub>

      <Sub title="Don’t">
        <ul className="grid gap-2 text-base text-text-2 @3xl:grid-cols-2">
          {[
            "Don’t reward a grade. Forgot feeds the flame exactly as Easy does.",
            "Don’t put the flame out for nothing due, an ended session or an unfinished morning.",
            "Don’t read it as a gauge. No numbers on or beside the lantern, no ticks, no fill.",
            "Don’t add a celebration at the goal. The rise is the whole of it.",
            "Don’t show learner state on the brand lantern: login, the app icon, public pages.",
            "Don’t animate the lantern from a screen. Change progress, out or fed and let it move.",
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

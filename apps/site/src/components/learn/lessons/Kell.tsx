import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Minus, Plus } from "lucide-react";
import { type ReactNode, useLayoutEffect, useMemo, useRef, useState } from "react";
import { lessonBySlug } from "../../../lib/learn/catalogue";
import { clipUrl, KELL_PASSAGE } from "../../../lib/learn/clips";
import {
  type ClockTime,
  MINUTES,
  type Minute,
  nearestMinute,
  nextHour,
  previousHour,
  stepMinute,
  timeClip,
  timeDigits,
  timeMatches,
  timeParts,
  timeSentence,
  timeWords,
  withMinute,
} from "../../../lib/learn/estonian-time";
import { playSound, usePlaying } from "../../../lib/learn/player";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { Chips, Keys, ListenRows, Panel } from "../Explore";
import { type FormItem, FormRound, formRecall } from "../FormRound";
import type { Glossary } from "../lesson-context";
import { LessonView, Prose } from "../LessonView";
import { Listening, type PassageQuestion } from "../Passage";
import {
  Answer,
  type ChoiceItem,
  ChoiceRound,
  Feedback,
  Quiz,
  type RoundProps,
  type TypedItem,
  TypedRound,
  useAutoplay,
  useNudge,
} from "../Quiz";
import { type SentenceItem, SentenceRound, sentenceRecall } from "../SentenceRound";
import { Listen, PlayButton, PlayMark } from "../Sound";
import { Word } from "../Word";

const SLUG = "kell";
const timeSrc = (time: ClockTime) => clipUrl(SLUG, timeClip(time));
const at = (hour: number, minute: Minute): ClockTime => ({ hour, minute });

const GLOSSARY: Glossary = {
  "mis kell on?": {
    en: msg`What time is it?`,
    note: msg`Word for word: “what clock is?”`,
    show: "Mis kell on?",
  },
  kell: { en: msg`clock, watch; o’clock`, note: msg`Also a bell.` },
  "kell on kolm": { en: msg`It’s three o’clock.`, show: "Kell on kolm", clip: timeClip(at(3, 0)) },
  "kell kuus": {
    en: msg`at six; six o’clock`,
    note: msg`Kell with a time also says when: kell kuus, at six.`,
    clip: false,
  },
  pool: { en: msg`half`, note: msg`Pool neli: halfway to four, 3:30.` },
  veerand: { en: msg`a quarter`, note: msg`Veerand neli: a quarter of the way to four, 3:15.` },
  kolmveerand: { en: msg`three quarters`, note: msg`Kolm, three, and veerand, a quarter.` },
  läbi: { en: msg`through; past`, note: msg`Kümme minutit kolm läbi: 3:10.` },
  pärast: {
    en: msg`after; in, as in “in ten minutes”`,
    note: msg`Kümne minuti pärast neli: in ten minutes it’s four, 3:50.`,
  },
  minutit: { en: msg`minutes`, note: msg`After a number from two up, minut becomes minutit.` },
  "pool neli": { en: msg`half past three, 3:30` },
  "veerand neli": { en: msg`quarter past three, 3:15` },
  "kolmveerand neli": { en: msg`quarter to four, 3:45` },
  "kümme minutit kolm läbi": { en: msg`ten past three, 3:10` },
  "kümne minuti pärast neli": {
    en: msg`ten to four, 3:50`,
    note: msg`Kümne is the form kümme takes before minuti pärast.`,
  },
};

/** A time's words with the hour it is named after in the stage's hue. Full hours stay plain. */
function Said({ time }: { time: ClockTime }) {
  return (
    <>
      {timeParts(time).map((part, i) =>
        part.hour && time.minute !== 0 ? (
          // oxlint-disable-next-line react/no-array-index-key -- a time's parts never reorder
          <span key={i} className="text-(--form)">
            {part.text}
          </span>
        ) : (
          // oxlint-disable-next-line react/no-array-index-key -- a time's parts never reorder
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

/** Turns a hand the short way round, so 55 to 00 moves forward rather than spinning back. */
function useTurn(degrees: number): number {
  const last = useRef(degrees);
  const turn = last.current + ((((degrees - last.current) % 360) + 540) % 360) - 180;
  useLayoutEffect(() => {
    last.current = turn;
  }, [turn]);
  return turn;
}

interface ClockProps extends Omit<React.SVGProps<SVGSVGElement>, "ref"> {
  /** No time draws both hands at twelve. */
  time: ClockTime | null;
  /** Fill the part of the hour that has gone, in the stage's hue. */
  wedge?: boolean;
  /** Hands follow a drag without easing. */
  still?: boolean;
  className?: string;
  /** What a screen reader hears; none hides the clock from it. */
  label?: string;
}

/** A clock face. Its hands ease to a new time; the hour hand creeps as the minutes pass. */
function Clock({ time, wedge, still, className, label, ...rest }: ClockProps) {
  const minuteTurn = useTurn(time ? time.minute * 6 : 0);
  const hourTurn = useTurn(time ? ((time.hour % 12) + time.minute / 60) * 30 : 0);
  const ticks = Array.from({ length: 12 }, (_, i) => (i * Math.PI) / 6);
  const ease = still ? "" : "transition-transform duration-700 ease-out";
  const minute = time?.minute ?? 0;
  const end = (minute / 60) * Math.PI * 2;
  return (
    <svg
      viewBox="0 0 120 120"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={clsx("shrink-0", className)}
      {...rest}
    >
      <circle cx="60" cy="60" r="55" className="fill-plate stroke-ink" strokeWidth="3" />
      {wedge && minute > 0 && (
        <path
          d={`M60 60 L60 10 A50 50 0 ${minute > 30 ? 1 : 0} 1 ${60 + 50 * Math.sin(end)} ${60 - 50 * Math.cos(end)} Z`}
          className="fill-(--form-soft)"
        />
      )}
      {ticks.map((a, i) => (
        <line
          key={a}
          x1={60 + (i % 3 === 0 ? 41 : 44) * Math.sin(a)}
          y1={60 - (i % 3 === 0 ? 41 : 44) * Math.cos(a)}
          x2={60 + 49 * Math.sin(a)}
          y2={60 - 49 * Math.cos(a)}
          className={i % 3 === 0 ? "stroke-ink-muted" : "stroke-ink-faint"}
          strokeWidth={i % 3 === 0 ? 3.5 : 2.5}
          strokeLinecap="round"
        />
      ))}
      <line
        x1="60"
        y1="60"
        x2="60"
        y2="33"
        className={clsx("stroke-ink", ease)}
        strokeWidth="5.5"
        strokeLinecap="round"
        style={{ transformOrigin: "60px 60px", transform: `rotate(${hourTurn}deg)` }}
      />
      <line
        x1="60"
        y1="60"
        x2="60"
        y2="17"
        className={clsx("stroke-(--form)", ease)}
        strokeWidth="3.5"
        strokeLinecap="round"
        style={{ transformOrigin: "60px 60px", transform: `rotate(${minuteTurn}deg)` }}
      />
      <circle cx="60" cy="60" r="4.5" className="fill-ink" />
    </svg>
  );
}

/** One hour from three to four in quarters, each a clock with the part of the hour gone filled in. */
function HourTrack() {
  const { t } = useLingui();
  const stops = [at(3, 0), at(3, 15), at(3, 30), at(3, 45), at(4, 0)];
  return (
    <Panel>
      <ul className="m-0 grid list-none grid-cols-5 gap-1.5 p-0 max-sm:grid-cols-1">
        {stops.map((time) => (
          <li key={timeClip(time)}>
            <TrackStop time={time} label={t`Play ${timeDigits(time)}, ${timeWords(time)}`} />
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function TrackStop({ time, label }: { time: ClockTime; label: string }) {
  const src = timeSrc(time);
  const playing = usePlaying(src);
  const { t } = useLingui();
  return (
    <button
      type="button"
      aria-label={label}
      data-playing={playing ? "" : undefined}
      onClick={() => void playSound(src)}
      className="learn-key grid h-full w-full cursor-pointer justify-items-center gap-1.5 rounded-tile bg-plate px-1.5 pt-3.5 pb-3 text-center hoverable:hover:bg-plate-hover max-sm:grid-cols-[auto_minmax(0,1fr)_auto] max-sm:items-center max-sm:justify-items-start max-sm:gap-3.5 max-sm:px-3.5 max-sm:py-2.5 max-sm:text-start"
    >
      <Clock
        time={time}
        wedge
        label={t`A clock at ${timeDigits(time)}`}
        className="size-16 max-sm:size-12"
      />
      <span className="grid gap-0.5 max-sm:justify-items-start">
        <b className="text-2xl/none font-semibold tabular-nums">{timeDigits(time)}</b>
        <small lang="et" className="text-sm leading-tight text-ink-secondary">
          <Said time={time} />
        </small>
      </span>
      <span className="sm:hidden">
        <PlayMark playing={playing} />
      </span>
    </button>
  );
}

/** What a time's words say about how it is counted. */
function HowItsSaid({ time }: { time: ClockTime }) {
  const next = timeDigits(at(nextHour(time.hour), 0));
  const struck = timeDigits(at(time.hour, 0));
  const ahead = 60 - time.minute;
  const past = time.minute;
  switch (time.minute) {
    case 0:
      return <Trans>On the hour: the number alone.</Trans>;
    case 15:
      return <Trans>A quarter of the way to {next}.</Trans>;
    case 30:
      return <Trans>Halfway to {next}.</Trans>;
    case 45:
      return <Trans>Three quarters of the way to {next}.</Trans>;
    case 5:
    case 10:
    case 20:
      return (
        <Trans>
          {past} minutes past {struck}.
        </Trans>
      );
    default:
      return (
        <Trans>
          In {ahead} minutes it’s {next}.
        </Trans>
      );
  }
}

/** The angle from the clock's centre to a pointer, in degrees from twelve, clockwise. */
function pointerAngle(svg: SVGSVGElement, x: number, y: number): number {
  const box = svg.getBoundingClientRect();
  const angle =
    (Math.atan2(x - (box.left + box.width / 2), -(y - (box.top + box.height / 2))) * 180) / Math.PI;
  return (angle + 360) % 360;
}

function ClockExplorer() {
  const { t } = useLingui();
  const [time, setTime] = useState<ClockTime>(at(3, 45));
  const [dragging, setDragging] = useState(false);
  const latest = useRef(time);
  latest.current = time;
  // Turning the clock only moves it; the time is heard when the learner presses play.
  const set = (next: ClockTime) => {
    latest.current = next;
    setTime(next);
  };
  const drag = (event: React.PointerEvent<SVGSVGElement>) => {
    const minute = nearestMinute(pointerAngle(event.currentTarget, event.clientX, event.clientY));
    const now = latest.current;
    if (now.minute === minute) return;
    latest.current = withMinute(now, minute);
    setTime(latest.current);
  };
  const stepper =
    "edge-lift grid size-10 cursor-pointer place-items-center rounded-full bg-plate text-ink transition-[background-color,scale] duration-150 active:scale-[0.94] hoverable:hover:bg-plate-hover";
  const digits = timeDigits(time);
  const words = timeWords(time);
  return (
    <Panel className="gap-5 p-5.5">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-6 max-sm:grid-cols-1 max-sm:justify-items-center max-sm:gap-4">
        {/* The dial is the slider: drag the minute hand, or use the arrow keys. */}
        <div
          role="slider"
          tabIndex={0}
          aria-label={t`Minute hand`}
          aria-valuemin={0}
          aria-valuemax={59}
          aria-valuenow={time.minute}
          aria-valuetext={`${digits}, ${words}`}
          onKeyDown={(event) => {
            const hour = { PageUp: nextHour(time.hour), PageDown: previousHour(time.hour) }[
              event.key
            ];
            const by = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key];
            if (!hour && !by) return;
            event.preventDefault();
            set(hour ? at(hour, time.minute) : stepMinute(time, by as 1 | -1));
          }}
          className="rounded-full focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-(--form)"
        >
          <Clock
            time={time}
            still={dragging}
            className={clsx(
              "block size-52 touch-none select-none max-sm:size-48",
              dragging ? "cursor-grabbing" : "cursor-grab",
            )}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              setDragging(true);
              drag(event);
            }}
            onPointerMove={(event) => {
              if (dragging) drag(event);
            }}
            onPointerUp={() => setDragging(false)}
            onPointerCancel={() => setDragging(false)}
          />
        </div>
        <div className="grid min-w-0 gap-1 max-sm:justify-items-center max-sm:text-center">
          <output
            aria-live="polite"
            className="text-[clamp(3rem,9vw,4.5rem)] leading-[0.95] font-semibold tracking-[-0.04em] tabular-nums"
          >
            {digits}
          </output>
          <p
            lang="et"
            className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[clamp(1.375rem,3.6vw,1.875rem)] leading-tight font-semibold tracking-tight max-sm:justify-center"
          >
            <span className="min-w-0 wrap-anywhere">
              <Said time={time} />
            </span>
            <PlayButton src={timeSrc(time)} label={t`Play ${digits}`} />
          </p>
          <p className="text-md text-ink-secondary">
            <HowItsSaid time={time} />
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={t`An hour earlier`}
            className={stepper}
            onClick={() => set(at(previousHour(time.hour), time.minute))}
          >
            <Minus aria-hidden="true" className="size-4.5" />
          </button>
          <span className="min-w-12 text-center text-sm font-medium text-ink-secondary">
            <Trans>Hour</Trans>
          </span>
          <button
            type="button"
            aria-label={t`An hour later`}
            className={stepper}
            onClick={() => set(at(nextHour(time.hour), time.minute))}
          >
            <Plus aria-hidden="true" className="size-4.5" />
          </button>
        </div>
        <Chips
          label={t`Minutes`}
          items={MINUTES.map((minute) => ({
            label: `:${String(minute).padStart(2, "0")}`,
            value: minute,
          }))}
          value={time.minute}
          onPick={(minute) => set(withMinute(time, minute))}
        />
      </div>
    </Panel>
  );
}

const HALVES = [at(7, 30), at(3, 30), at(12, 30), at(9, 30), at(4, 30), at(10, 30)];

/** Hear “pool …”, pick one of two half hours; the clock sets itself once it's answered. */
function HalfRound({ item, state, heard, answer, autoplay }: RoundProps<ClockTime>) {
  const { t } = useLingui();
  const { nudge, note } = useNudge();
  const round = state.status === "asking" || state.status === "answered" ? state.round : -1;
  const src = timeSrc(item);
  useAutoplay(src, autoplay, round);
  const done = state.status === "answered";
  const picked = done ? state.picked : null;
  const right = timeDigits(item);
  const trap = timeDigits(at(nextHour(item.hour), 30));
  const words = timeWords(item);
  const next = timeDigits(at(nextHour(item.hour), 0));
  return (
    <div className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-5.5 max-sm:grid-cols-1">
      <Clock
        time={done ? item : null}
        label={done ? t`A clock at ${right}` : t`A clock`}
        className="size-30 max-sm:size-26"
      />
      <div className="grid justify-items-start gap-3">
        <Listen src={src} onPlay={heard} />
        {note}
        <fieldset className="m-0 grid w-full max-w-[340px] min-w-0 grid-cols-2 gap-2 border-0 p-0">
          <legend className="sr-only">{t`Times`}</legend>
          {(item.hour % 2 ? [right, trap] : [trap, right]).map((digits) => (
            <Answer
              key={digits}
              big
              label={digits}
              mark={
                !done ? undefined : digits === right ? "right" : digits === picked ? "wrong" : "out"
              }
              onPick={() => {
                if (done) return;
                if (state.status === "asking" && !state.heard) return nudge();
                answer(digits, digits === right);
              }}
            />
          ))}
        </fieldset>
        {done && (
          <Feedback right={state.right}>
            <Trans>
              It’s {right}: <b lang="et">{words}</b> is halfway to {next}.
            </Trans>
          </Feedback>
        )}
      </div>
    </div>
  );
}

const kindOf = ({ minute }: ClockTime) =>
  minute === 0
    ? "hour"
    : minute === 30
      ? "pool"
      : minute === 15
        ? "veerand"
        : minute === 45
          ? "kolmveerand"
          : minute < 30
            ? "labi"
            : "parast";

const IN_WORDS = [
  at(11, 0),
  at(5, 30),
  at(8, 15),
  at(10, 45),
  at(4, 10),
  at(7, 20),
  at(1, 50),
  at(9, 40),
];

const PAST_OR_TO = [at(9, 10), at(5, 20), at(8, 5), at(6, 50), at(2, 40), at(11, 55)];

const otherHour = (hour: number, by: number) => ((hour - 1 + by + 12) % 12) + 1;

export const confusedWith = ({ hour, minute }: ClockTime): ClockTime[] =>
  minute < 30
    ? [at(otherHour(hour, -1), (60 - minute) as Minute), at(otherHour(hour, 1), minute)]
    : [at(otherHour(hour, 1), (60 - minute) as Minute), at(hour, (60 - minute) as Minute)];

type PastToItem = ChoiceItem & { pair: readonly [string, string] };

export const pastToRun = (items: readonly PastToItem[], pinned?: PastToItem): PastToItem[] =>
  eachPairFirst(items, pinned).map((item) =>
    item === pinned ? item : { ...item, options: shuffle(item.options) },
  );

const WRITTEN = [at(9, 30), at(2, 15), at(12, 45), at(9, 5), at(11, 20), at(7, 55)];

/** The times the listening quiz asks, chosen for the mix-ups learners make. */
const HEARD = [
  at(5, 15),
  at(8, 30),
  at(3, 30),
  at(10, 15),
  at(2, 45),
  at(11, 45),
  at(4, 10),
  at(7, 20),
  at(6, 50),
  at(1, 40),
  at(9, 0),
  at(12, 30),
];

const minutes = (time: ClockTime) => (time.hour % 12) * 60 + time.minute;
const earlier = (time: ClockTime) => at(previousHour(time.hour), time.minute);

/**
 * The answer, the same minutes an hour later (reading “pool neli” as 4:30), the time its words
 * mirror (veerand and kolmveerand, läbi and pärast) and the same minutes an hour earlier.
 */
function choicesFor(time: ClockTime): { choices: ClockTime[]; trap: ClockTime } {
  const mirror: Partial<Record<number, ClockTime>> = {
    15: at(time.hour, 45),
    45: at(time.hour, 15),
    5: at(earlier(time).hour, 55),
    10: at(earlier(time).hour, 50),
    20: at(earlier(time).hour, 40),
    40: at(nextHour(time.hour), 20),
    50: at(nextHour(time.hour), 10),
    55: at(nextHour(time.hour), 5),
    0: at(earlier(time).hour, 30),
  };
  const later = at(nextHour(time.hour), time.minute);
  const all = [time, later, mirror[time.minute], earlier(time)];
  const seen = new Set<string>();
  // A fixed order per round, the same on the server and in the browser, that puts the answer in a
  // different place from round to round. Clock order would always put it between the hours out.
  const rank = (each: ClockTime) => (minutes(each) * 7 + minutes(time) * 13) % 31;
  const choices = all
    .filter((each): each is ClockTime => {
      if (!each || seen.has(timeClip(each))) return false;
      seen.add(timeClip(each));
      return true;
    })
    .sort((a, b) => rank(a) - rank(b));
  return { choices, trap: time.minute === 30 ? later : (mirror[time.minute] ?? later) };
}

/** An answer's clock is a picture of its digits, so a screen reader hears only the digits. */
function ClockChoice({ time }: { time: ClockTime }) {
  return (
    // The clock above the digits keeps the card narrow; `Answer` keeps the end clear for the mark.
    <span className="grid justify-items-start gap-1.5">
      <Clock time={time} className="size-12" />
      <span className="tabular-nums">{timeDigits(time)}</span>
    </span>
  );
}

const TYPED = [
  at(9, 15),
  at(6, 0),
  at(2, 30),
  at(1, 45),
  at(7, 30),
  at(2, 10),
  at(11, 50),
  at(4, 20),
  at(12, 15),
  at(8, 40),
];

export function KellLesson() {
  const { t } = useLingui();
  const genitive = lessonBySlug("omastav")?.n;
  const partitive = lessonBySlug("osastav")?.n;
  const numbers = lessonBySlug("numbrid")?.n;

  const heardItems = useMemo(
    () =>
      HEARD.map((time): ChoiceItem & { trap: ClockTime } => {
        const { choices, trap } = choicesFor(time);
        const words = timeWords(time);
        const digits = timeDigits(time);
        return {
          src: timeSrc(time),
          answer: timeClip(time),
          trap,
          options: choices.map((each) => ({
            id: timeClip(each),
            label: <ClockChoice time={each} />,
          })),
          explain: (
            <Trans>
              It’s {digits}: <b lang="et">{words}</b>.
            </Trans>
          ),
        };
      }),
    [],
  );
  const wordItems = useMemo<(FormItem & { pair: readonly [string, string] })[]>(
    () =>
      IN_WORDS.map((time) => ({
        base: timeDigits(time),
        cue: t`in words`,
        answers: [timeWords(time), `kell on ${timeWords(time)}`],
        src: timeSrc(time),
        said: timeSentence(time),
        pair: [kindOf(time), timeClip(time)] as const,
      })),
    [t],
  );

  const pastToItems = useMemo<PastToItem[]>(
    () =>
      PAST_OR_TO.map((time, i) => {
        const three = [time, ...confusedWith(time)].map((each) => ({
          id: timeClip(each),
          label: timeDigits(each),
        }));
        const turn = i % 3;
        return {
          src: timeSrc(time),
          answer: timeClip(time),
          pair: [time.minute < 30 ? "labi" : "parast", timeClip(time)] as const,
          options: [...three.slice(turn), ...three.slice(0, turn)],
          explain: (
            <Trans>
              It’s {timeDigits(time)}: <b lang="et">{timeWords(time)}</b>.
            </Trans>
          ),
        };
      }),
    [],
  );

  const writtenItems = useMemo<(SentenceItem & { pair: readonly [string, string] })[]>(
    () =>
      WRITTEN.map((time) => ({
        kind: "dictation" as const,
        id: `write-${timeClip(time)}`,
        src: timeSrc(time),
        answers: [timeSentence(time)],
        pair: [kindOf(time), timeClip(time)] as const,
      })),
    [],
  );

  const passageQuestions = useMemo<PassageQuestion[]>(
    () => [
      {
        id: "now",
        ask: t`What time is it now?`,
        options: [
          { id: "1230", label: "12:30" },
          { id: "130", label: "1:30" },
          { id: "230", label: "2:30" },
        ],
        answer: "130",
        line: 1,
      },
      { id: "work", kind: "truefalse", ask: t`Mari is at home now.`, answer: false, line: 2 },
      {
        id: "home",
        ask: t`Where is Mari at three?`,
        options: [
          { id: "home", label: t`At home` },
          { id: "work", label: t`At work` },
          { id: "cafe", label: t`In a café` },
        ],
        answer: "home",
        line: 3,
      },
      {
        id: "coffee",
        ask: t`When do they drink coffee?`,
        options: [
          { id: "415", label: "4:15" },
          { id: "345", label: "3:45" },
          { id: "315", label: "3:15" },
          { id: "445", label: "4:45" },
        ],
        answer: "315",
        line: 4,
      },
      {
        id: "bus",
        ask: t`When do they wait for the bus?`,
        options: [
          { id: "445", label: "4:45" },
          { id: "545", label: "5:45" },
          { id: "415", label: "4:15" },
          { id: "515", label: "5:15" },
        ],
        answer: "445",
        line: 5,
      },
    ],
    [t],
  );

  const typedItems = useMemo(
    () =>
      TYPED.map((time): TypedItem => ({
        src: timeSrc(time),
        answers: [timeDigits(time)],
        matches: (typed) => timeMatches(typed, time),
        prompt: t`Type the time`,
        said: timeSentence(time),
      })),
    [t],
  );

  return (
    <LessonView
      slug={SLUG}
      glossary={GLOSSARY}
      sub={
        <Trans>
          Ask the time and understand the answer. Halves and quarters count toward the hour that’s
          coming.
        </Trans>
      }
      facts={[
        <Trans key="m">18 minutes</Trans>,
        <Trans key="q">6 quizzes and a voice message</Trans>,
        <Trans key="l">Listening only, no microphone</Trans>,
      ]}
      words={[
        "mis kell on?",
        "kell",
        "pool",
        "veerand",
        "kolmveerand",
        "läbi",
        "pärast",
        "minutit",
      ]}
      recap={[
        <Trans key="1">
          Ask <b lang="et">Mis kell on?</b> The answer is <b lang="et">kell on</b> and the hour:{" "}
          <b lang="et">kell on kolm</b>.
        </Trans>,
        <Trans key="2">
          <b lang="et">Pool</b>, <b lang="et">veerand</b> and <b lang="et">kolmveerand</b> name the
          hour that’s coming: <b lang="et">pool neli</b> is 3:30.
        </Trans>,
        <Trans key="3">
          <b lang="et">Veerand neli</b> is a quarter of the way to four, 3:15.{" "}
          <b lang="et">Kolmveerand neli</b> is three quarters, 3:45.
        </Trans>,
        <Trans key="4">
          Minutes past count from the hour that has struck: <b lang="et">kümme minutit kolm läbi</b>
          , 3:10. Minutes to count down to the next: <b lang="et">kümne minuti pärast neli</b>,
          3:50.
        </Trans>,
      ]}
      sections={[
        {
          id: "hours",
          title: t`On the hour`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    To ask the time, say <Word w="Mis kell on?" /> Word for word, it’s “what clock
                    is?” The answer starts with <Word w="kell" /> too: <Word w="Kell on kolm" />,
                    it’s three o’clock.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    The hours are the numbers from lesson {numbers}. Tap one to hear it.
                  </Trans>
                </p>
              </Prose>
              <Panel>
                <Keys
                  label={t`The hours`}
                  columns={6}
                  phoneColumns={4}
                  items={Array.from({ length: 12 }, (_, i) => {
                    const time = at(i + 1, 0);
                    return {
                      label: String(i + 1),
                      sub: timeWords(time),
                      src: timeSrc(time),
                      label2: `${timeDigits(time)}, ${timeSentence(time)}`,
                    };
                  })}
                />
              </Panel>
            </>
          ),
        },
        {
          id: "pool",
          title: t`Half past: pool`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Pool" /> means half, and it looks ahead. <Word w="Pool neli" /> is
                    halfway to four, so it’s 3:30, not 4:30.
                  </Trans>
                </p>
                <p>
                  <Trans>The hour you hear is the one that’s coming. Tap a few and listen.</Trans>
                </p>
              </Prose>
              <Panel>
                <Keys
                  label={t`Half hours`}
                  columns={6}
                  phoneColumns={3}
                  items={[12, 2, 3, 6, 8, 11].map((hour) => {
                    const time = at(hour, 30);
                    return {
                      label: timeDigits(time),
                      sub: <Said time={time} />,
                      src: timeSrc(time),
                      label2: `${timeDigits(time)}, ${timeSentence(time)}`,
                    };
                  })}
                />
              </Panel>
            </>
          ),
        },
        {
          id: "half",
          title: t`Which half hour?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Pool names the coming hour, so the hour you hear is one ahead. Listen for the
                    hour, then step back half an hour.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="half"
                title={<Trans>What time is it?</Trans>}
                items={HALVES}
                rounds={4}
                both={(item) => [timeSrc(item), timeSrc(at(nextHour(item.hour), 30))]}
                recall={(item) => ({ label: timeWords(item), src: timeSrc(item) })}
                round={(props) => <HalfRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "quarters",
          title: t`Quarters: veerand and kolmveerand`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Quarters look ahead too. <Word w="Veerand" /> is a quarter, so{" "}
                    <Word w="veerand neli" /> is a quarter of the way to four: 3:15.{" "}
                    <Word w="Kolmveerand" /> is three quarters, so <Word w="kolmveerand neli" /> is
                    3:45.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Each clock fills in the part of the hour that has gone. Tap one to hear it.
                  </Trans>
                </p>
              </Prose>
              <HourTrack />
            </>
          ),
        },
        {
          id: "past",
          title: t`Minutes past: läbi`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Other minutes, up to twenty past, count from the hour that has struck.{" "}
                    <Word w="Kümme minutit kolm läbi" /> is, word for word, “ten minutes, three
                    passed”: 3:10. <Word w="Läbi" /> means through or past, and <Word w="minutit" />{" "}
                    is the partitive of <em>minut</em>, the form after a number; lesson {partitive}{" "}
                    explains it.
                  </Trans>
                </p>
              </Prose>
              <ListenRows
                lead="72px"
                items={[at(3, 5), at(3, 10), at(3, 20)].map((time) => ({
                  lead: timeDigits(time),
                  main: <Said time={time} />,
                  src: timeSrc(time),
                }))}
              />
            </>
          ),
        },
        {
          id: "to",
          title: t`Minutes to: pärast`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Before the hour, say how long until the next one.{" "}
                    <Word w="Kümne minuti pärast neli" /> is, word for word, “in ten minutes, four”:
                    3:50.
                  </Trans>
                </p>
                <p>
                  <Trans>
                    Here the number changes shape: <em>viis</em> becomes <em>viie</em>,{" "}
                    <em>kümme</em> becomes <em>kümne</em>, <em>kakskümmend</em> becomes{" "}
                    <em>kahekümne</em>. Learn these three as set phrases for now. Lesson {genitive}{" "}
                    explains the form.
                  </Trans>
                </p>
              </Prose>
              <ListenRows
                lead="72px"
                items={[at(3, 40), at(3, 50), at(3, 55)].map((time) => ({
                  lead: timeDigits(time),
                  main: <Said time={time} />,
                  src: timeSrc(time),
                }))}
              />
            </>
          ),
        },
        {
          id: "clock",
          title: t`Turn the clock`,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Drag the minute hand or pick the minutes, then tap play to hear the time. The
                    hour a time is named after lights up.
                  </Trans>
                </p>
              </Prose>
              <ClockExplorer />
            </>
          ),
        },
        {
          id: "hear",
          title: t`Which clock?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Listen and pick the clock. The others are an hour out, or another time named
                    after the same hour, such as 3:15 and 3:45.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="which-clock"
                title={<Trans>Which clock did you hear?</Trans>}
                items={heardItems}
                rounds={8}
                both={(item) => [item.src, timeSrc(item.trap)]}
                recall={(item) => {
                  const time = HEARD.find((each) => timeClip(each) === item.answer) as ClockTime;
                  return { label: timeWords(time), src: item.src };
                }}
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "type",
          title: t`Type the time`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>Listen and type the time in digits, such as 3:30 or 3.30.</Trans>
                </p>
              </Prose>
              <Quiz
                id="typed-time"
                title={<Trans>Type the time you hear</Trans>}
                items={typedItems}
                rounds={6}
                verdict={(share): ReactNode =>
                  share === 1 ? (
                    <Trans>Every one, by ear.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Most of them. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>
                      Listen for pool, veerand, kolmveerand, läbi or pärast. Each tells you which
                      hour to count from.
                    </Trans>
                  )
                }
                recall={(item) => ({ label: item.answers[0] ?? "", src: item.src })}
                round={(props) => <TypedRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "past-or-to",
          title: t`Läbi or pärast?`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    <Word w="Läbi" /> counts on from the hour that has struck; <Word w="pärast" />{" "}
                    counts down to the hour that’s coming. Mix them up and the time comes out wrong
                    by up to forty minutes. Listen, then pick the time.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="past-or-to"
                title={<Trans>Which time did you hear?</Trans>}
                items={pastToItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Play the ones you missed once more.</Trans>
                  ) : (
                    <Trans>
                      Turn the clock above to a few minutes past and to, then try again.
                    </Trans>
                  )
                }
                recall={(item) => ({
                  label: item.options.find((o) => o.id === item.answer)?.label as string,
                  src: item.src,
                })}
                order={pastToRun}
                round={(props) => <ChoiceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "words",
          title: t`Write the time in words`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Each round shows a time in digits. Type how you say it, without{" "}
                    <span lang="et">kell on</span>.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="time-words"
                title={<Trans>Type the time in words</Trans>}
                items={wordItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six, every word spelled right.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>Nearly. Check which hour each one names.</Trans>
                  ) : (
                    <Trans>Turn the clock above once more, then try again.</Trans>
                  )
                }
                recall={formRecall}
                order={eachPairFirst}
                round={(props) => <FormRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "write",
          title: t`Write what you hear`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Hear a time and write the whole sentence. With <span lang="et">läbi</span>, the
                    minutes are <span lang="et">viis</span>, <span lang="et">kümme</span> or{" "}
                    <span lang="et">kakskümmend minutit</span>; with <span lang="et">pärast</span>,{" "}
                    <span lang="et">viie</span>, <span lang="et">kümne</span> or{" "}
                    <span lang="et">kahekümne minuti</span>.
                  </Trans>
                </p>
              </Prose>
              <Quiz
                id="write-times"
                title={<Trans>Write the sentence</Trans>}
                items={writtenItems}
                rounds={6}
                verdict={(share) =>
                  share === 1 ? (
                    <Trans>All six, every word in its place.</Trans>
                  ) : share >= 0.7 ? (
                    <Trans>
                      Nearly. Hear the ones you missed below, then try again with Slower.
                    </Trans>
                  ) : (
                    <Trans>Try again, and tap Slower before you write each sentence.</Trans>
                  )
                }
                recall={sentenceRecall}
                order={eachPairFirst}
                round={(props) => <SentenceRound {...props} />}
              />
            </>
          ),
        },
        {
          id: "listen",
          title: t`Listening: a message from Mari`,
          quiz: true,
          children: (
            <>
              <Prose>
                <p>
                  <Trans>
                    Mari leaves Jaan a message about her afternoon. Without{" "}
                    <span lang="et">on</span>, <Word w="kell kuus" /> says when: at six. Listen for
                    each time.
                  </Trans>
                </p>
              </Prose>
              <Listening
                id="mari-times"
                title={<Trans>Listen: a message from Mari</Trans>}
                clip="p-mari"
                sentences={KELL_PASSAGE}
                questions={passageQuestions}
              />
            </>
          ),
        },
      ]}
    />
  );
}

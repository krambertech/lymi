import { Trans, useLingui } from "@lingui/react/macro";
import { captureAnalytics } from "@lymi/client/analytics";
import { clsx } from "clsx";
import { ArrowRight, Check, Ear, RotateCcw, Sparkles, X } from "lucide-react";
import {
  Fragment,
  type ReactNode,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { playInTurn, playSound, usePlaying } from "../../lib/learn/player";
import {
  type QuizState,
  quizReducer,
  rightCount,
  shuffledRun,
  startQuiz,
  typedMatches,
} from "../../lib/learn/quiz";
import { Button } from "../Button";
import { SectionContext, useLesson } from "./lesson-context";
import { Listen } from "./Sound";

/** What a round shows once it is answered: right or not, and a line on why. */
export function Feedback({ right, children }: { right: boolean; children?: ReactNode }) {
  const Icon = right ? Check : X;
  return (
    <p
      className={clsx("flex items-start gap-2 font-medium", right ? "text-success" : "text-danger")}
    >
      <Icon aria-hidden="true" className="mt-1 size-4 shrink-0" strokeWidth={2.5} />
      <span>
        {right ? <Trans>Right.</Trans> : <Trans>Not this one.</Trans>}{" "}
        {children && <span className="font-normal text-ink-secondary">{children}</span>}
      </span>
    </p>
  );
}

type Mark = "right" | "wrong" | "out" | undefined;

/** One answer to pick. Once a round is answered it shows right or wrong with a badge in its corner. */
export function Answer(props: {
  label: ReactNode;
  sub?: ReactNode;
  mark: Mark;
  big?: boolean;
  lang?: string;
  className?: string;
  onPick: () => void;
}) {
  const { label, sub, mark, big, lang = "et", className, onPick } = props;
  const { t } = useLingui();
  return (
    <button
      type="button"
      onClick={onPick}
      aria-disabled={mark !== undefined || undefined}
      data-mark={mark === "right" || mark === "wrong" ? mark : undefined}
      className={clsx(
        "learn-answer relative flex cursor-pointer flex-col gap-0.5 rounded-tile border border-edge-strong bg-plate text-start transition-[background-color,border-color,opacity,scale] duration-150",
        // The end padding keeps the label clear of the mark in the corner.
        big ? "min-w-24 items-center px-5 py-2.5" : "items-start py-3 ps-3.5 pe-9",
        mark === undefined && "active:scale-[0.98] hoverable:hover:bg-plate-hover",
        mark !== undefined && "cursor-default",
        mark === "out" && "opacity-50",
        className,
      )}
    >
      <b
        lang={lang}
        className={clsx("font-semibold tracking-tight", big ? "text-3xl" : "text-2xl")}
      >
        {label}
      </b>
      {sub && <small className="text-sm text-ink-muted">{sub}</small>}
      {(mark === "right" || mark === "wrong") && (
        <span
          role="img"
          aria-label={mark === "right" ? t`Right answer` : t`Your answer`}
          className={clsx(
            "absolute grid size-5 place-items-center rounded-full text-plate",
            mark === "right" ? "bg-success" : "bg-danger",
            big ? "-end-2 -top-2 ring-3 ring-plate" : "end-2.5 top-2.5",
          )}
        >
          {mark === "right" ? (
            <Check aria-hidden="true" className="size-3" strokeWidth={3.2} />
          ) : (
            <X aria-hidden="true" className="size-3" strokeWidth={3.2} />
          )}
        </span>
      )}
    </button>
  );
}

export interface RoundProps<Item> {
  item: Item;
  state: QuizState;
  /** The round's sound has been played. */
  heard: () => void;
  answer: (picked: string, right: boolean) => void;
  /** The round opened by itself from Next, so its sound should play now. */
  autoplay: boolean;
}

interface QuizProps<Item> {
  /** For analytics: lowercase letters, digits and hyphens. */
  id: string;
  title: ReactNode;
  items: readonly Item[];
  rounds?: number;
  /** The line under the score. */
  verdict?: (share: number) => ReactNode;
  /** What each round asked, to hear again on the score. */
  recall?: (item: Item) => Recall;
  /** Sounds to play side by side after an answer, under “Hear both”. */
  both?: (item: Item) => readonly string[] | undefined;
  round: (props: RoundProps<Item>) => ReactNode;
  /** A run's order, `pinned` first when given; the first run pins the first item so the page renders the same. */
  order?: (items: readonly Item[], pinned?: Item) => readonly Item[];
}

/**
 * Anything that marks the learner right or wrong: a white card with its title on the stage's
 * band, one Listen per round, the answers, a line of feedback, Next, and a score at the end.
 */
export function Quiz<Item>({
  id,
  title,
  items,
  rounds,
  verdict,
  both,
  recall,
  round,
  order = shuffledRun,
}: QuizProps<Item>) {
  const { t } = useLingui();
  const { slug, finishSection } = useLesson();
  const section = useContext(SectionContext);
  const total = Math.min(rounds ?? items.length, items.length);
  const [state, dispatch] = useReducer(quizReducer, total, startQuiz);
  const [list, setList] = useState<readonly Item[]>(items);
  const [autoplay, setAutoplay] = useState(false);
  const nextRef = useRef<HTMLButtonElement>(null);
  const againRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const restarted = useRef(false);

  // Shuffled after the page loads; the first round stays first so the server's page matches.
  useEffect(() => {
    setList(order(items, items[0]));
  }, [items, order]);

  const finished = state.status === "finished" || (total === 1 && state.status === "answered");
  const reported = useRef(false);
  useEffect(() => {
    if (!finished || reported.current) return;
    reported.current = true;
    captureAnalytics("learn_quiz_finished", {
      lesson: slug,
      quiz: id,
      right: rightCount(state),
      total,
    });
    if (section) finishSection(section);
  }, [finished, state, slug, id, total, section, finishSection]);
  // Focus follows the quiz: Next after an answer, Try again at the score, and Listen when a new
  // round opens from Next or Try again, unless the round already focused something (the typed input).
  const advanced = useRef(false);
  useEffect(() => {
    if (state.status === "answered" && total > 1) nextRef.current?.focus({ preventScroll: true });
    if (state.status === "finished") againRef.current?.focus({ preventScroll: true });
    if (state.status === "asking" && (restarted.current || advanced.current)) {
      const lost = !document.activeElement || document.activeElement === document.body;
      if (restarted.current || lost)
        // A typed round's field comes first, so a phone opens its keyboard.
        bodyRef.current
          ?.querySelector<HTMLElement>("input:not([readonly]), button")
          ?.focus({ preventScroll: true });
      restarted.current = false;
      advanced.current = false;
    }
  }, [state.status, total]);

  // One live region for the whole quiz, so a screen reader hears each mark and the score.
  const right = rightCount(state);
  const announcement =
    state.status === "finished"
      ? t`${right} of ${total} right`
      : state.status === "answered"
        ? state.right
          ? t`Right.`
          : t`Not this one.`
        : "";
  const roundNumber = state.status === "finished" ? total : state.round + 1;

  const item = state.status === "finished" ? undefined : list[state.round];
  const extra = item && state.status === "answered" ? both?.(item) : undefined;

  return (
    <div className="learn-quiz grid grid-cols-1 overflow-hidden rounded-xl bg-plate max-sm:-mx-1">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-(--tray) px-5 py-3.5 max-sm:px-4">
        <h3 className="text-lg font-medium">{title}</h3>
        {total > 1 && (
          <>
            <Dots state={state} total={total} />
            <span className="sr-only">
              <Trans>
                Round {roundNumber} of {total}
              </Trans>
            </span>
          </>
        )}
      </div>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <div
        ref={bodyRef}
        className="grid grid-cols-1 justify-items-start gap-4 px-5 pt-5 pb-5 max-sm:px-4"
      >
        {state.status === "finished" ? (
          <>
            <Score
              right={rightCount(state)}
              total={total}
              verdict={verdict}
              results={state.results}
              recalled={list.slice(0, total).map((item) => recall?.(item))}
            />
            <Button
              ref={againRef}
              onClick={() => {
                reported.current = false;
                restarted.current = true;
                setList(order(items));
                setAutoplay(false);
                dispatch({ type: "restarted" });
              }}
            >
              <RotateCcw aria-hidden="true" data-icon="inline-start" />
              <Trans>Try again</Trans>
            </Button>
          </>
        ) : (
          item !== undefined && (
            <>
              {/* Each round mounts fresh, so nothing a round held carries into the next. */}
              <Fragment key={state.round}>
                {round({
                  item,
                  state,
                  heard: () => dispatch({ type: "heard" }),
                  answer: (picked, right) => dispatch({ type: "answered", picked, right }),
                  autoplay,
                })}
              </Fragment>
              {state.status === "answered" && (extra || total > 1) && (
                <div className="flex w-full flex-wrap items-center justify-end gap-2.5 pt-1">
                  {extra && (
                    <Button
                      onClick={() => void playInTurn(extra.map((src) => ({ src, key: src })))}
                    >
                      <Ear aria-hidden="true" data-icon="inline-start" />
                      <Trans>Hear both</Trans>
                    </Button>
                  )}
                  {total > 1 && (
                    <Button
                      ref={nextRef}
                      variant="primary"
                      onClick={() => {
                        setAutoplay(true);
                        advanced.current = true;
                        dispatch({ type: "next" });
                      }}
                    >
                      {state.round + 1 < total ? t`Next` : t`See how you did`}
                      <ArrowRight aria-hidden="true" data-icon="inline-end" />
                    </Button>
                  )}
                </div>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
}

/**
 * The card every marked part sits on: white, its title on the stage's band, an optional mark on the
 * band's end such as the round dots, and the body.
 */
export function QuizCard({
  title,
  aside,
  className,
  children,
}: {
  title: ReactNode;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "learn-quiz grid grid-cols-1 overflow-hidden rounded-xl bg-plate max-sm:-mx-1",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 bg-(--tray) px-5 py-3.5 max-sm:px-4">
        <h3 className="text-lg font-medium">{title}</h3>
        {aside}
      </div>
      <div className="grid grid-cols-1 justify-items-start gap-4 px-5 pt-5 pb-5 max-sm:px-4">
        {children}
      </div>
    </div>
  );
}

/** A word or number from a round, to hear again on the score. */
export interface Recall {
  label: string;
  /** Without a clip the chip only shows the word. */
  src?: string | undefined;
}

/** The score at the end of a marked part: how many were right, a line under it, and the run's words. */
export function Score({
  right,
  total,
  verdict,
  results,
  recalled,
}: {
  right: number;
  total: number;
  verdict?: ((share: number) => ReactNode) | undefined;
  results: readonly boolean[];
  recalled: readonly (Recall | undefined)[];
}) {
  const words = (
    <p className="text-xl font-semibold">
      <Trans>
        {right} of {total} right
      </Trans>
      {verdict && (
        <span className="mt-0.5 block text-md font-normal text-ink-secondary">
          {verdict(right / total)}
        </span>
      )}
    </p>
  );
  return <ScoreWords share={right / total} results={results} recalled={recalled} words={words} />;
}

/** The run's words as chips to hear again, the missed ones marked, with a mark for a full score. */
function ScoreWords({
  share,
  results,
  recalled,
  words,
}: {
  share: number;
  results: readonly boolean[];
  recalled: readonly (Recall | undefined)[];
  words: ReactNode;
}) {
  return (
    <div className="grid w-full gap-3.5">
      <div className="flex items-center gap-3">
        <span
          className={clsx(
            "learn-pop grid size-11 shrink-0 place-items-center rounded-full",
            share === 1 ? "bg-success text-plate" : "bg-(--tray) text-(--form)",
          )}
        >
          {share === 1 ? (
            <Sparkles aria-hidden="true" className="size-5.5" />
          ) : (
            <Ear aria-hidden="true" className="size-5.5" />
          )}
        </span>
        {words}
      </div>
      <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
        {recalled.map((word, i) =>
          word ? (
            // biome-ignore lint/suspicious/noArrayIndexKey: one chip per round, in order
            <li key={i} className="learn-pop" style={{ animationDelay: `${i * 60}ms` }}>
              <RecallChip word={word} ok={results[i] === true} />
            </li>
          ) : null,
        )}
      </ul>
    </div>
  );
}

function RecallChip({ word, ok }: { word: Recall; ok: boolean }) {
  const { src } = word;
  const playing = usePlaying(src ?? "");
  const Tag = src ? "button" : "span";
  return (
    <Tag
      {...(src ? { type: "button" as const, onClick: () => void playSound(src) } : {})}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border py-1 ps-2 pe-3 text-md font-medium transition-colors duration-150",
        ok
          ? "border-success/40 bg-success-soft text-ink"
          : "border-dashed border-danger bg-danger-soft text-ink",
        src && "cursor-pointer",
        playing && "ring-2 ring-(--form)",
      )}
    >
      {ok ? (
        <Check aria-hidden="true" className="size-3.5 text-success" strokeWidth={3} />
      ) : (
        <X aria-hidden="true" className="size-3.5 text-danger" strokeWidth={3} />
      )}
      <span lang="et">{word.label}</span>
    </Tag>
  );
}

function Dots({ state, total }: { state: QuizState; total: number }) {
  return (
    <ResultDots
      results={state.results}
      now={state.status === "finished" ? -1 : state.round}
      total={total}
    />
  );
}

/** A dot per round on a white pill: green right, red wrong, ringed for the one now. */
export function ResultDots({
  results,
  now,
  total,
}: {
  results: readonly (boolean | undefined)[];
  /** The round being answered, or -1. */
  now: number;
  total: number;
}) {
  return (
    <span
      aria-hidden="true"
      className="flex items-center gap-1.5 rounded-full bg-plate px-2.5 py-1.5"
    >
      {Array.from({ length: total }, (_, i) => {
        const result = results[i];
        return (
          <i
            // biome-ignore lint/suspicious/noArrayIndexKey: one dot per round, in order
            key={i}
            className={clsx(
              "size-2 rounded-full transition-colors duration-200",
              result === true ? "bg-success" : result === false ? "bg-danger" : "bg-edge-strong",
              result === undefined &&
                i === now &&
                "bg-ink-faint outline-2 outline-offset-2 outline-ink-muted",
            )}
          />
        );
      })}
    </span>
  );
}

/** “Listen first”, shown when an answer is picked before the sound has played. */
export function useNudge() {
  const [nudged, setNudged] = useState(false);
  const note = nudged ? (
    <p role="status" className="text-sm text-ink-muted">
      <Trans>Listen first.</Trans>
    </p>
  ) : null;
  return { nudge: () => setNudged(true), note };
}

/** Plays a round's sound as it opens from Next; the first round waits for the learner. */
export function useAutoplay(src: string, autoplay: boolean, round: number) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new round replays even when its clip is the last one's
  useEffect(() => {
    if (autoplay) void playSound(src);
  }, [autoplay, round, src]);
}

export interface ChoiceItem {
  src: string;
  answer: string;
  options: readonly { id: string; label: ReactNode; sub?: ReactNode }[];
  /** A line after the answer, such as what each word means. */
  explain?: ReactNode;
}

/** Listen, then pick one of two to four answers. */
export function ChoiceRound({ item, state, heard, answer, autoplay }: RoundProps<ChoiceItem>) {
  const { t } = useLingui();
  const { nudge, note } = useNudge();
  const round = state.status === "asking" || state.status === "answered" ? state.round : -1;
  useAutoplay(item.src, autoplay, round);
  const done = state.status === "answered";
  const picked = done ? state.picked : null;
  return (
    <>
      <Listen src={item.src} onPlay={heard} />
      {note}
      {/* Answers share a row and grow alike; one too long for its share takes the room it needs. */}
      <fieldset className="m-0 flex w-full min-w-0 flex-wrap gap-2 border-0 p-0">
        <legend className="sr-only">{t`Answers`}</legend>
        {item.options.map((option) => (
          <Answer
            key={option.id}
            className="grow basis-36"
            label={option.label}
            sub={option.sub}
            mark={
              !done
                ? undefined
                : option.id === item.answer
                  ? "right"
                  : option.id === picked
                    ? "wrong"
                    : "out"
            }
            onPick={() => {
              if (done) return;
              if (state.status === "asking" && !state.heard) return nudge();
              answer(option.id, option.id === item.answer);
            }}
          />
        ))}
      </fieldset>
      {done && <Feedback right={state.right}>{item.explain}</Feedback>}
    </>
  );
}

export interface GapItem {
  src: string;
  before: string;
  after: string;
  options: readonly string[];
  answer: string;
  explain?: ReactNode;
}

/** A word with one gap. Listen, then pick what fills it. */
export function GapRound({
  item,
  state,
  heard,
  answer,
  autoplay,
  listen = "first",
}: RoundProps<GapItem> & {
  /**
   * "first" asks the learner to hear the sentence, then fill the gap. "after" is for a gap the
   * sound would give away, such as an ending to work out from the grammar: the learner picks
   * first, and the sentence plays with the answer.
   */
  listen?: "first" | "after";
}) {
  const { t } = useLingui();
  const { nudge, note } = useNudge();
  const round = state.status === "asking" || state.status === "answered" ? state.round : -1;
  const pickFirst = listen === "after";
  useAutoplay(item.src, autoplay && !pickFirst, round);
  // biome-ignore lint/correctness/useExhaustiveDependencies: each round, including a restart, opens answerable
  useEffect(() => {
    if (pickFirst) heard();
  }, [pickFirst, round]);
  const done = state.status === "answered";
  const picked = done ? state.picked : null;
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    setSettled(false);
    if (!done || picked === item.answer) return;
    const timer = setTimeout(() => setSettled(true), 900);
    return () => clearTimeout(timer);
  }, [done, picked, item.answer]);
  const filled = !done ? null : settled ? item.answer : picked;
  const { before, after } = item;
  return (
    <>
      {(!pickFirst || done) && <Listen src={item.src} onPlay={heard} />}
      {note}
      {/* The words around the gap are Estonian, so a screen reader reads them as Estonian. */}
      <p className="sr-only">
        <Trans>
          <span lang="et">{before}</span> blank <span lang="et">{after}</span>
        </Trans>
      </p>
      <p
        lang="et"
        aria-hidden="true"
        className="flex items-baseline text-[clamp(2.75rem,9vw,4rem)] leading-none font-semibold tracking-tight"
      >
        {item.before}
        <span
          aria-hidden="true"
          data-mark={filled === null ? undefined : filled === item.answer ? "right" : "wrong"}
          className="learn-gap mx-0.5 inline-block min-w-[0.9ch] text-center"
        >
          {filled ?? " "}
        </span>
        {item.after}
      </p>
      <fieldset className="m-0 flex min-w-0 flex-wrap gap-2.5 border-0 p-0">
        <legend className="sr-only">{t`Fill the gap`}</legend>
        {item.options.map((option) => (
          <Answer
            key={option}
            big
            label={option}
            mark={
              !done
                ? undefined
                : option === item.answer
                  ? "right"
                  : option === picked
                    ? "wrong"
                    : "out"
            }
            onPick={() => {
              if (done) return;
              if (state.status === "asking" && !state.heard) return nudge();
              answer(option, option === item.answer);
              if (pickFirst) void playSound(item.src);
            }}
          />
        ))}
      </fieldset>
      {done && <Feedback right={state.right}>{item.explain}</Feedback>}
    </>
  );
}

export interface TypedItem {
  src: string;
  /** Every way of typing it that counts; the first is shown when it was missed. */
  answers: readonly string[];
  /** The sentence or words it was, shown after the answer. */
  said: ReactNode;
  /** Whether a typed answer counts, when `answers` can't list every way of typing it, as with times. */
  matches?: (typed: string) => boolean;
  /** The field's label and placeholder, when it asks for something other than a number. */
  prompt?: string;
}

/** Listen, then type. For numbers, prices and times. */
export function TypedRound({ item, state, heard, answer, autoplay }: RoundProps<TypedItem>) {
  const { t } = useLingui();
  const { nudge, note } = useNudge();
  const [value, setValue] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const round = state.status === "asking" || state.status === "answered" ? state.round : -1;
  // biome-ignore lint/correctness/useExhaustiveDependencies: each new round clears the field
  useEffect(() => {
    setValue("");
    if (autoplay) {
      void playSound(item.src);
      input.current?.focus({ preventScroll: true });
    }
  }, [round, autoplay, item.src]);
  const done = state.status === "answered";
  const expected = item.answers[0];
  return (
    <>
      <Listen
        src={item.src}
        onPlay={() => {
          heard();
          input.current?.focus({ preventScroll: true });
        }}
      />
      {note}
      <form
        className="flex w-full max-w-sm gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (done || !value.trim()) return input.current?.focus();
          if (state.status === "asking" && !state.heard) return nudge();
          answer(value, item.matches ? item.matches(value) : typedMatches(value, item.answers));
        }}
      >
        <input
          ref={input}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          readOnly={done}
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          aria-label={item.prompt ?? t`Type the number`}
          placeholder={item.prompt ?? t`Type the number`}
          data-mark={done ? (state.right ? "right" : "wrong") : undefined}
          className="learn-answer h-13 min-w-0 flex-1 rounded-tile border border-edge-strong bg-plate px-4 text-2xl font-semibold tabular-nums placeholder:text-md placeholder:font-normal placeholder:text-ink-muted focus:outline-2 focus:outline-offset-1 focus:outline-(--form)"
        />
        {!done && (
          <Button type="submit" variant="primary" size="lg" className="h-13">
            <Trans>Check</Trans>
          </Button>
        )}
      </form>
      {done && (
        <div className="grid gap-2">
          {state.right ? (
            <Feedback right />
          ) : (
            <p className="flex items-start gap-2 font-medium text-danger">
              <X aria-hidden="true" className="mt-1 size-4 shrink-0" strokeWidth={2.5} />
              <Trans>It was {expected}.</Trans>
            </p>
          )}
          <div lang="et" className="text-xl text-ink-secondary">
            {item.said}
          </div>
        </div>
      )}
    </>
  );
}

import { Trans, useLingui } from "@lingui/react/macro";
import { captureAnalytics } from "@lymi/client/analytics";
import { clsx } from "clsx";
import { Check, Pause, Play, RotateCcw, X } from "lucide-react";
import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { clipUrl, timingUrl } from "../../lib/learn/clips";
import {
  glossPieces,
  type SentenceBars,
  sentenceAt,
  sentenceBars,
  type Timing,
} from "../../lib/learn/passage";
import { loudness, playSound, stopSound, usePlaying } from "../../lib/learn/player";
import { Button } from "../Button";
import { SectionContext, useLesson } from "./lesson-context";
import { QuizCard, ResultDots } from "./Quiz";
import { Word } from "./Word";

const timings = new Map<string, Promise<Timing>>();

function loadTiming(url: string): Promise<Timing> {
  let pending = timings.get(url);
  if (!pending) {
    pending = fetch(url).then((response) => {
      if (!response.ok) throw new Error(`${url} answered ${response.status}`);
      return response.json() as Promise<Timing>;
    });
    pending.catch(() => timings.delete(url));
    timings.set(url, pending);
  }
  return pending;
}

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

/**
 * A passage recorded as one take: play and pause it, start from any sentence, and the time now.
 * `sentences` are its sentences, one timing mark each.
 */
export function usePassage(clip: string, sentences: number) {
  const { slug } = useLesson();
  const src = clipUrl(slug, clip);
  const key = `passage:${slug}:${clip}`;
  const [timing, setTiming] = useState<Timing | null>(null);
  const [t, setT] = useState(0);
  const [heard, setHeard] = useState(false);
  const until = useRef<number | null>(null);
  const playing = usePlaying(key);
  useEffect(() => {
    let live = true;
    loadTiming(timingUrl(slug, clip))
      .then((loaded) => live && setTiming(loaded))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [slug, clip]);
  // Until the timing loads, the passage still plays whole, drawn as even sentences.
  const marks = timing?.marks ?? Array.from({ length: sentences }, (_, i) => i);
  const duration = timing?.duration ?? sentences;
  const play = (from: number, to: number | null = null) => {
    setHeard(true);
    until.current = to;
    void playSound(
      src,
      key,
      (now) => {
        setT(now);
        if (until.current !== null && now >= until.current) stopSound();
      },
      from,
    ).then(() => setT((now) => (now >= duration - 0.4 ? duration : now)));
  };
  return {
    src,
    timing: { marks, duration },
    loaded: timing !== null,
    t,
    playing,
    heard,
    play,
    toggle() {
      if (playing) return stopSound();
      play(t >= duration - 0.4 ? 0 : t);
    },
    /** One sentence, from its mark to the next. */
    sentence(i: number) {
      play(marks[i] ?? 0, marks[i + 1] ?? null);
    },
    /** The sentence playing now, or -1. */
    now: playing ? sentenceAt(marks, t) : -1,
  };
}

export type PassageControl = ReturnType<typeof usePassage>;

/**
 * The passage's player: play or pause, and its sound drawn as bars, a group per sentence, lit up
 * to the time now. A tap on a group plays from that sentence; arrow keys step between sentences.
 */
export function PassagePlayer({ passage, label }: { passage: PassageControl; label: string }) {
  const { t } = useLingui();
  const { marks, duration } = passage.timing;
  const strip = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [groups, setGroups] = useState<SentenceBars[] | null>(null);
  useEffect(() => {
    const element = strip.current;
    if (!element) return;
    // Rounded so a small resize doesn't redraw every bar.
    const observer = new ResizeObserver(() => setWidth(Math.round(element.clientWidth / 8) * 8));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!passage.loaded || width === 0) return;
    let live = true;
    loudness(passage.src)
      .then((sound) => live && setGroups(sentenceBars(sound, passage.timing, width)))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [passage.loaded, passage.src, passage.timing, width]);
  const started = passage.t > 0 || passage.playing;
  const current = sentenceAt(marks, passage.t);
  const shown =
    groups ??
    marks.map((start, i) => ({ start, end: marks[i + 1] ?? duration, bars: [] as number[] }));
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "ArrowRight")
      passage.play(marks[Math.min(marks.length - 1, current + 1)] ?? 0);
    else if (event.key === "ArrowLeft") {
      // Back to this sentence's start, or the one before when it has only just begun.
      const into = passage.t - (marks[current] ?? 0);
      passage.play(marks[into > 1 ? current : Math.max(0, current - 1)] ?? 0);
    } else if (event.key === " " || event.key === "Enter") passage.toggle();
    else return;
    event.preventDefault();
  };
  const sentenceNumber = current + 1;
  const sentenceCount = marks.length;
  const time = clock(passage.t);
  return (
    <div className="flex w-full max-w-xl items-center gap-4">
      <button
        type="button"
        aria-label={passage.playing ? t`Pause` : t`Play`}
        onClick={passage.toggle}
        className={clsx(
          "grid size-12 shrink-0 cursor-pointer place-items-center rounded-full bg-(--form) text-plate transition-[scale,box-shadow] duration-150 active:scale-[0.95]",
          passage.playing && "shadow-[0_0_0_5px_var(--form-faint)]",
        )}
      >
        {passage.playing ? (
          <Pause aria-hidden="true" className="size-5 fill-current" />
        ) : (
          <Play aria-hidden="true" className="ms-0.5 size-5 fill-current" />
        )}
      </button>
      <div className="grid min-w-0 flex-1 gap-1">
        <div
          ref={strip}
          role="slider"
          tabIndex={0}
          aria-label={label}
          aria-valuemin={1}
          aria-valuemax={sentenceCount}
          aria-valuenow={sentenceNumber}
          aria-valuetext={t`Sentence ${sentenceNumber} of ${sentenceCount}, ${time}`}
          onKeyDown={onKey}
          className="relative flex h-10 gap-1.5 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ring)"
        >
          {/* The bars stand on a line, so a pause between words reads as quiet, not as missing. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-edge-strong"
          />
          {shown.map((group, i) => (
            <SentenceGroup
              // biome-ignore lint/suspicious/noArrayIndexKey: one group per sentence, in order
              key={i}
              group={group}
              lit={started ? passage.t : -1}
              onPick={() => passage.play(group.start)}
            />
          ))}
        </div>
        <div className="flex justify-between text-sm text-ink-muted tabular-nums">
          <span>{time}</span>
          <span>{clock(duration)}</span>
        </div>
      </div>
    </div>
  );
}

function SentenceGroup({
  group,
  lit,
  onPick,
}: {
  group: SentenceBars;
  /** Bars up to this time are lit; -1 lights none. */
  lit: number;
  onPick: () => void;
}) {
  const bars = group.bars.length ? group.bars : Array.from({ length: 8 }, () => 0);
  const span = group.end - group.start;
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden="true"
      onClick={onPick}
      style={{ flexGrow: span }}
      className="group relative flex min-w-0 basis-0 cursor-pointer items-center justify-between gap-[3px] overflow-hidden rounded-sm"
    >
      {bars.map((level, j) => {
        const at = group.start + ((j + 0.5) / bars.length) * span;
        return (
          <i
            // biome-ignore lint/suspicious/noArrayIndexKey: a bar's place in the sentence is its identity
            key={j}
            className={clsx(
              "block max-w-[3px] min-w-[2px] flex-1 rounded-full transition-colors duration-100",
              lit >= 0 && at <= lit
                ? "bg-(--form)"
                : "bg-ink-faint hoverable:group-hover:bg-ink-muted",
            )}
            // The square root evens out loud and quiet words, so a soft one still shows; a pause
            // stays a dot on the line.
            style={{ height: `${Math.round(10 + 60 * Math.sqrt(level))}%` }}
          />
        );
      })}
    </button>
  );
}

/** How an answer shows: picked and waiting for Check, or marked once checked. */
export type LetterMark = "chosen" | "right" | "wrong" | "out" | undefined;

const LETTERS = "ABCDEF";

/** An answer in the reader's language with its letter, for questions answered side by side. */
export function LetterAnswer({
  index,
  label,
  mark,
  onPick,
}: {
  index: number;
  label: ReactNode;
  mark: LetterMark;
  onPick: () => void;
}) {
  const { t } = useLingui();
  const letter = LETTERS[index] ?? "";
  const marked = mark === "right" || mark === "wrong" || mark === "out";
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={marked ? undefined : mark === "chosen"}
      aria-disabled={marked || undefined}
      data-mark={mark === "right" || mark === "wrong" ? mark : undefined}
      className={clsx(
        "learn-answer relative flex min-h-12 w-full items-center gap-3 rounded-tile border border-edge-strong bg-plate py-2 ps-2 pe-3 text-start text-lg font-medium transition-[background-color,border-color,opacity] duration-150",
        marked ? "cursor-default" : "cursor-pointer",
        !marked && mark !== "chosen" && "hoverable:hover:bg-plate-hover",
        mark === "chosen" && "learn-chosen",
        mark === "out" && "opacity-50",
      )}
    >
      <span
        aria-hidden="true"
        className={clsx(
          "grid size-8 shrink-0 place-items-center rounded-md text-sm font-semibold transition-colors duration-150",
          mark === "right"
            ? "bg-success text-plate"
            : mark === "wrong"
              ? "bg-danger text-plate"
              : mark === "chosen"
                ? "bg-(--form) text-plate"
                : "bg-plate-nested text-ink-secondary",
        )}
      >
        {mark === "right" ? (
          <Check className="size-4" strokeWidth={3} />
        ) : mark === "wrong" ? (
          <X className="size-4" strokeWidth={3} />
        ) : (
          letter
        )}
      </span>
      <span className="min-w-0">
        <span className="sr-only">{letter}. </span>
        {label}
        {mark === "right" && <span className="sr-only">, {t`right answer`}</span>}
        {mark === "wrong" && <span className="sr-only">, {t`your answer`}</span>}
      </span>
    </button>
  );
}

/** A question about a passage, answered in the reader's language. */
export interface PassageQuestion {
  /** Stable within the part; analytics never sees it. */
  id: string;
  ask: ReactNode;
  options: readonly { id: string; label: ReactNode }[];
  answer: string;
  /** The sentence that holds the answer, by its place in the passage from 0. */
  line: number;
}

interface QuestionsProps {
  /** For analytics: lowercase letters, digits and hyphens. */
  id: string;
  title: ReactNode;
  questions: readonly PassageQuestion[];
  /** What the card shows above the questions, such as the player. */
  top?: ReactNode;
  /** Why a pick waits, such as “Listen first.”; null when answers can be picked. */
  wait?: string | null;
  /** What shows under the score, given the sentences behind missed answers. */
  after?: (missed: ReadonlySet<number>) => ReactNode;
  onChecked?: (checked: boolean) => void;
}

/**
 * Every question about a passage at once, answers lettered, then one Check. The score and what the
 * part shows after it, such as the text, come once checked.
 */
export function PassageQuestions({
  id,
  title,
  questions,
  top,
  wait,
  after,
  onChecked,
}: QuestionsProps) {
  const { t } = useLingui();
  const { slug, finishSection } = useLesson();
  const section = useContext(SectionContext);
  const [chosen, setChosen] = useState<Readonly<Record<string, string>>>({});
  const [checked, setChecked] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const scoreRef = useRef<HTMLParagraphElement>(null);
  const total = questions.length;
  const right = questions.filter((q) => chosen[q.id] === q.answer).length;
  const missed = new Set(questions.filter((q) => chosen[q.id] !== q.answer).map((q) => q.line));
  const check = (done: boolean) => {
    setChecked(done);
    onChecked?.(done);
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: right and total are read at the Check
  useEffect(() => {
    if (!checked) return;
    scoreRef.current?.focus({ preventScroll: true });
    captureAnalytics("learn_quiz_finished", { lesson: slug, quiz: id, right, total });
    if (section) finishSection(section);
    // The score is reported once per Check.
  }, [checked]);
  return (
    <QuizCard
      title={title}
      aside={
        checked ? (
          <ResultDots
            results={questions.map((q) => chosen[q.id] === q.answer)}
            now={-1}
            total={total}
          />
        ) : undefined
      }
    >
      {top}
      <div className={clsx("grid w-full gap-6", top !== undefined && "border-t border-edge pt-5")}>
        {questions.map((q, n) => (
          <fieldset key={q.id} className="m-0 grid min-w-0 gap-2.5 border-0 p-0">
            <legend className="mb-2.5 text-lg font-medium">
              <span className="me-2 text-ink-muted tabular-nums">{n + 1}.</span>
              {q.ask}
            </legend>
            <div
              className="grid gap-2 sm:grid-cols-(--answers)"
              style={
                { "--answers": `repeat(${q.options.length}, minmax(0, 1fr))` } as CSSProperties
              }
            >
              {q.options.map((option, i) => (
                <LetterAnswer
                  key={option.id}
                  index={i}
                  label={option.label}
                  mark={
                    checked
                      ? option.id === q.answer
                        ? "right"
                        : option.id === chosen[q.id]
                          ? "wrong"
                          : "out"
                      : chosen[q.id] === option.id
                        ? "chosen"
                        : undefined
                  }
                  onPick={() => {
                    if (checked) return;
                    if (wait) return setNote(wait);
                    setNote(null);
                    setChosen((was) => ({ ...was, [q.id]: option.id }));
                  }}
                />
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      {note && (
        <p role="status" className="text-sm text-ink-muted">
          {note}
        </p>
      )}
      {checked ? (
        <>
          <p
            ref={scoreRef}
            tabIndex={-1}
            aria-live="polite"
            className="text-xl font-semibold outline-none"
          >
            <Trans>
              {right} of {total} right
            </Trans>
          </p>
          {after?.(missed)}
          <Button
            onClick={() => {
              setChosen({});
              check(false);
            }}
          >
            <RotateCcw aria-hidden="true" data-icon="inline-start" />
            <Trans>Try again</Trans>
          </Button>
        </>
      ) : (
        <div className="flex w-full justify-end">
          <Button
            variant="primary"
            onClick={() => {
              if (wait) return setNote(wait);
              if (Object.keys(chosen).length < total)
                return setNote(t`Answer every question first.`);
              setNote(null);
              check(true);
            }}
          >
            <Trans>Check</Trans>
          </Button>
        </div>
      )}
    </QuizCard>
  );
}

/**
 * Estonian text whose sentences can be heard again and whose glossary words open their cards.
 * `glossed` turns the cards on; until then the words are plain, so they can't give answers away.
 */
export function PassageText({
  sentences,
  passage,
  glossed,
  missed,
  big,
}: {
  sentences: readonly string[];
  passage?: PassageControl | undefined;
  glossed: boolean;
  /** Sentences behind missed answers, underlined. */
  missed?: ReadonlySet<number> | undefined;
  big?: boolean;
}) {
  const { glossary } = useLesson();
  return (
    <p
      lang="et"
      className={clsx(
        "max-w-[46ch] text-ink",
        big ? "text-2xl/[1.7] max-sm:text-xl/[1.7]" : "text-xl/[1.75] max-sm:text-lg/[1.75]",
      )}
    >
      {sentences.map((sentence, i) => {
        const text = glossed
          ? glossPieces(sentence, (word) => word in glossary).map((piece, j) =>
              "word" in piece ? (
                <Word
                  // biome-ignore lint/suspicious/noArrayIndexKey: a sentence's pieces never reorder
                  key={j}
                  w={piece.word}
                />
              ) : (
                piece.text
              ),
            )
          : sentence;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: a passage's sentences never reorder
          <span key={i}>
            <span
              className={clsx(
                "rounded-sm transition-colors duration-200 [box-decoration-break:clone]",
                passage?.now === i && "bg-(--form-soft)",
                missed?.has(i) &&
                  "underline decoration-danger decoration-2 underline-offset-[0.3em]",
              )}
            >
              {text}
            </span>{" "}
          </span>
        );
      })}
    </p>
  );
}

interface PassagePartProps {
  /** For analytics: lowercase letters, digits and hyphens. */
  id: string;
  title: ReactNode;
  /** The passage's recording, a clip of this lesson recorded as a passage. */
  clip: string;
  sentences: readonly string[];
  questions: readonly PassageQuestion[];
}

/**
 * Listen, then answer: the passage as one recording, heard as often as the learner likes, every
 * question at once, one Check, and then the text, the sentences behind missed answers marked.
 */
export function Listening({ id, title, clip, sentences, questions }: PassagePartProps) {
  const { t } = useLingui();
  const passage = usePassage(clip, sentences.length);
  return (
    <PassageQuestions
      id={id}
      title={title}
      questions={questions}
      wait={passage.heard ? null : t`Listen first.`}
      top={
        <>
          <p className="text-md text-ink-secondary">
            <Trans>Listen as many times as you like, then answer.</Trans>
          </p>
          <PassagePlayer passage={passage} label={t`The passage`} />
        </>
      }
      after={(missed) => (
        <div className="grid w-full gap-2 border-t border-edge pt-4">
          <p className="text-sm font-medium text-ink-muted">
            {missed.size > 0 ? (
              <Trans>What you heard. The sentences that held a missed answer are underlined.</Trans>
            ) : (
              <Trans>What you heard</Trans>
            )}
          </p>
          <PassageText sentences={sentences} passage={passage} glossed missed={missed} />
        </div>
      )}
    />
  );
}

/**
 * Read, then answer: the text on the page, heard on request when it has a recording; every question
 * at once, one Check. Its words open their cards once the questions are checked.
 */
export function Reading({
  id,
  title,
  clip,
  sentences,
  questions,
  by,
}: Omit<PassagePartProps, "clip"> & {
  clip?: string;
  /** Who wrote it, above the text: “Mari writes”. */
  by?: ReactNode;
}) {
  const [checked, setChecked] = useState(false);
  return (
    <div className="grid gap-5">
      <div className="grid gap-3">
        {by && <p className="text-sm font-medium text-ink-muted">{by}</p>}
        {clip ? (
          <ReadingText clip={clip} sentences={sentences} glossed={checked} />
        ) : (
          <PassageText sentences={sentences} glossed={checked} big />
        )}
        <p className="text-sm text-ink-muted">
          {checked ? (
            <Trans>Words in colour open their meaning.</Trans>
          ) : (
            <Trans>Word meanings open once you have answered.</Trans>
          )}
        </p>
      </div>
      <PassageQuestions id={id} title={title} questions={questions} onChecked={setChecked} />
    </div>
  );
}

function ReadingText({
  clip,
  sentences,
  glossed,
}: {
  clip: string;
  sentences: readonly string[];
  glossed: boolean;
}) {
  const { t } = useLingui();
  const passage = usePassage(clip, sentences.length);
  return (
    <>
      <PassageText sentences={sentences} passage={passage} glossed={glossed} big />
      <div className="pt-1">
        <PassagePlayer passage={passage} label={t`Hear it read`} />
      </div>
    </>
  );
}

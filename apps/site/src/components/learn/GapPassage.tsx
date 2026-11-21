import { Trans, useLingui } from "@lingui/react/macro";
import { captureAnalytics } from "@lymi/client/analytics";
import { clsx } from "clsx";
import { RotateCcw } from "lucide-react";
import {
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  type Fills,
  gapLine,
  placeWord,
  spacedAfter,
  spacedBefore,
  wordsLeft,
} from "../../lib/learn/passage";
import { Button } from "../Button";
import { SectionContext, useLesson } from "./lesson-context";
import { fromKeyboard, targetAt, useLift } from "./lift";
import { PassagePlayer, usePassage } from "./Passage";
import { Feedback, QuizCard, ResultDots } from "./Quiz";

/** One gap in a passage: the text before and after it, and the word that fills it. */
export interface GapItem {
  id: string;
  before: string;
  after: string;
  answer: string;
  /** For `pick`: the answer and the words offered with it. */
  options?: readonly string[];
  /** A line after the answer, such as the rule. */
  why?: ReactNode;
}

interface GapPassageProps {
  /** For analytics: lowercase letters, digits and hyphens. */
  id: string;
  title: ReactNode;
  gaps: readonly GapItem[];
  /**
   * `pick`: the open gap's words sit under the passage and each gap is marked at once, for a rule
   * met gap by gap. `drag`: one bank of every answer and some spare words, placed anywhere and
   * checked together, for a passage read as a whole.
   */
  mode: "pick" | "drag";
  /** For `drag`: words in the bank that fill no gap. */
  spare?: readonly string[];
  /** The whole passage recorded as one take, to hear once every gap is done. */
  clip?: string;
}

/** A passage with gaps to fill. Nothing plays until every gap is done; then it can be heard whole. */
export function GapPassage(props: GapPassageProps) {
  return props.mode === "pick" ? <PickGaps {...props} /> : <DragGaps {...props} />;
}

/** Reports the score and marks the section done once the passage is finished. */
function useFinished(id: string, done: boolean, right: number, total: number) {
  const { slug, finishSection } = useLesson();
  const section = useContext(SectionContext);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reported once each time it finishes
  useEffect(() => {
    if (!done) return;
    captureAnalytics("learn_quiz_finished", { lesson: slug, quiz: id, right, total });
    if (section) finishSection(section);
  }, [done]);
}

function Gap({
  item,
  n,
  word,
  state,
  marked,
  onClick,
  onPointerDown,
  handlers,
}: {
  item: GapItem;
  n: number;
  word: string | undefined;
  state: "open" | "filled" | "target" | "over" | undefined;
  /** Checked: right or wrong shows, and a wrong word is struck through beside the answer. */
  marked: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  onPointerDown?: ((event: PointerEvent<HTMLElement>) => void) | undefined;
  handlers?: Record<string, (event: PointerEvent<HTMLElement>) => void>;
}) {
  const { t } = useLingui();
  const right = word === item.answer;
  const answer = item.answer;
  const label = marked
    ? right
      ? t`Gap ${n}: ${word}, right`
      : t`Gap ${n}: ${word}, the answer is ${answer}`
    : word
      ? t`Gap ${n}: ${word}`
      : t`Gap ${n}, empty`;
  return (
    <button
      type="button"
      data-gap={item.id}
      aria-label={label}
      aria-pressed={!marked && !word ? state === "open" : undefined}
      onClick={onClick}
      onPointerDown={onPointerDown}
      {...handlers}
      data-state={marked ? undefined : state}
      data-mark={marked && word ? (right ? "right" : "wrong") : undefined}
      className={clsx(
        "learn-gap mx-0.5 inline-flex min-w-[3.4ch] items-baseline justify-center gap-1.5 rounded-t-sm px-1 align-baseline transition-colors duration-150 select-none",
        !marked && "cursor-pointer",
        !marked && word && onPointerDown && "cursor-grab touch-none",
      )}
    >
      {marked && word && !right && <s className="text-[0.7em]">{word}</s>}
      <span className={clsx(marked && !right && "text-success")}>
        {marked && !right ? item.answer : (word ?? "   ")}
      </span>
    </button>
  );
}

function PassageLine({
  gaps,
  gap,
}: {
  gaps: readonly GapItem[];
  gap: (item: GapItem, n: number) => ReactNode;
}) {
  return (
    <p
      lang="et"
      className="max-w-[34ch] text-2xl/[1.75] font-medium tracking-tight max-sm:text-xl/[1.75]"
    >
      {gaps.map((item, i) => (
        <span key={item.id}>
          {item.before}
          {spacedBefore(item.before) && " "}
          {gap(item, i + 1)}
          {spacedAfter(item.after) && " "}
          {item.after}
          {item.after && " "}
        </span>
      ))}
    </p>
  );
}

function HearIt({ clip }: { clip: string }) {
  const { t } = useLingui();
  const passage = usePassage(clip);
  return (
    <div className="grid w-full gap-2 border-t border-edge pt-4">
      <p className="text-sm font-medium text-ink-muted">
        <Trans>Hear the whole passage</Trans>
      </p>
      <PassagePlayer passage={passage} label={t`The passage`} />
    </div>
  );
}

function BigWord({ children }: { children: ReactNode }) {
  return <span className="text-2xl font-semibold tracking-tight">{children}</span>;
}

/** Gap by gap: the open gap's words under the passage, each gap marked as it is filled. */
function PickGaps({ id, title, gaps, clip }: GapPassageProps) {
  const { t } = useLingui();
  const [fills, setFills] = useState<Fills>({});
  const [open, setOpen] = useState<string | null>(gaps[0]?.id ?? null);
  const [last, setLast] = useState<GapItem | null>(null);
  const firstOpen = gaps.find((item) => !fills[item.id]) ?? null;
  const current = gaps.find((item) => item.id === open && !fills[item.id]) ?? firstOpen;
  const done = firstOpen === null;
  const right = gaps.filter((item) => fills[item.id] === item.answer).length;
  useFinished(id, done, right, gaps.length);
  const firstOption = useRef<HTMLButtonElement>(null);
  const scoreRef = useRef<HTMLParagraphElement>(null);
  const restarted = useRef(false);
  const currentId = current?.id;
  // Focus follows the next open gap's words, so a keyboard goes straight on, then the score once
  // the last gap is filled; Try again brings it back to the first gap's words.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs as the open gap changes
  useEffect(() => {
    if (done) scoreRef.current?.focus({ preventScroll: true });
    else if (last || restarted.current) firstOption.current?.focus({ preventScroll: true });
    restarted.current = false;
  }, [currentId, last, done]);
  const lastNumber = last ? gaps.indexOf(last) + 1 : 0;
  const total = gaps.length;
  const openNumber = current ? gaps.indexOf(current) + 1 : 0;
  return (
    <QuizCard
      title={title}
      aside={
        <ResultDots
          results={gaps.map((item) =>
            fills[item.id] ? fills[item.id] === item.answer : undefined,
          )}
          now={current ? gaps.indexOf(current) : -1}
          total={total}
        />
      }
    >
      <PassageLine
        gaps={gaps}
        gap={(item, n) => (
          <Gap
            item={item}
            n={n}
            word={fills[item.id]}
            marked={!!fills[item.id]}
            state={current?.id === item.id ? "open" : undefined}
            onClick={() => !fills[item.id] && setOpen(item.id)}
          />
        )}
      />
      <p aria-live="polite" className="sr-only">
        {/* The gap's number makes each mark new, so two right answers in a row are both read. */}
        {last
          ? fills[last.id] === last.answer
            ? t`Gap ${lastNumber}: right.`
            : t`Gap ${lastNumber}: not this one.`
          : ""}
      </p>
      {last && (
        <Feedback right={fills[last.id] === last.answer}>
          {last.why}{" "}
          <span lang="et" className="text-ink">
            {gapLine(last.before, last.answer, last.after)}
          </span>
        </Feedback>
      )}
      {current && (
        <div className="grid w-full gap-2.5 border-t border-edge pt-4">
          <p className="text-sm text-ink-muted">
            <Trans>
              Gap {openNumber} of {total}
            </Trans>
          </p>
          <fieldset className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0">
            <legend className="sr-only">{t`Pick the word for the gap`}</legend>
            {(current.options ?? [current.answer]).map((word, i) => (
              <button
                key={word}
                ref={i === 0 ? firstOption : undefined}
                type="button"
                lang="et"
                onClick={() => {
                  setFills((was) => ({ ...was, [current.id]: word }));
                  setLast(current);
                  setOpen(null);
                }}
                className="learn-answer min-w-20 cursor-pointer rounded-tile border border-edge-strong bg-plate px-4 py-2 transition-[background-color,scale] duration-150 active:scale-[0.97] hoverable:hover:bg-plate-hover"
              >
                <BigWord>{word}</BigWord>
              </button>
            ))}
          </fieldset>
        </div>
      )}
      {done && (
        <>
          <p ref={scoreRef} tabIndex={-1} className="text-xl font-semibold outline-none">
            <Trans>
              {right} of {total} right
            </Trans>
          </p>
          {clip && <HearIt clip={clip} />}
          <Button
            onClick={() => {
              restarted.current = true;
              setFills({});
              setLast(null);
              setOpen(gaps[0]?.id ?? null);
            }}
          >
            <RotateCcw aria-hidden="true" data-icon="inline-start" />
            <Trans>Try again</Trans>
          </Button>
        </>
      )}
    </QuizCard>
  );
}

/**
 * One bank of words for the whole passage. Drag a word to a gap, out of a gap, or between gaps; or
 * tap a word to put it in the open gap. Every gap is checked at once.
 */
function DragGaps({ id, title, gaps, spare = [], clip }: GapPassageProps) {
  const { t } = useLingui();
  const bank = [...gaps.map((item) => item.answer), ...spare].sort((a, b) =>
    a.localeCompare(b, "et"),
  );
  const [fills, setFills] = useState<Fills>({});
  const [open, setOpen] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [said, setSaid] = useState("");
  const [over, setOver] = useState<string | null>(null);
  const left = wordsLeft(bank, fills);
  const target = open ?? gaps.find((item) => !fills[item.id])?.id ?? null;
  const right = gaps.filter((item) => fills[item.id] === item.answer).length;
  const total = gaps.length;
  const scoreRef = useRef<HTMLParagraphElement>(null);
  const firstWord = useRef<HTMLButtonElement>(null);
  const restarted = useRef(false);
  useFinished(id, checked, right, total);
  // Focus goes to the score at Check, and back to the first word on Try again.
  useEffect(() => {
    if (checked) scoreRef.current?.focus({ preventScroll: true });
    else if (restarted.current) firstWord.current?.focus({ preventScroll: true });
    restarted.current = false;
  }, [checked]);

  const gapNumber = (gap: string) => gaps.findIndex((item) => item.id === gap) + 1;
  const move = (word: string, from: string, to: string | null) => {
    setFills((was) => placeWord(was, word, from, to));
    setNote(null);
    if (to) {
      const n = gapNumber(to);
      setSaid(t`${word} in gap ${n}`);
    } else setSaid(t`${word} taken out of the gap`);
  };
  /** A word tapped in the bank goes to the open gap; a tapped filled gap gives its word back. */
  const tap = (word: string, from: string) => {
    if (from === "bank") {
      if (target) move(word, "bank", target);
      setOpen(null);
    } else {
      move(word, from, null);
      setOpen(from);
    }
  };
  const { lift, start, handlers } = useLift<{ word: string; from: string }>({
    disabled: checked,
    onTap: ({ word, from }) => tap(word, from),
    onMove: (_, x, y) => setOver(targetAt(x, y, "data-gap")),
    onDrop: ({ word, from }, x, y) => {
      setOver(null);
      const to = targetAt(x, y, "data-gap");
      // Let go away from any gap: a word from a gap goes back to the bank; one from the bank stays.
      if (to || from !== "bank") move(word, from, to);
      setOpen(null);
    },
    onCancel: () => setOver(null),
  });

  return (
    <QuizCard
      title={title}
      className="select-none"
      aside={
        checked ? (
          <ResultDots
            results={gaps.map((item) => fills[item.id] === item.answer)}
            now={-1}
            total={total}
          />
        ) : undefined
      }
    >
      {!checked && (
        <div className="grid w-full gap-2 rounded-lg bg-plate-nested p-3">
          <p className="text-sm text-ink-muted">
            {spare.length > 0 ? (
              <Trans>Drag each word to its gap, or tap it. Some words are spare.</Trans>
            ) : (
              <Trans>Drag each word to its gap, or tap it.</Trans>
            )}
          </p>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {bank.map((word, i) => {
              // The bank keeps its places: a word in a gap leaves an outline where it was.
              const placedBefore = bank.slice(0, i).filter((w) => w === word).length;
              const inBank = left.filter((w) => w === word).length > placedBefore;
              const liftedHere =
                lift?.moved && lift.value.from === "bank" && lift.value.word === word && inBank;
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: the bank's order is fixed and a word can repeat
                <li key={`${word}-${i}`}>
                  {inBank ? (
                    <button
                      ref={i === 0 ? firstWord : undefined}
                      type="button"
                      lang="et"
                      onPointerDown={start({ word, from: "bank" })}
                      {...handlers}
                      onClick={(event) => fromKeyboard(event) && tap(word, "bank")}
                      className={clsx(
                        "learn-answer min-w-20 cursor-grab touch-none rounded-tile border border-edge-strong bg-plate px-4 py-2 select-none hoverable:hover:bg-plate-hover",
                        liftedHere && "border-dashed text-transparent",
                      )}
                    >
                      <BigWord>{word}</BigWord>
                    </button>
                  ) : (
                    <span
                      aria-hidden="true"
                      className="block rounded-tile border border-dashed border-edge-strong px-4 py-2 text-transparent select-none"
                    >
                      <BigWord>{word}</BigWord>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <PassageLine
        gaps={gaps}
        gap={(item, n) => {
          const word = fills[item.id];
          const liftedHere = lift?.moved && lift.value.from === item.id;
          return (
            <Gap
              item={item}
              n={n}
              word={liftedHere ? undefined : word}
              marked={checked}
              state={
                over === item.id
                  ? "over"
                  : lift?.moved
                    ? "target"
                    : word
                      ? "filled"
                      : target === item.id
                        ? "open"
                        : undefined
              }
              onPointerDown={word && !checked ? start({ word, from: item.id }) : undefined}
              handlers={word && !checked ? handlers : undefined}
              onClick={(event) => {
                if (checked) return;
                // A filled gap's taps come from its pointer handlers, or here from a keyboard.
                if (word) {
                  if (fromKeyboard(event)) tap(word, item.id);
                } else setOpen(item.id);
              }}
            />
          );
        }}
      />
      {lift?.moved && (
        <span
          aria-hidden="true"
          lang="et"
          className="learn-lifted rounded-tile border border-(--form) bg-plate px-4 py-2"
          style={{ left: lift.x - lift.dx, top: lift.y - lift.dy }}
        >
          <BigWord>{lift.value.word}</BigWord>
        </span>
      )}
      <p aria-live="polite" className="sr-only">
        {said}
      </p>
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
          {right < total && (
            <p className="text-md text-ink-secondary">
              <Trans>Where a word was wrong, the right one stands beside it.</Trans>
            </p>
          )}
          {clip && <HearIt clip={clip} />}
          <Button
            onClick={() => {
              restarted.current = true;
              setFills({});
              setChecked(false);
              setSaid("");
            }}
          >
            <RotateCcw aria-hidden="true" data-icon="inline-start" />
            <Trans>Try again</Trans>
          </Button>
        </>
      ) : (
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-muted">
            <Trans>Tap a filled gap to take its word back.</Trans>
          </p>
          <Button
            variant="primary"
            onClick={() => {
              if (Object.keys(fills).length < total) return setNote(t`Fill every gap first.`);
              setNote(null);
              setChecked(true);
            }}
          >
            <Trans>Check</Trans>
          </Button>
        </div>
      )}
    </QuizCard>
  );
}

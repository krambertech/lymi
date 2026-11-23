import { Trans, useLingui } from "@lingui/react/macro";
import { captureAnalytics } from "@lymi/client/analytics";
import { clsx } from "clsx";
import { Check, RotateCcw, X } from "lucide-react";
import {
  type CSSProperties,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useReducer,
  useRef,
} from "react";
import { onlyMarksDiffer } from "../../lib/learn/practice";
import {
  type Given,
  type MatchQuestion,
  markedItems,
  type PassageQuestion,
  type PickQuestion,
  questionsReducer,
  type ShortQuestion,
  startQuestions,
  statementKey,
  type TrueFalseQuestion,
} from "../../lib/learn/questions";
import { Button } from "../Button";
import { SectionContext, useLesson } from "./lesson-context";
import { LetterKeys, useLetters } from "./LetterKeys";
import { QuizCard, ResultDots } from "./Quiz";

export type LetterMark = "chosen" | "right" | "wrong" | "out" | undefined;

const LETTERS = "ABCDEF";

const isMarked = (mark: LetterMark) => mark === "right" || mark === "wrong" || mark === "out";

function optionMark(
  option: string,
  answer: string,
  given: string | undefined,
  checked: boolean,
): LetterMark {
  if (!checked) return option === given ? "chosen" : undefined;
  return option === answer ? "right" : option === given ? "wrong" : "out";
}

function MarkName({ mark }: { mark: LetterMark }) {
  const { t } = useLingui();
  if (mark === "right") return <span className="sr-only">, {t`right answer`}</span>;
  if (mark === "wrong") return <span className="sr-only">, {t`your answer`}</span>;
  return null;
}

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
  const letter = LETTERS[index] ?? "";
  const marked = isMarked(mark);
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
        <MarkName mark={mark} />
      </span>
    </button>
  );
}

function ChoiceChip({
  label,
  mark,
  onPick,
}: {
  label: ReactNode;
  mark: LetterMark;
  onPick: () => void;
}) {
  const marked = isMarked(mark);
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={marked ? undefined : mark === "chosen"}
      aria-disabled={marked || undefined}
      data-mark={mark === "right" || mark === "wrong" ? mark : undefined}
      className={clsx(
        "learn-answer relative inline-flex min-h-11 items-center justify-center rounded-tile border border-edge-strong bg-plate px-3.5 py-1.5 text-start text-md font-medium transition-[background-color,border-color,opacity] duration-150",
        marked ? "cursor-default" : "cursor-pointer",
        !marked && mark !== "chosen" && "hoverable:hover:bg-plate-hover",
        mark === "chosen" && "learn-chosen",
        mark === "out" && "opacity-50",
      )}
    >
      {(mark === "right" || mark === "wrong") && (
        <span
          aria-hidden="true"
          className={clsx(
            "absolute -end-1.5 -top-1.5 grid size-5 place-items-center rounded-full text-plate ring-2 ring-plate",
            mark === "right" ? "bg-success" : "bg-danger",
          )}
        >
          {mark === "right" ? (
            <Check className="size-3" strokeWidth={3.5} />
          ) : (
            <X className="size-3" strokeWidth={3.5} />
          )}
        </span>
      )}
      <span className="min-w-0">
        {label}
        <MarkName mark={mark} />
      </span>
    </button>
  );
}

interface FieldProps<Q> {
  question: Q;
  given: Given;
  checked: boolean;
  pick: (key: string, value: string) => void;
  type: (key: string, value: string) => void;
}

function PickField({ question, given, checked, pick }: FieldProps<PickQuestion>) {
  return (
    <div
      className="grid gap-2 sm:grid-cols-(--answers)"
      style={{ "--answers": `repeat(${question.options.length}, minmax(0, 1fr))` } as CSSProperties}
    >
      {question.options.map((option, i) => (
        <LetterAnswer
          key={option.id}
          index={i}
          label={option.label}
          mark={optionMark(option.id, question.answer, given[question.id], checked)}
          onPick={() => pick(question.id, option.id)}
        />
      ))}
    </div>
  );
}

function TrueFalseField({ question, given, checked, pick }: FieldProps<TrueFalseQuestion>) {
  const { t } = useLingui();
  const options = [
    { id: "true", label: t({ message: "True", context: "the statement is true" }) },
    { id: "false", label: t({ message: "False", context: "the statement is false" }) },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <ChoiceChip
          key={option.id}
          label={option.label}
          mark={optionMark(option.id, String(question.answer), given[question.id], checked)}
          onPick={() => pick(question.id, option.id)}
        />
      ))}
    </div>
  );
}

function ShortField({ question, given, checked, type }: FieldProps<ShortQuestion>) {
  const { t } = useLingui();
  const input = useRef<HTMLInputElement>(null);
  const value = given[question.id] ?? "";
  const [item] = markedItems(question);
  const right = item?.right(value) ?? false;
  const expected = question.answers[0] ?? "";
  const letter = useLetters(input, value, (next) => type(question.id, next));
  return (
    <div className="grid w-full max-w-md gap-2.5">
      <span className="relative grid">
        <input
          ref={input}
          value={value}
          onChange={(event) => type(question.id, event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
          readOnly={checked}
          lang="et"
          enterKeyHint="done"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          aria-label={t`One or two words`}
          aria-invalid={checked && !right ? true : undefined}
          placeholder={t`One or two words`}
          data-mark={checked ? (right ? "right" : "wrong") : undefined}
          className="learn-answer h-12 w-full min-w-0 rounded-tile border border-edge-strong bg-plate ps-4 pe-11 text-xl font-semibold placeholder:text-md placeholder:font-normal placeholder:text-ink-muted focus:outline-2 focus:outline-offset-1 focus:outline-(--form)"
        />
        {checked &&
          (right ? (
            <Check
              aria-hidden="true"
              className="absolute end-3.5 top-1/2 size-5 -translate-y-1/2 text-success"
              strokeWidth={2.5}
            />
          ) : (
            <X
              aria-hidden="true"
              className="absolute end-3.5 top-1/2 size-5 -translate-y-1/2 text-danger"
              strokeWidth={2.5}
            />
          ))}
        {checked && right && <MarkName mark="right" />}
      </span>
      {!checked && <LetterKeys onLetter={letter} />}
      {checked && !right && (
        <div className="grid gap-0.5">
          <p className="font-medium text-danger">
            <Trans>
              It was <b lang="et">{expected}</b>.
            </Trans>
          </p>
          {onlyMarksDiffer(value, question.answers) && (
            <p className="text-md text-ink-secondary">
              <Trans>Close: only the letters with marks are off.</Trans>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function MatchField({ question, given, checked, pick }: FieldProps<MatchQuestion>) {
  const id = useId();
  return (
    <div className="grid gap-4 sm:gap-3">
      {question.statements.map((statement) => {
        const key = statementKey(question, statement);
        return (
          <div
            key={statement.id}
            role="group"
            aria-labelledby={`${id}-${statement.id}`}
            className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4"
          >
            <p id={`${id}-${statement.id}`} className="text-md">
              {statement.label}
            </p>
            <div className="flex flex-wrap gap-2 sm:max-w-96 sm:justify-end">
              {question.options.map((option) => (
                <ChoiceChip
                  key={option.id}
                  label={option.label}
                  mark={optionMark(option.id, statement.answer, given[key], checked)}
                  onPick={() => pick(key, option.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function QuestionField({ question, ...field }: FieldProps<PassageQuestion>) {
  switch (question.kind) {
    case undefined:
    case "pick":
      return <PickField question={question} {...field} />;
    case "truefalse":
      return <TrueFalseField question={question} {...field} />;
    case "short":
      return <ShortField question={question} {...field} />;
    case "match":
      return <MatchField question={question} {...field} />;
  }
}

interface QuestionsProps {
  id: string;
  title: ReactNode;
  questions: readonly PassageQuestion[];
  top?: ReactNode;
  wait?: string | null;
  after?: (missed: ReadonlySet<number>) => ReactNode;
  onChecked?: (checked: boolean) => void;
}

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
  const [state, send] = useReducer(questionsReducer, startQuestions);
  const scoreRef = useRef<HTMLParagraphElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const restarted = useRef(false);
  const checked = state.status === "checked";
  const items = questions.flatMap(markedItems);
  const results = items.map((item) => item.right(state.given[item.key]));
  const total = items.length;
  const right = results.filter(Boolean).length;
  const missed = new Set(items.filter((_, i) => !results[i]).map((item) => item.line));
  // oxlint-disable react-hooks/exhaustive-deps -- right and total are read at the Check
  useEffect(() => {
    if (!checked) {
      if (restarted.current)
        list.current?.querySelector<HTMLElement>("button, input")?.focus({ preventScroll: true });
      restarted.current = false;
      return;
    }
    onChecked?.(true);
    scoreRef.current?.focus({ preventScroll: true });
    captureAnalytics("learn_quiz_finished", { lesson: slug, quiz: id, right, total });
    if (section) finishSection(section);
  }, [checked]);
  // oxlint-enable react-hooks/exhaustive-deps
  return (
    <QuizCard
      title={title}
      aside={checked ? <ResultDots results={results} now={-1} total={total} /> : undefined}
    >
      {top}
      <div
        ref={list}
        className={clsx("grid w-full gap-6", top !== undefined && "border-t border-edge pt-5")}
      >
        {questions.map((question, n) => (
          <fieldset key={question.id} className="m-0 grid min-w-0 gap-2.5 border-0 p-0">
            <legend className="mb-2.5 text-lg font-medium">
              <span className="me-1 text-ink-muted tabular-nums">{n + 1}.</span> {question.ask}
            </legend>
            <QuestionField
              question={question}
              given={state.given}
              checked={checked}
              pick={(key, value) =>
                send(wait ? { type: "held", note: wait } : { type: "answered", key, value })
              }
              type={(key, value) => send({ type: "answered", key, value })}
            />
          </fieldset>
        ))}
      </div>
      {state.status === "answering" && state.note && (
        <p role="status" className="text-sm text-ink-muted">
          {state.note}
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
              restarted.current = true;
              send({ type: "restarted" });
              onChecked?.(false);
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
            onClick={() =>
              send(
                wait
                  ? { type: "held", note: wait }
                  : {
                      type: "checked",
                      keys: items.map((item) => item.key),
                      unanswered: t`Answer every question first.`,
                    },
              )
            }
          >
            <Trans>Check</Trans>
          </Button>
        </div>
      )}
    </QuizCard>
  );
}

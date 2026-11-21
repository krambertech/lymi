import { Trans, useLingui } from "@lingui/react/macro";
import { captureAnalytics } from "@lymi/client/analytics";
import { clsx } from "clsx";
import { ArrowRight, RotateCcw, X } from "lucide-react";
import {
  type KeyboardEvent,
  type ReactNode,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { playSound } from "../../lib/learn/player";
import { sortedAll, sortReducer, sortResults, startSort } from "../../lib/learn/practice";
import { shuffle } from "../../lib/learn/quiz";
import { Button } from "../Button";
import { SectionContext, useLesson } from "./lesson-context";
import { fromKeyboard, targetAt, useLift } from "./lift";
import { Feedback, QuizCard, ResultDots, Score } from "./Quiz";

/** A bin to sort into: its label, such as an ending, and the rule a wrong word is shown. */
export interface SortBin {
  id: string;
  /** What the bin is, such as `-s`. Estonian unless `lang` says otherwise. */
  label: string;
  lang?: string | undefined;
  /** A short line under the label in the reader's language, such as “inside”. */
  hint?: ReactNode;
  /** Why a word belongs here, shown for each word put somewhere else. */
  rule?: ReactNode;
}

export interface SortItem {
  /** The Estonian word or phrase; also its id, so each is unique. */
  w: string;
  bin: string;
  src?: string | undefined;
  /** Why this word goes in its bin, when the bin's rule doesn't say it. */
  why?: ReactNode;
}

interface SortProps {
  /** For analytics: lowercase letters, digits and hyphens. */
  id: string;
  title: ReactNode;
  bins: readonly SortBin[];
  /** Six to ten words or phrases. */
  items: readonly SortItem[];
}

const POOL = "pool";

/**
 * Sort words into two or three labelled bins. Tap a word, then its bin, or drag it; a keyboard picks
 * with Enter and places with the bin's number. One Check marks every word, and a wrong one shows its
 * bin and the rule.
 */
export function Sort({ id, title, bins, items }: SortProps) {
  const { t } = useLingui();
  const { slug, finishSection } = useLesson();
  const section = useContext(SectionContext);
  const ids = items.map((item) => item.w);
  const [state, dispatch] = useReducer(sortReducer, ids, startSort);
  const [said, setSaid] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const checkRef = useRef<HTMLButtonElement>(null);
  const againRef = useRef<HTMLButtonElement>(null);
  const restarted = useRef(false);
  const byWord = new Map(items.map((item) => [item.w, item]));
  const binOf = new Map(bins.map((bin) => [bin.id, bin]));
  const answers = Object.fromEntries(items.map((item) => [item.w, item.bin]));
  const results = sortResults(state, answers);
  const right = results.filter(Boolean).length;
  const total = items.length;

  // Shuffled after the page loads, so the server's page and the first render match.
  // biome-ignore lint/correctness/useExhaustiveDependencies: shuffles once per set of words
  useEffect(() => {
    dispatch({ type: "restarted", items: shuffle(ids) });
  }, [items]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reported once each time it is checked
  useEffect(() => {
    if (!state.checked) return;
    captureAnalytics("learn_quiz_finished", { lesson: slug, quiz: id, right, total });
    if (section) finishSection(section);
    againRef.current?.focus({ preventScroll: true });
  }, [state.checked]);
  useEffect(() => {
    if (!state.checked && restarted.current) {
      restarted.current = false;
      rootRef.current?.querySelector<HTMLButtonElement>("[data-pool] button")?.focus();
    }
  }, [state.checked]);

  /** After a keyboard places a word, focus moves on to the next word, or to Check. */
  const focusNext = () =>
    requestAnimationFrame(() =>
      (
        rootRef.current?.querySelector<HTMLButtonElement>("[data-pool] button") ?? checkRef.current
      )?.focus({ preventScroll: true }),
    );

  const place = (word: string, bin: string | null, keyboard = false) => {
    dispatch({ type: "placed", item: word, bin });
    setNote(null);
    const label = bin ? binOf.get(bin)?.label : undefined;
    setSaid(label ? t`${word} in ${label}` : t`${word} back with the words`);
    if (keyboard) focusNext();
  };
  const pick = (word: string) => {
    if (state.checked) return;
    const item = byWord.get(word);
    if (state.picked !== word && item?.src) void playSound(item.src);
    dispatch({ type: "picked", item: word });
    setNote(null);
    setSaid(state.picked === word ? "" : t`${word} picked. Choose its group.`);
  };
  /** A tap on a bin, or on the words, puts the picked word there. */
  const drop = (bin: string, keyboard = false) => {
    if (state.checked) return;
    if (!state.picked) return setNote(t`Pick a word first.`);
    const to = bin === POOL ? null : bin;
    if ((state.places[state.picked] ?? null) === to)
      return dispatch({ type: "picked", item: state.picked });
    place(state.picked, to, keyboard);
  };

  const { lift, start, handlers } = useLift<string>({
    disabled: state.checked,
    onCancel: () => setOver(null),
    onTap: pick,
    onMove: (_, x, y) => setOver(targetAt(x, y, "data-bin")),
    onDrop: (word, x, y) => {
      setOver(null);
      const bin = targetAt(x, y, "data-bin");
      if (bin) place(word, bin === POOL ? null : bin);
    },
  });

  const chip = (word: string) => {
    const item = byWord.get(word);
    const at = state.items.indexOf(word);
    const mark = state.checked ? (results[at] ? "right" : "wrong") : undefined;
    const rightBin = item ? binOf.get(item.bin) : undefined;
    const lifted = lift?.moved && lift.value === word;
    return (
      <button
        key={word}
        type="button"
        lang="et"
        aria-pressed={state.checked ? undefined : state.picked === word}
        aria-disabled={state.checked || undefined}
        data-mark={mark}
        onPointerDown={start(word)}
        {...handlers}
        onClick={(event) => fromKeyboard(event) && pick(word)}
        onKeyDown={(event: KeyboardEvent) => {
          if (state.checked) return;
          const n = Number(event.key);
          const bin = Number.isInteger(n) && n > 0 ? bins[n - 1] : undefined;
          if (bin) {
            event.preventDefault();
            place(word, bin.id, true);
          } else if (
            (event.key === "Backspace" || event.key === "Delete") &&
            state.places[word] !== undefined
          ) {
            // Back with the words, for a keyboard.
            event.preventDefault();
            place(word, null, true);
          } else if (event.key === "Escape" && state.picked)
            dispatch({ type: "picked", item: state.picked });
        }}
        className={clsx(
          "learn-answer inline-flex items-baseline gap-2 rounded-tile border border-edge-strong bg-plate px-3.5 py-1.5 text-start select-none",
          !state.checked &&
            "cursor-grab touch-none transition-[background-color,border-color,scale] duration-150 active:scale-[0.97] hoverable:hover:bg-plate-hover",
          state.picked === word && "learn-chosen",
          lifted && "border-dashed text-transparent",
        )}
      >
        <span className="text-xl font-semibold tracking-tight">{word}</span>
        {mark === "wrong" && rightBin && (
          <span className="inline-flex items-center gap-1 text-md font-semibold text-success">
            <ArrowRight aria-hidden="true" className="size-3.5 self-center" strokeWidth={2.5} />
            <span className="sr-only">
              <Trans>belongs in</Trans>
            </span>
            <span lang={rightBin.lang ?? "et"}>{rightBin.label}</span>
          </span>
        )}
      </button>
    );
  };

  const pool = state.items.filter((word) => state.places[word] === undefined);
  const missed = state.checked ? state.items.filter((_, i) => !results[i]) : [];
  const target = (bin: string) =>
    !state.checked && (state.picked !== null || !!lift?.moved) && over !== bin;

  return (
    <QuizCard
      title={title}
      className="select-none"
      aside={state.checked ? <ResultDots results={results} now={-1} total={total} /> : undefined}
    >
      <div ref={rootRef} className="grid w-full gap-3">
        {!state.checked && (
          // biome-ignore lint/a11y/noStaticElementInteractions: the words' own buttons carry the keyboard; this takes a tap to put a word back
          // biome-ignore lint/a11y/useKeyWithClickEvents: as above
          <div
            data-bin={POOL}
            data-pool=""
            onClick={(event) => !(event.target as HTMLElement).closest("button") && drop(POOL)}
            className={clsx(
              "grid min-h-16 gap-2 rounded-lg bg-plate-nested p-3 transition-colors duration-150",
              over === POOL && "bg-(--form-soft)",
            )}
          >
            <p className="text-sm text-ink-muted">
              <Trans>Tap a word, then its group, or drag it there.</Trans>
            </p>
            {pool.length > 0 ? (
              <div className="flex flex-wrap gap-2">{pool.map(chip)}</div>
            ) : (
              <p className="text-md text-ink-secondary">
                <Trans>Every word has a group. Check when you’re ready.</Trans>
              </p>
            )}
          </div>
        )}
        <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,10.5rem),1fr))]">
          {bins.map((bin, n) => {
            const here = state.items.filter((word) => state.places[word] === bin.id);
            const picked = state.picked;
            return (
              // biome-ignore lint/a11y/noStaticElementInteractions: the bin's heading button carries the keyboard; the whole bin takes a tap
              // biome-ignore lint/a11y/useKeyWithClickEvents: as above
              <div
                key={bin.id}
                data-bin={bin.id}
                onClick={(event) =>
                  !(event.target as HTMLElement).closest("button") && drop(bin.id)
                }
                className={clsx(
                  "grid min-h-32 content-start gap-2.5 rounded-lg border p-3 transition-[background-color,border-color] duration-150",
                  state.checked
                    ? "border-edge bg-plate-nested"
                    : over === bin.id
                      ? "border-(--form) bg-(--form-soft)"
                      : target(bin.id)
                        ? "cursor-pointer border-dashed border-(--form) bg-plate-nested"
                        : "border-dashed border-edge-strong bg-plate-nested",
                )}
              >
                <button
                  type="button"
                  onClick={(event) => drop(bin.id, fromKeyboard(event))}
                  aria-disabled={state.checked || undefined}
                  className={clsx(
                    "grid justify-items-start gap-0.5 rounded-sm text-start",
                    !state.checked && "cursor-pointer",
                  )}
                >
                  <span className="flex items-baseline gap-2">
                    <b
                      lang={bin.lang ?? "et"}
                      className="text-2xl/none font-semibold tracking-tight text-(--form)"
                    >
                      {bin.label}
                    </b>
                    {!state.checked && (
                      <span
                        aria-hidden="true"
                        className="hidden rounded-xs border border-edge px-1 font-sans text-xs text-ink-muted hoverable:inline"
                      >
                        {n + 1}
                      </span>
                    )}
                  </span>
                  {bin.hint && <span className="text-sm text-ink-muted">{bin.hint}</span>}
                  {picked && !state.checked && (
                    <span className="sr-only">
                      <Trans>Put {picked} here</Trans>
                    </span>
                  )}
                </button>
                {here.length > 0 && <div className="flex flex-wrap gap-2">{here.map(chip)}</div>}
              </div>
            );
          })}
        </div>
      </div>
      {lift?.moved && (
        <span
          aria-hidden="true"
          lang="et"
          className="learn-lifted rounded-tile border border-(--form) bg-plate px-3.5 py-1.5 text-xl font-semibold tracking-tight"
          style={{ left: lift.x - lift.dx, top: lift.y - lift.dy }}
        >
          {lift.value}
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
      {state.checked ? (
        <>
          {missed.length === 0 ? (
            <Feedback right>
              <Trans>Every word is in its group.</Trans>
            </Feedback>
          ) : (
            <ul className="m-0 grid w-full list-none gap-2 p-0">
              {missed.map((word) => {
                const item = byWord.get(word);
                const bin = item ? binOf.get(item.bin) : undefined;
                return (
                  <li key={word}>
                    <p className="flex items-start gap-2">
                      <X
                        aria-hidden="true"
                        className="mt-1 size-4 shrink-0 text-danger"
                        strokeWidth={2.5}
                      />
                      <span className="text-ink-secondary">
                        <b lang="et" className="font-semibold text-ink">
                          {word}
                        </b>{" "}
                        →{" "}
                        <b lang={bin?.lang ?? "et"} className="font-semibold text-ink">
                          {bin?.label}
                        </b>
                        . {item?.why ?? bin?.rule}
                      </span>
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
          <Score
            right={right}
            total={total}
            results={results}
            recalled={state.items.map((word) => ({ label: word, src: byWord.get(word)?.src }))}
          />
          <Button
            ref={againRef}
            onClick={() => {
              restarted.current = true;
              setSaid("");
              dispatch({ type: "restarted", items: shuffle(ids) });
            }}
          >
            <RotateCcw aria-hidden="true" data-icon="inline-start" />
            <Trans>Try again</Trans>
          </Button>
        </>
      ) : (
        <div className="flex w-full flex-wrap items-center justify-end gap-3">
          <Button
            ref={checkRef}
            variant="primary"
            onClick={() => {
              if (!sortedAll(state)) return setNote(t`Put every word in a group first.`);
              dispatch({ type: "checked" });
            }}
          >
            <Trans>Check</Trans>
          </Button>
        </div>
      )}
    </QuizCard>
  );
}

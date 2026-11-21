import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { captureAnalytics } from "@lymi/client/analytics";
import { clsx } from "clsx";
import { RotateCcw } from "lucide-react";
import { type ReactNode, useContext, useEffect, useReducer, useRef, useState } from "react";
import { playSound } from "../../lib/learn/player";
import {
  type MatchState,
  matchDone,
  matchReducer,
  matchResults,
  type Side,
  startMatch,
} from "../../lib/learn/practice";
import { shuffle } from "../../lib/learn/quiz";
import { Button } from "../Button";
import { SectionContext, useLesson } from "./lesson-context";
import { QuizCard, ResultDots, Score } from "./Quiz";

export interface MatchPair {
  id: string;
  /** The left column's side, Estonian unless `leftLang` says otherwise: a form, a question word. */
  left: string;
  /** The right column's side, in the reader's language unless `rightLang` says otherwise. */
  right: ReactNode;
  leftLang?: string | undefined;
  rightLang?: string | undefined;
  /** Plays as the pair is matched, and from its chip on the score. */
  src?: string | undefined;
}

interface MatchProps {
  /** For analytics: lowercase letters, digits and hyphens. */
  id: string;
  title: ReactNode;
  /** Four to six pairs. */
  pairs: readonly MatchPair[];
  /** Headings over the two columns, when what they hold isn't plain. */
  columns?: readonly [ReactNode, ReactNode];
}

/** How long a wrong try stays marked before both sides open again. */
const WRONG_MS = 750;

/**
 * Connect pairs across two columns: tap one side, then the other. A right pair locks with its
 * number on both sides; a wrong one flashes and counts against the score.
 */
export function Match({ id, title, pairs, columns }: MatchProps) {
  const { t } = useLingui();
  const { slug, finishSection } = useLesson();
  const section = useContext(SectionContext);
  const [state, dispatch] = useReducer(matchReducer, pairs.length, startMatch);
  const [order, setOrder] = useState(() => ({
    left: pairs.map((pair) => pair.id),
    right: pairs.map((pair) => pair.id),
  }));
  const [said, setSaid] = useState("");
  const againRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const restarted = useRef(false);
  const byId = new Map(pairs.map((pair) => [pair.id, pair]));
  const ids = pairs.map((pair) => pair.id);
  const results = matchResults(state, ids);
  // The dots fill as pairs are matched, green for a first try, red after a wrong one.
  const inOrder = state.matched.map((pairId) => !state.missed.includes(pairId));
  const done = matchDone(state);
  const right = results.filter(Boolean).length;
  const total = pairs.length;

  const reshuffle = () => {
    const left = shuffle(ids);
    let next = shuffle(ids);
    // Avoid a pair side by side in one row; a few tries make it rare.
    for (let tries = 0; tries < 20 && next.some((pair, i) => pair === left[i]); tries++)
      next = shuffle(ids);
    setOrder({ left, right: next });
  };
  // Keyed on the pairs' ids, not the array, so a lesson passing them inline doesn't reset a game on
  // each render.
  const pairsKey = ids.join("\u0001");
  // biome-ignore lint/correctness/useExhaustiveDependencies: shuffles once per set of pairs, after the page loads
  useEffect(reshuffle, [pairsKey]);

  useEffect(() => {
    if (!state.wrong) return;
    const timer = setTimeout(() => dispatch({ type: "cleared" }), WRONG_MS);
    return () => clearTimeout(timer);
  }, [state.wrong]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reported once each time it is finished
  useEffect(() => {
    if (!done) return;
    captureAnalytics("learn_quiz_finished", { lesson: slug, quiz: id, right, total });
    if (section) finishSection(section);
    againRef.current?.focus({ preventScroll: true });
  }, [done]);
  useEffect(() => {
    if (!done && restarted.current) {
      restarted.current = false;
      rootRef.current?.querySelector("button")?.focus();
    }
  }, [done]);

  const choose = (side: Side, pairId: string) => {
    if (done || state.matched.includes(pairId)) return;
    const { chosen } = state;
    const next = matchReducer(state, { type: "chose", side, id: pairId });
    dispatch({ type: "chose", side, id: pairId });
    const pair = byId.get(pairId);
    if (next.matched.length > state.matched.length) {
      if (pair?.src) void playSound(pair.src);
      const word = pair?.left ?? "";
      setSaid(t`${word}: matched.`);
    } else if (next.mistakes > state.mistakes) setSaid(t`Not a pair.`);
    else if (next.chosen && chosen?.id !== pairId) {
      const word = side === "left" ? (pair?.left ?? "") : "";
      setSaid(word ? t`${word} chosen. Now its match.` : t`Chosen. Now its match.`);
    } else setSaid("");
  };

  return (
    <QuizCard title={title} aside={<ResultDots results={inOrder} now={-1} total={total} />}>
      <p className="text-sm text-ink-muted">
        <Trans>Tap one side, then its match on the other.</Trans>
      </p>
      <div ref={rootRef} className="grid w-full grid-cols-2 gap-x-2.5 gap-y-2">
        {(["left", "right"] as const).map((side, c) => (
          <fieldset key={side} className="m-0 grid min-w-0 content-start gap-2 border-0 p-0">
            {columns ? (
              <legend className="mb-2 text-sm font-medium text-ink-muted">{columns[c]}</legend>
            ) : (
              <legend className="sr-only">
                {side === "left" ? t`Left column` : t`Right column`}
              </legend>
            )}
            {order[side].map((pairId) => {
              const pair = byId.get(pairId);
              if (!pair) return null;
              return (
                <MatchItem
                  key={pairId}
                  label={side === "left" ? pair.left : pair.right}
                  lang={side === "left" ? (pair.leftLang ?? "et") : pair.rightLang}
                  big={side === "left" ? !pair.leftLang : !!pair.rightLang}
                  state={state}
                  side={side}
                  pairId={pairId}
                  onChoose={() => choose(side, pairId)}
                />
              );
            })}
          </fieldset>
        ))}
      </div>
      <p aria-live="polite" className="sr-only">
        {said}
      </p>
      {done && (
        <>
          <Score
            right={right}
            total={total}
            verdict={() =>
              state.mistakes === 0 ? (
                <Trans>No wrong tries.</Trans>
              ) : (
                <Plural value={state.mistakes} one="# wrong try" other="# wrong tries" />
              )
            }
            results={inOrder}
            recalled={state.matched.map((pairId) => {
              const pair = byId.get(pairId);
              return pair && { label: pair.left, src: pair.src };
            })}
          />
          <Button
            ref={againRef}
            onClick={() => {
              restarted.current = true;
              setSaid("");
              reshuffle();
              dispatch({ type: "restarted" });
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

function MatchItem({
  label,
  lang,
  big,
  state,
  side,
  pairId,
  onChoose,
}: {
  label: ReactNode;
  lang: string | undefined;
  big: boolean;
  state: MatchState;
  side: Side;
  pairId: string;
  onChoose: () => void;
}) {
  const { t } = useLingui();
  const number = state.matched.indexOf(pairId) + 1;
  const matched = number > 0;
  const chosen = state.chosen?.side === side && state.chosen.id === pairId;
  const wrong = state.wrong?.[side] === pairId;
  return (
    <button
      type="button"
      onClick={onChoose}
      aria-pressed={matched ? undefined : chosen}
      aria-disabled={matched || undefined}
      data-mark={matched ? "right" : wrong ? "wrong" : undefined}
      className={clsx(
        "learn-answer relative flex min-h-13 items-center rounded-tile border border-edge-strong bg-plate py-2 ps-3.5 text-start transition-[background-color,border-color,scale] duration-150",
        matched
          ? "cursor-default pe-9"
          : "cursor-pointer pe-3.5 active:scale-[0.98] hoverable:hover:bg-plate-hover",
        chosen && "learn-chosen",
        wrong && "learn-shake",
      )}
    >
      <span
        lang={lang}
        className={clsx(
          "min-w-0 break-words",
          // A phone's column is about 150 px, so a long word steps down a size rather than break.
          big ? "text-xl font-semibold tracking-tight max-sm:text-lg" : "text-md font-medium",
        )}
      >
        {label}
      </span>
      {matched && (
        <span
          role="img"
          aria-label={t`Pair ${number}`}
          className="learn-pop absolute end-2.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full bg-success text-xs font-semibold text-plate tabular-nums"
        >
          {number}
        </span>
      )}
    </button>
  );
}

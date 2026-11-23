import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { type ReactNode, useEffect, useId, useReducer, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { answerWords, bareWord, type MarkedAnswer, markAnswer } from "../../lib/learn/answers";
import { fixing, fixReducer, foundFirst, markFix, startFix } from "../../lib/learn/fix";
import { playSound } from "../../lib/learn/player";
import { Button } from "../Button";
import {
  AlsoRight,
  OtherForm,
  RightSentence,
  slipsOf,
  slipText,
  SpokenDifferences,
  VerdictLine,
} from "./AnswerMarks";
import { LetterKeys, useLetters } from "./LetterKeys";
import type { Recall, RoundProps } from "./Quiz";

export interface FixItem {
  kind: "fix";
  id: string;
  wrong: string;
  answers: readonly string[];
  confusable?: readonly string[];
  prompt?: ReactNode;
  src?: string;
  explain?: ReactNode;
}

export const fixRecall = (item: FixItem): Recall => ({
  label: item.answers[0] ?? "",
  src: item.src,
});

export function FixRound({ item, state, heard, answer, autoplay }: RoundProps<FixItem>) {
  const { t } = useLingui();
  const helpId = useId();
  const { at, words } = fixing(item);
  const [fix, dispatch] = useReducer(fixReducer, at, startFix);
  const [value, setValue] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const sentence = useRef<HTMLFieldSetElement>(null);
  const round = state.status === "asking" || state.status === "answered" ? state.round : -1;
  // oxlint-disable react-hooks/exhaustive-deps -- each round, including a restart, opens once
  useEffect(() => {
    heard();
    if (autoplay) sentence.current?.querySelector("button")?.focus({ preventScroll: true });
  }, [round]);
  // oxlint-enable react-hooks/exhaustive-deps
  const type = useLetters(input, value, setValue);
  const done = state.status === "answered";
  const found = fix.status === "fixing";
  const lastTried = fix.tried.at(-1);
  const triedWord = lastTried === undefined ? null : bareWord(words[lastTried] ?? "");
  const wrongWord = bareWord(words[at] ?? "");

  const missed = !done && !found && triedWord !== null;

  const tap = (word: number) => {
    if (found) return;
    flushSync(() => dispatch({ type: "tapped", word }));
    if (word === at) input.current?.focus();
  };
  const submit = () => {
    if (done) return;
    if (answerWords(value).length === 0) return input.current?.focus();
    const { verdict } = markFix(item, value);
    const right = foundFirst(fix) && verdict !== "wrong";
    answer(value, right, verdict === "almost");
    if (item.src) void playSound(item.src);
  };

  return (
    <>
      <div className={clsx("grid grid-cols-1 gap-1.5", done && !item.prompt && "sr-only")}>
        {!done && (
          <p className="text-sm text-ink-muted">
            <Trans>One word is wrong. Tap it, then write it right.</Trans>
          </p>
        )}
        {item.prompt && <p className="text-md text-ink-secondary">{item.prompt}</p>}
      </div>
      {!done && (
        <fieldset
          ref={sentence}
          data-fix=""
          className="m-0 flex min-w-0 flex-wrap items-center gap-2 border-0 p-0"
        >
          <legend className="sr-only">{t`The sentence`}</legend>
          {words.map((word, i) => {
            const chosen = found && i === at;
            const tried = fix.tried.includes(i);
            return (
              <button
                // oxlint-disable-next-line react/no-array-index-key -- a sentence's words never reorder
                key={i}
                type="button"
                lang="et"
                aria-pressed={chosen || undefined}
                aria-disabled={tried || found || undefined}
                onClick={() => tap(i)}
                className={clsx(
                  "learn-answer min-h-11 rounded-tile border border-edge-strong bg-plate px-3.5 py-1.5 text-xl font-semibold tracking-tight transition-[background-color,border-color,opacity,scale] duration-150",
                  chosen && "learn-chosen",
                  tried && "border-dashed opacity-55",
                  found || tried
                    ? "cursor-default"
                    : "cursor-pointer active:scale-[0.97] hoverable:hover:bg-plate-hover",
                )}
              >
                {word}
              </button>
            );
          })}
        </fieldset>
      )}
      <div aria-live="polite" className={clsx(!missed && "sr-only")}>
        {missed && (
          <VerdictLine tone="wrong">
            <Trans>
              <b lang="et">{triedWord}</b> is right in this sentence.
            </Trans>{" "}
            <span className="font-normal text-ink-secondary">
              <Trans>Tap another word.</Trans>
            </span>
          </VerdictLine>
        )}
      </div>
      {!done && found && (
        <form
          className="grid w-full max-w-md grid-cols-1 gap-2.5"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <p id={helpId} className="text-md">
            <Trans>
              What should <b lang="et">{wrongWord}</b> be?
            </Trans>
          </p>
          <div className="flex gap-2">
            <input
              ref={input}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              lang="et"
              inputMode="text"
              enterKeyHint="done"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              aria-label={t`Type the form`}
              aria-describedby={helpId}
              placeholder={t`Type the form`}
              className="learn-answer h-13 min-w-0 flex-1 rounded-tile border border-edge-strong bg-plate px-4 text-xl font-semibold placeholder:text-md placeholder:font-normal placeholder:text-ink-muted focus:outline-2 focus:outline-offset-1 focus:outline-(--form)"
            />
            <Button type="submit" variant="primary" size="lg" className="h-13">
              <Trans>Check</Trans>
            </Button>
          </div>
          <LetterKeys onLetter={type} />
        </form>
      )}
      {done && <FixResult item={item} typed={state.picked} tried={fix.tried} />}
      <div aria-live="polite" className="sr-only">
        {done && <SpokenDifferences marked={markFix(item, state.picked)} />}
      </div>
    </>
  );
}

function fixedSentence(item: FixItem, form: MarkedAnswer): MarkedAnswer {
  const { forms } = fixing(item);
  const index = Math.max(0, forms.indexOf(form.accepted));
  return markAnswer(item.wrong, item.answers.slice(index, index + 1), () => true);
}

export function FixResult({
  item,
  typed,
  tried,
}: {
  item: FixItem;
  typed: string;
  tried: readonly number[];
}) {
  const { at, words } = fixing(item);
  const form = markFix(item, typed);
  const sentence = fixedSentence(item, form);
  const wrongWord = bareWord(words[at] ?? "");
  const wrote = typed.trim();
  return (
    <div className="grid w-full grid-cols-1 gap-3">
      <p lang="et" data-fix="" className="text-xl font-medium break-words">
        {words.map((word, i) => (
          // oxlint-disable-next-line react/no-array-index-key -- a sentence's words never reorder
          <span key={i}>
            {i > 0 && " "}
            {i === at ? <s className="text-danger decoration-2">{word}</s> : word}
          </span>
        ))}
      </p>
      <div className="grid gap-1.5">
        {tried.length === 0 ? (
          <VerdictLine tone="right">
            <Trans>You found the wrong word.</Trans>
          </VerdictLine>
        ) : (
          <VerdictLine tone="wrong">
            <Trans>
              The wrong word was <b lang="et">{wrongWord}</b>; you tapped another one first.
            </Trans>
          </VerdictLine>
        )}
        {form.verdict === "right" && (
          <VerdictLine tone="right">
            <Trans>You wrote the right form.</Trans>
          </VerdictLine>
        )}
        {form.verdict === "almost" && (
          <VerdictLine tone="slip">
            {slipText(slipsOf(form))}{" "}
            <span className="font-normal text-ink-secondary">
              <Trans>
                You wrote <span lang="et">{wrote}</span>.
              </Trans>
            </span>
          </VerdictLine>
        )}
        {form.verdict === "wrong" && (
          <VerdictLine tone="wrong">
            <Trans>
              The form isn’t <b lang="et">{wrote}</b>.
            </Trans>
          </VerdictLine>
        )}
      </div>
      <RightSentence
        marked={sentence}
        src={sentence.accepted === item.answers[0] ? item.src : undefined}
      />
      <OtherForm marked={form} />
      {item.explain && <p className="text-md text-ink-secondary">{item.explain}</p>}
      <AlsoRight
        marked={sentence}
        accepted={item.answers}
        src={sentence.accepted === item.answers[0] ? undefined : item.src}
      />
    </div>
  );
}

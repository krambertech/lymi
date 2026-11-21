import { Trans, useLingui } from "@lingui/react/macro";
import { ArrowRight, X } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { morph } from "../../lib/learn/forms";
import { playSound } from "../../lib/learn/player";
import { ESTONIAN_LETTERS, formMatches, insertAt, onlyMarksDiffer } from "../../lib/learn/practice";
import { Button } from "../Button";
import { Answer, Feedback, type RoundProps } from "./Quiz";
import { PlayButton } from "./Sound";

export interface FormItem {
  /** The word the form is made from, as a dictionary lists it: `pood`. */
  base: string;
  /** What it means, in the reader's language, small beside it. */
  gloss?: ReactNode;
  /** What to make of it: a case question (`kus?`), a person (`mina`), “in the …”. */
  cue: ReactNode;
  /** The cue's language when it is Estonian, such as `et` for `kus?`. */
  cueLang?: string | undefined;
  /** Every form that counts; the first is shown when it was missed. */
  answers: readonly string[];
  /** Words to pick from instead of typing, the answer among them. */
  options?: readonly string[];
  /** The form, or a sentence with it, recorded; it plays once answered. */
  src?: string | undefined;
  /** A sentence with the form in it, shown once answered. */
  said?: ReactNode;
  /** A line after the answer, such as the rule. */
  explain?: ReactNode;
}

/**
 * The word turning into its form, as `Morph` draws it: dropped letters struck, added ones
 * underlined. Inside the marked card the added letters stay in ink, not the stage's hue.
 */
function Change({ base, form, src }: { base: string; form: string; src?: string | undefined }) {
  const { i18n } = useLingui();
  const parts = morph(base, form);
  return (
    <p className="flex flex-wrap items-center gap-3">
      <span
        lang="et"
        data-play=""
        className="learn-morph learn-morph-ink min-w-0 text-3xl/tight font-semibold tracking-tight whitespace-nowrap"
      >
        {/* The sentence is in the reader's language; only the forms in it are Estonian. */}
        <span lang={i18n.locale} className="sr-only">
          <Trans>
            <span lang="et">{base}</span> becomes <span lang="et">{form}</span>
          </Trans>
        </span>
        <span aria-hidden="true">
          {parts.map((part, i) =>
            part.kind === "added" ? (
              // oxlint-disable-next-line react/no-array-index-key -- a word's parts never reorder
              <span key={i} data-kind="added">
                <span>{part.text}</span>
              </span>
            ) : (
              // oxlint-disable-next-line react/no-array-index-key -- a word's parts never reorder
              <span key={i} data-kind={part.kind}>
                {part.text}
              </span>
            ),
          )}
        </span>
      </span>
      {src && (
        <PlayButton
          src={src}
          label={
            <Trans>
              Play <span lang="et">{form}</span>
            </Trans>
          }
        />
      )}
    </p>
  );
}

/** Keys for õ ä ö ü š ž under a field, for keyboards without them. They keep the field focused. */
function LetterKeys({ onLetter }: { onLetter: (letter: string) => void }) {
  const { t } = useLingui();
  return (
    <fieldset className="m-0 flex min-w-0 flex-wrap gap-1.5 border-0 p-0">
      <legend className="sr-only">{t`Estonian letters`}</legend>
      {ESTONIAN_LETTERS.map((letter) => (
        <button
          key={letter}
          type="button"
          // A press must not take focus from the field, or a phone's keyboard closes.
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => onLetter(letter)}
          className="learn-key grid h-11 min-w-11 cursor-pointer place-items-center rounded-tile bg-plate px-2 text-xl font-semibold hoverable:hover:bg-plate-hover"
        >
          <span aria-hidden="true" lang="et">
            {letter}
          </span>
          <span className="sr-only">
            <Trans>
              Type <span lang="et">{letter}</span>
            </Trans>
          </span>
        </button>
      ))}
    </fieldset>
  );
}

/**
 * A word and a cue; the learner types the form or picks it. Once answered, the word and its form
 * stand side by side with the changed letters lit, and the form plays.
 */
export function FormRound({ item, state, heard, answer, autoplay }: RoundProps<FormItem>) {
  const { t } = useLingui();
  const [value, setValue] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const round = state.status === "asking" || state.status === "answered" ? state.round : -1;
  // Nothing to hear first: each round, including a restart, opens answerable, and the field takes
  // focus when it opens from Next.
  // oxlint-disable react-hooks/exhaustive-deps -- runs as each round opens
  useEffect(() => {
    heard();
    setValue("");
    if (autoplay) input.current?.focus({ preventScroll: true });
  }, [round]);
  // oxlint-enable react-hooks/exhaustive-deps
  const done = state.status === "answered";
  const picked = done ? state.picked : null;
  const expected = item.answers[0] ?? "";
  // A right answer shows the form the learner gave, when several count.
  const shown =
    (picked ? item.answers.find((form) => formMatches(picked, [form])) : undefined) ?? expected;

  const submit = (typed: string) => {
    if (done) return;
    answer(typed, formMatches(typed, item.answers));
    if (item.src) void playSound(item.src);
  };
  const type = (letter: string) => {
    const field = input.current;
    const next = insertAt(
      value,
      letter,
      field?.selectionStart ?? null,
      field?.selectionEnd ?? null,
    );
    setValue(next.value);
    requestAnimationFrame(() => {
      field?.focus({ preventScroll: true });
      field?.setSelectionRange(next.caret, next.caret);
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <p className="grid gap-0.5">
          <b lang="et" className="text-4xl/none font-semibold tracking-tight">
            {item.base}
          </b>
          {item.gloss && <span className="text-sm text-ink-muted">{item.gloss}</span>}
        </p>
        <p className="inline-flex items-center gap-2 pb-0.5">
          <ArrowRight aria-hidden="true" className="size-4 text-ink-muted" strokeWidth={2.25} />
          <span
            lang={item.cueLang}
            className="rounded-full border border-edge-strong px-3 py-1 text-md font-medium"
          >
            {item.cue}
          </span>
        </p>
      </div>
      {item.options ? (
        <fieldset className="m-0 flex min-w-0 flex-wrap gap-2.5 border-0 p-0">
          <legend className="sr-only">{t`Pick the form`}</legend>
          {item.options.map((option) => (
            <Answer
              key={option}
              big
              label={option}
              mark={
                !done
                  ? undefined
                  : formMatches(option, item.answers)
                    ? "right"
                    : option === picked
                      ? "wrong"
                      : "out"
              }
              onPick={() => submit(option)}
            />
          ))}
        </fieldset>
      ) : (
        <form
          className="grid w-full max-w-md grid-cols-1 gap-2.5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!done && value.trim()) submit(value);
            else input.current?.focus();
          }}
        >
          <div className="flex gap-2">
            <input
              ref={input}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              readOnly={done}
              lang="et"
              inputMode="text"
              enterKeyHint="done"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              aria-label={t`Type the form`}
              placeholder={t`Type the form`}
              data-mark={done ? (state.right ? "right" : "wrong") : undefined}
              className="learn-answer h-13 min-w-0 flex-1 rounded-tile border border-edge-strong bg-plate px-4 text-2xl font-semibold placeholder:text-md placeholder:font-normal placeholder:text-ink-muted focus:outline-2 focus:outline-offset-1 focus:outline-(--form)"
            />
            {!done && (
              <Button type="submit" variant="primary" size="lg" className="h-13">
                <Trans>Check</Trans>
              </Button>
            )}
          </div>
          {!done && <LetterKeys onLetter={type} />}
        </form>
      )}
      {done && (
        <div className="grid w-full gap-3">
          {state.right ? (
            <Feedback right>{item.explain}</Feedback>
          ) : (
            <div className="grid gap-1">
              <p className="flex items-start gap-2 font-medium text-danger">
                <X aria-hidden="true" className="mt-1 size-4 shrink-0" strokeWidth={2.5} />
                <span>
                  <Trans>
                    It was <b lang="et">{expected}</b>.
                  </Trans>{" "}
                  {item.explain && (
                    <span className="font-normal text-ink-secondary">{item.explain}</span>
                  )}
                </span>
              </p>
              {picked && onlyMarksDiffer(picked, item.answers) && (
                <p className="ps-6 text-md text-ink-secondary">
                  <Trans>Close: only the letters with marks are off.</Trans>
                </p>
              )}
            </div>
          )}
          <Change base={item.base} form={shown} src={item.src} />
          {item.said && (
            <div lang="et" className="text-xl text-ink-secondary">
              {item.said}
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** For a quiz's `recall`: the form the round asked for. */
export const formRecall = (item: FormItem) => ({ label: item.answers[0] ?? "", src: item.src });

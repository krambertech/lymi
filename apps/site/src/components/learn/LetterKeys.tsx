import { Trans, useLingui } from "@lingui/react/macro";
import type { RefObject } from "react";
import { ESTONIAN_LETTERS, insertAt } from "../../lib/learn/practice";

export function useLetters(
  ref: RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
  value: string,
  setValue: (value: string) => void,
): (letter: string) => void {
  return (letter) => {
    const field = ref.current;
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
}

interface Props {
  onLetter: (letter: string) => void;
}

export function LetterKeys({ onLetter }: Props) {
  const { t } = useLingui();
  return (
    <fieldset className="m-0 flex min-w-0 flex-wrap gap-1.5 border-0 p-0">
      <legend className="sr-only">{t`Estonian letters`}</legend>
      {ESTONIAN_LETTERS.map((letter) => (
        <button
          key={letter}
          type="button"
          onMouseDown={(event) => event.preventDefault()}
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

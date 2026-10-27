import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { PronunciationDisplay, ReadingEngine } from "@lymi/core";
import { InlineError } from "./inline-error";
import { Field, FieldContent, FieldDescription, FieldLabel } from "./ui/field";
import { Switch } from "./ui/switch";

/** What each notation does with the switch on, then off. */
const DESCRIPTION: Record<ReadingEngine, [on: MessageDescriptor, off: MessageDescriptor]> = {
  furigana: [
    msg`Furigana shows over the term until a card is Known, then only with the answer.`,
    msg`The reading shows on its own line with the answer, so you read the kanji yourself.`,
  ],
  pinyin: [
    msg`Pinyin shows over the term until a card is Known, then only with the answer.`,
    msg`Pinyin shows on its own line with the answer, so you read the characters yourself.`,
  ],
  jyutping: [
    msg`Jyutping shows over the term until a card is Known, then only with the answer.`,
    msg`Jyutping shows on its own line with the answer, so you read the characters yourself.`,
  ],
  indic: [
    msg`The reading shows over the term until a card is Known, then only with the answer.`,
    msg`The reading shows on its own line with the answer, so you read the term yourself.`,
  ],
  stress: [
    msg`Stress marks show on the term until a card is Known, then only with the answer.`,
    msg`Stress marks show on their own line with the answer, so you recall the stress yourself.`,
  ],
};

interface Props {
  /** How the deck's language draws pronunciation on the term. */
  notation: ReadingEngine;
  value: PronunciationDisplay;
  onChange: (value: PronunciationDisplay) => void;
  error?: boolean | undefined;
}

/** Adaptive pronunciation: the learner's own choice of whether a card's cue carries its pronunciation in this deck. */
export function AdaptivePronunciationChoice({ notation, value, onChange, error }: Props) {
  const { i18n } = useLingui();
  const on = value !== "separate";
  const [onText, offText] = DESCRIPTION[notation];
  return (
    <div className="grid">
      <div className="edge grid rounded-md bg-plate">
        <Field orientation="horizontal" className="relative gap-3 px-4 py-3.5">
          <FieldContent className="gap-0.5">
            <FieldLabel className="text-base text-text after:absolute after:inset-0 after:content-['']">
              <Trans>Adaptive pronunciation</Trans>
            </FieldLabel>
            <FieldDescription>{i18n._(on ? onText : offText)}</FieldDescription>
          </FieldContent>
          <Switch
            className="self-center"
            checked={on}
            onCheckedChange={(next) => onChange(next ? "adaptive" : "separate")}
          />
        </Field>
      </div>
      {error && (
        <InlineError className="mt-2">
          <Trans>Couldn’t save the choice. Check your connection and try again.</Trans>
        </InlineError>
      )}
    </div>
  );
}

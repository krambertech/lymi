import { Trans, useLingui } from "@lingui/react/macro";
import { REVIEW_MODE_KEYS, type ReviewModeKey } from "@lymi/core";
import { MODE_LABELS } from "../lib/review-modes";
import { Checkbox } from "./ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "./ui/field";

interface Props {
  /** The card's own modes, or null while it follows its deck. */
  value: ReviewModeKey[] | null;
  deckModes: ReviewModeKey[];
  onChange: (value: ReviewModeKey[] | null) => void;
  term: string;
  meaning: string;
  hasPicture: boolean;
  /** A picture mode is asked only once the picture has a description. */
  pictureDescribed: boolean;
  error?: string | undefined;
}

/** The four ways a card can be asked, ticked on the card itself or left to the deck. ADR 0014. */
export function ReviewModesField({
  value,
  deckModes,
  onChange,
  term,
  meaning,
  hasPicture,
  pictureDescribed,
  error,
}: Props) {
  const { t, i18n } = useLingui();
  const chosen = value ?? deckModes;
  const word = term.trim() || t`the term`;
  const answer = meaning.trim();

  const blurb = (key: ReviewModeKey): string => {
    if (key === "term_to_meaning")
      return answer ? t`See ${word}, recall “${answer}”` : t`See ${word}, recall what it means`;
    if (key === "meaning_to_term")
      return answer ? t`See “${answer}”, recall ${word}` : t`See the meaning, recall ${word}`;
    if (key === "image_to_term") return t`See the picture, recall ${word}`;
    return answer ? t`See the picture, recall “${answer}”` : t`See the picture, recall the meaning`;
  };
  const waiting = !hasPicture
    ? t`Asked once the card has a picture.`
    : !pictureDescribed
      ? t`Asked once the picture has a description.`
      : null;

  const toggle = (key: ReviewModeKey, on: boolean) => {
    const next = new Set(chosen);
    if (on) next.add(key);
    else next.delete(key);
    onChange(REVIEW_MODE_KEYS.filter((k) => next.has(k)));
  };

  return (
    <FieldSet className="gap-0">
      <FieldLegend variant="label" className="flex w-full items-baseline justify-between gap-3">
        <Trans>How it’s asked</Trans>
        {value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="-my-2 min-h-11 text-xs font-medium text-text-2 underline decoration-edge-2 underline-offset-3 transition-colors hoverable:hover:text-text hoverable:hover:decoration-current md:min-h-0"
          >
            <Trans>Use the deck’s</Trans>
          </button>
        ) : (
          <span className="text-xs font-normal text-muted">
            <Trans>Same as the deck</Trans>
          </span>
        )}
      </FieldLegend>
      <div className="grid gap-3 pt-1">
        {REVIEW_MODE_KEYS.map((key) => {
          const checked = chosen.includes(key);
          return (
            <Field key={key} orientation="horizontal" className="gap-2">
              <Checkbox
                checked={checked}
                onCheckedChange={(on) => toggle(key, on)}
                className="mt-0.5"
              />
              <FieldContent className="gap-0.5">
                <FieldLabel className="text-base text-text">{i18n._(MODE_LABELS[key])}</FieldLabel>
                <FieldDescription className="[overflow-wrap:anywhere]">
                  {key.startsWith("image_") && waiting && checked ? waiting : blurb(key)}
                </FieldDescription>
              </FieldContent>
            </Field>
          );
        })}
      </div>
      <FieldError className="mt-1.5">{error}</FieldError>
    </FieldSet>
  );
}

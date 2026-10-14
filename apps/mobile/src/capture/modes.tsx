import { useLingui } from "@lingui/react/macro";
import { REVIEW_MODE_KEYS, type ReviewModeKey, TEXT_MODES } from "@lymi/core";
import { MODE_LABELS } from "../review/modes";
import { SheetGroup, SheetRow } from "../ui/sheet";

export { MODE_LABELS };

/** Whether the card's picture can be asked with: none yet, one with no description, or both. */
export type PictureState = "none" | "undescribed" | "described";

const isText = (key: ReviewModeKey) => (TEXT_MODES as readonly ReviewModeKey[]).includes(key);

interface ModesChoicesProps {
  value: ReviewModeKey[] | null;
  deckModes: ReviewModeKey[];
  onChange: (value: ReviewModeKey[] | null) => void;
  term: string;
  meaning: string;
  picture: PictureState;
}

/**
 * How the card is asked: the deck's modes, or modes ticked for this card alone. The picture modes
 * show once the card has a picture, or while one is still ticked so it can be unticked. ADR 0014.
 */
export function ModesChoices({
  value,
  deckModes,
  onChange,
  term,
  meaning,
  picture,
}: ModesChoicesProps) {
  const { t, i18n } = useLingui();
  const chosen = value ?? [];
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
  const waiting =
    picture === "none"
      ? t`Asked once the card has a picture.`
      : picture === "undescribed"
        ? t`Asked once the picture has a description.`
        : null;
  const toggle = (key: ReviewModeKey) => {
    const next = chosen.includes(key) ? chosen.filter((k) => k !== key) : [...chosen, key];
    // A card is asked at least one way, so unticking the last one goes back to the deck's.
    onChange(next.length === 0 ? null : REVIEW_MODE_KEYS.filter((k) => next.includes(k)));
  };
  const shown = REVIEW_MODE_KEYS.filter(
    (key) => isText(key) || picture !== "none" || chosen.includes(key),
  );
  return (
    <>
      <SheetGroup>
        <SheetRow
          label={t`Same as the deck`}
          detail={deckModes.map((m) => i18n._(MODE_LABELS[m])).join(" · ")}
          chosen={value === null}
          onPress={() => onChange(null)}
        />
      </SheetGroup>
      <SheetGroup>
        {shown.map((key) => (
          <SheetRow
            key={key}
            label={i18n._(MODE_LABELS[key])}
            detail={!isText(key) && waiting && chosen.includes(key) ? waiting : blurb(key)}
            chosen={chosen.includes(key)}
            multiple
            onPress={() => toggle(key)}
          />
        ))}
      </SheetGroup>
    </>
  );
}

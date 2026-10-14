import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { type ReviewModeKey, TEXT_MODES } from "@lymi/core";
import { SheetGroup, SheetRow } from "../ui/sheet";

// The labels repeat the web's review-modes.ts because each app has its own catalog (ADR 0012).
/** What each text mode is called, as on the web (ADR 0014). Picture modes wait for a picture. */
export const MODE_LABELS: Record<ReviewModeKey, MessageDescriptor> = {
  term_to_meaning: msg`Recognition`,
  meaning_to_term: msg`Production`,
  image_to_term: msg`Picture → term`,
  image_to_meaning: msg`Picture → meaning`,
};

export function isTextMode(key: ReviewModeKey) {
  return (TEXT_MODES as readonly ReviewModeKey[]).includes(key);
}

interface ModesChoicesProps {
  value: ReviewModeKey[] | null;
  deckModes: ReviewModeKey[];
  onChange: (value: ReviewModeKey[] | null) => void;
}

/** How the card is asked: the deck's modes, or text modes ticked for this card alone, at least one. ADR 0014. */
export function ModesChoices({ value, deckModes, onChange }: ModesChoicesProps) {
  const { t, i18n } = useLingui();
  const chosen = value ?? [];
  const toggle = (key: ReviewModeKey) => {
    const next = chosen.includes(key) ? chosen.filter((k) => k !== key) : [...chosen, key];
    // A card is asked at least one way, so unticking the last one goes back to the deck's.
    onChange(next.length === 0 ? null : TEXT_MODES.filter((k) => next.includes(k)));
  };
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
        {TEXT_MODES.map((key) => (
          <SheetRow
            key={key}
            label={i18n._(MODE_LABELS[key])}
            detail={
              key === "term_to_meaning"
                ? t`See the term, recall what it means`
                : t`See the meaning, recall the term`
            }
            chosen={chosen.includes(key)}
            multiple
            onPress={() => toggle(key)}
          />
        ))}
      </SheetGroup>
    </>
  );
}

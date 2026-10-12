import { useLingui } from "@lingui/react/macro";
import { DECK_ENRICH_FIELDS, type DeckEnrichField, deckLimits } from "@lymi/core";
import { useEffect, useRef, useState } from "react";
import type { DeckSummary } from "../lib/api";
import { Checkbox } from "./ui/checkbox";
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from "./ui/field";
import { Textarea } from "./ui/textarea";

/** What the card saves: the fields the AI may fill, or the owner's instructions. */
export interface DeckAiPatch {
  enrichFields?: DeckEnrichField[];
  enrichInstructions?: string | null;
}

interface Props {
  deck: DeckSummary;
  onSave: (patch: DeckAiPatch) => void;
}

/**
 * The owner's AI settings for one deck, on one card. A checkbox saves when pressed; the
 * instructions save when the field is left, or when the screen is, like the deck's description.
 */
export function DeckAiCard({ deck, onSave }: Props) {
  const { t } = useLingui();
  const labels: Record<DeckEnrichField, string> = {
    meaning: t`Meaning`,
    example: t`Example`,
    notes: t`Notes`,
    pronunciation: t`Pronunciation`,
  };
  const [instructions, setInstructions] = useState(deck.enrichInstructions ?? "");
  useEffect(() => setInstructions(deck.enrichInstructions ?? ""), [deck.enrichInstructions]);

  const toggle = (field: DeckEnrichField, on: boolean) =>
    onSave({
      enrichFields: DECK_ENRICH_FIELDS.filter((f) =>
        f === field ? on : deck.enrichFields.includes(f),
      ),
    });

  // Leaving the screen with the caret in the box is the one way an edit could be lost.
  const pending = useRef({ text: instructions, saved: deck.enrichInstructions, onSave });
  pending.current = { text: instructions, saved: deck.enrichInstructions, onSave };
  const commit = useRef(() => {
    const { text, saved, onSave: save } = pending.current;
    const next = text.trim() || null;
    if (next !== saved) save({ enrichInstructions: next });
  }).current;
  useEffect(() => commit, [commit]);

  return (
    <div className="edge grid gap-4 rounded-lg bg-plate p-4">
      <FieldSet className="gap-3">
        <FieldLegend variant="label">{t`Fields AI can fill`}</FieldLegend>
        <FieldDescription className="-mt-2">
          {t`AI fills them only when they help. It never changes your text.`}
        </FieldDescription>
        <div className="grid gap-3">
          {DECK_ENRICH_FIELDS.map((field) => (
            <Field key={field} orientation="horizontal" className="items-center gap-2">
              <Checkbox
                checked={deck.enrichFields.includes(field)}
                onCheckedChange={(on) => toggle(field, on)}
              />
              <FieldLabel className="text-base text-text">{labels[field]}</FieldLabel>
            </Field>
          ))}
        </div>
      </FieldSet>
      <Field>
        <FieldLabel aside={t`Optional`}>{t`Instructions`}</FieldLabel>
        <Textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          onBlur={commit}
          maxLength={deckLimits.enrichInstructions}
          placeholder={t`Medical French for nurses. Use the clinical meaning.`}
          className="min-h-20"
        />
        <FieldDescription>{t`Only you see these.`}</FieldDescription>
      </Field>
    </div>
  );
}

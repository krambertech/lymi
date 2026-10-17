import { useLingui } from "@lingui/react/macro";
import { DECK_ENRICH_FIELDS, type DeckEnrichField, deckLimits } from "@lymi/core";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { DeckSummary } from "../lib/api";
import { CardNotes } from "./card-notes";
import { SourceChip } from "./chip";
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
 * Below them, read-only, is what the AI learned from the owner's own cards. ADR 0037.
 */
export function DeckAiCard({ deck, onSave }: Props) {
  const { t } = useLingui();
  const labels: Record<DeckEnrichField, string> = {
    meaning: t`Meaning`,
    example: t`Example`,
    notes: t`Notes`,
    pronunciation: t`Pronunciation`,
  };
  const style = deck.enrichStyle?.trim();
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
      {style ? (
        // Closed by default: it runs on its own, so it is there to check rather than to read.
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-sm text-sm text-text-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
            <span>{t`Learned from your cards`}</span>
            <SourceChip source="ai" size="xs" />
            <span className="ms-auto text-xs text-muted">{t`Automatic`}</span>
            <ChevronDown
              aria-hidden="true"
              className="size-4 shrink-0 text-muted transition-transform duration-150 group-open:rotate-180"
            />
          </summary>
          <div className="mt-2 grid gap-2">
            {/* A long note scrolls in its own box, so the settings below stay in reach. */}
            <section
              // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrolling box needs focus so a keyboard can scroll it
              tabIndex={0}
              aria-label={t`Learned from your cards`}
              className="max-h-48 overflow-y-auto rounded-md bg-plate-2 px-3 py-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <CardNotes source={style} className="text-sm text-text-2" />
            </section>
            <FieldDescription>
              {t`AI keeps this up to date from the cards you write. Your instructions come first.`}
            </FieldDescription>
          </div>
        </details>
      ) : (
        <FieldDescription>
          {t`AI learns how you write this deck’s cards as you add them.`}
        </FieldDescription>
      )}
    </div>
  );
}

import type { Card } from "@lymi/client/api";
import type { CardPatch } from "@lymi/core";

/** A card's text fields in the order Add a word and Edit card show them. */
export const FORM_FIELDS = [
  "term",
  "meaning",
  "pronunciation",
  "example",
  "notes",
  "hook",
  "source",
] as const;
export type FormField = (typeof FORM_FIELDS)[number];
export type FormValues = Record<FormField, string>;

export const EMPTY_FORM: FormValues = {
  term: "",
  meaning: "",
  pronunciation: "",
  example: "",
  notes: "",
  hook: "",
  source: "",
};

export function formValues(card: Card): FormValues {
  return {
    term: card.term,
    meaning: card.meaning ?? "",
    pronunciation: card.pronunciation ?? "",
    example: card.example ?? "",
    notes: card.notes ?? "",
    hook: card.hook ?? "",
    source: card.source ?? "",
  };
}

/** One field's new text as a patch; a field the AI wrote becomes the learner's once changed. */
function fieldPatch(field: FormField, value: string): CardPatch {
  if (field === "term" || field === "source") return { [field]: value };
  if (field === "hook") return { hook: value, ...(value ? { hookSource: "manual" as const } : {}) };
  return { [field]: value, [`${field}Source`]: "manual" };
}

/**
 * What a save sends: only the fields the learner typed in, and only where they now differ from
 * the card as it stands. A field left alone is never sent, so enrichment or another device
 * filling it while the form is open is kept.
 */
export function editPatch(card: FormValues, typed: Partial<FormValues>): CardPatch {
  let out: CardPatch = {};
  for (const f of FORM_FIELDS) {
    const text = typed[f];
    if (text === undefined) continue;
    const value = text.trim();
    // A card always has a term, so emptying it keeps the one it had.
    if (value === card[f].trim() || (f === "term" && !value)) continue;
    out = { ...out, ...fieldPatch(f, value) };
  }
  return out;
}

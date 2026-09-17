/** The fields enrichment may fill. Text already on a card is never overwritten, whatever wrote it. */
export const ENRICHED_FIELDS = ["meaning", "example", "pronunciation", "language"] as const;
export type EnrichedField = (typeof ENRICHED_FIELDS)[number];

/** A card as this rule reads it: the four fields, however the caller got them. */
export type Fillable = { [F in EnrichedField]?: string | null | undefined };

/** Which of a card's enrichable fields hold no text. Whitespace is not text. */
export function emptyFields(card: Fillable): EnrichedField[] {
  return ENRICHED_FIELDS.filter((field) => !card[field]?.trim());
}

/** True when a card has at least one empty field, so there is something to ask the AI for. */
export function needsEnrichment(card: Fillable): boolean {
  return emptyFields(card).length > 0;
}

/** The fields enrichment may fill. Text already on a card is never overwritten, whatever wrote it. */
export const ENRICHED_FIELDS = [
  "meaning",
  "example",
  "notes",
  "pronunciation",
  "language",
] as const;
export type EnrichedField = (typeof ENRICHED_FIELDS)[number];

/** The fields a deck lets the AI fill. Language is always filled, because audio needs it. */
export const DECK_ENRICH_FIELDS = ["meaning", "example", "notes", "pronunciation"] as const;
export type DeckEnrichField = (typeof DECK_ENRICH_FIELDS)[number];

/** Languages whose cards list a word's forms, so notes start on. */
const FORM_LANGUAGES = new Set(["et", "fi", "de", "nl", "sv"]);

/** Languages whose spelling does not show how a word is said or stressed, so pronunciation starts on. */
const READING_LANGUAGES = new Set(["zh", "ja", "ko", "ru", "uk"]);

/** What a deck is for: a language, a subject or exam, or something else. */
export const DECK_PURPOSES = ["language", "subject", "other"] as const;
type DeckPurpose = (typeof DECK_PURPOSES)[number];

/** A deck's stored purpose, or for a deck whose owner never said, a language deck when it has a language. */
export function deckPurpose(
  stored: DeckPurpose | null | undefined,
  language: string | null | undefined,
): DeckPurpose {
  return stored ?? (language ? "language" : "other");
}

/** What the AI may fill on a deck whose owner never chose, by the deck's purpose and language. */
export function defaultEnrichFields(
  language: string | null | undefined,
  purpose?: DeckPurpose | null,
): DeckEnrichField[] {
  const primary = language?.split("-")[0]?.toLowerCase();
  if (!primary || deckPurpose(purpose, language) !== "language") return ["meaning"];
  return [
    "meaning",
    "example",
    ...(FORM_LANGUAGES.has(primary) ? (["notes"] as const) : []),
    ...(READING_LANGUAGES.has(primary) ? (["pronunciation"] as const) : []),
  ];
}

/** How long a deck's learned style may be, so it stays a list and not an essay. ADR 0037. */
export const DECK_STYLE_MAX = 1200;

/** How long a deck's instructions to the AI may be. */
export const ENRICH_INSTRUCTIONS_MAX = 1000;

/** A deck's stored choice, or its purpose and language's default when the owner never made one. */
export function deckEnrichFields(
  stored: readonly string[] | null | undefined,
  language: string | null | undefined,
  purpose?: DeckPurpose | null,
): DeckEnrichField[] {
  if (!stored) return defaultEnrichFields(language, purpose);
  return DECK_ENRICH_FIELDS.filter((field) => stored.includes(field));
}

/** A card as this rule reads it: the enrichable fields, however the caller got them. */
export type Fillable = { [F in EnrichedField]?: string | null | undefined };

/** Which of a card's enrichable fields hold no text. Whitespace is not text. */
export function emptyFields(card: Fillable): EnrichedField[] {
  return ENRICHED_FIELDS.filter((field) => !card[field]?.trim());
}

/** True when a field the deck lets the AI fill is empty, so there is something to ask it for. */
export function needsEnrichment(card: Fillable, fields: readonly DeckEnrichField[]): boolean {
  return emptyFields(card).some((field) => allows(fields, field));
}

/** Which fields were never set. A run fills only these: a stored "" is a deliberate clear. */
export function unsetFields(card: Fillable): EnrichedField[] {
  return ENRICHED_FIELDS.filter((field) => card[field] == null);
}

/** The unset fields a run may fill in a deck that chose `fields`: those, and the language. */
export function fieldsToFill(card: Fillable, fields: readonly DeckEnrichField[]): EnrichedField[] {
  return unsetFields(card).filter((field) => allows(fields, field));
}

function allows(fields: readonly DeckEnrichField[], field: EnrichedField): boolean {
  return field === "language" || (fields as readonly string[]).includes(field);
}

import { configuredLanguage } from "./languages";

/** The fields enrichment may fill. Text already on a card is never overwritten, whatever wrote it. */
export const ENRICHED_FIELDS = [
  "meaning",
  "example",
  "notes",
  "pronunciation",
  "language",
] as const;
export type EnrichedField = (typeof ENRICHED_FIELDS)[number];

/**
 * How long a card may say `working` before it is treated as failed. It must outlast the slowest
 * run that can still finish: a 200-card add is 20 model calls in a row, each up to 4 tries of
 * 5 minutes, about 7 hours with the final settle. A card still `working` past a day has lost its
 * run, so it reads as failed and the learner can ask again.
 */
export const ENRICHMENT_STALLED_AFTER = 24 * 60 * 60_000;

/** True for a card still at `working` long after its last change, whose run will never settle it. */
export function enrichmentStalled(
  card: { enrichmentStatus: string | null; updatedAt: Date | string },
  now: number = Date.now(),
): boolean {
  return (
    card.enrichmentStatus === "working" &&
    now - new Date(card.updatedAt).getTime() >= ENRICHMENT_STALLED_AFTER
  );
}

/** The fields a deck lets the AI fill. Language is always filled, because audio needs it. */
export const DECK_ENRICH_FIELDS = ["meaning", "example", "notes", "pronunciation"] as const;
export type DeckEnrichField = (typeof DECK_ENRICH_FIELDS)[number];

/** Languages without a configured row whose cards list a word's forms, so notes start on. */
const FORM_LANGUAGES = new Set(["et", "fi", "de", "nl", "sv"]);

/** Languages without a configured row whose spelling does not show how a word is said or stressed. */
const READING_LANGUAGES = new Set(["zh", "ja", "ru", "uk"]);

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
  // Below the evaluation's bar a deck that never chose stays where it was before the row existed.
  const configured = configuredLanguage(language);
  if (configured && !configured.enrichByDefault) return ["meaning", "example"];
  const starts = (field: "notes" | "pronunciation", fallback: ReadonlySet<string>) =>
    configured ? configured.starts.includes(field) : fallback.has(primary);
  return [
    "meaning",
    "example",
    ...(starts("notes", FORM_LANGUAGES) ? (["notes"] as const) : []),
    ...(starts("pronunciation", READING_LANGUAGES) ? (["pronunciation"] as const) : []),
  ];
}

/**
 * What a new deck stores when its owner chose no AI fields: none in a language below the
 * evaluation's bar, so the AI waits to be asked; otherwise nothing, and the deck follows its
 * language's defaults. Stored, so a later move of the bar never changes an existing deck.
 * docs/proposals/long-tail-languages.md.
 */
export function newDeckEnrichFields(
  language: string | null | undefined,
  purpose?: DeckPurpose | null,
): DeckEnrichField[] | null {
  if (deckPurpose(purpose, language) !== "language") return null;
  return configuredLanguage(language)?.enrichByDefault === false ? [] : null;
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

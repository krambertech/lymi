import { configuredLanguage, languageSupport } from "./languages";

export const ENRICHED_FIELDS = [
  "meaning",
  "example",
  "notes",
  "pronunciation",
  "language",
] as const;
export type EnrichedField = (typeof ENRICHED_FIELDS)[number];

export const ENRICHMENT_STALLED_AFTER = 24 * 60 * 60_000;

export function enrichmentStalled(
  card: { enrichmentStatus: string | null; updatedAt: Date | string },
  now: number = Date.now(),
): boolean {
  return (
    card.enrichmentStatus === "working" &&
    now - new Date(card.updatedAt).getTime() >= ENRICHMENT_STALLED_AFTER
  );
}

export const DECK_ENRICH_FIELDS = [
  "meaning",
  "example",
  "exampleTranslation",
  "notes",
  "pronunciation",
] as const;
export type DeckEnrichField = (typeof DECK_ENRICH_FIELDS)[number];

const READING_LANGUAGES = new Set(["zh", "ja", "ru", "uk"]);

export const DECK_PURPOSES = ["language", "subject", "other"] as const;
type DeckPurpose = (typeof DECK_PURPOSES)[number];

export function deckPurpose(
  stored: DeckPurpose | null | undefined,
  language: string | null | undefined,
): DeckPurpose {
  return stored ?? (language ? "language" : "other");
}

export function defaultEnrichFields(
  language: string | null | undefined,
  purpose?: DeckPurpose | null,
): DeckEnrichField[] {
  const primary = language?.split("-")[0]?.toLowerCase();
  if (!primary || deckPurpose(purpose, language) !== "language") return ["meaning"];
  const configured = configuredLanguage(language);
  if (configured && !configured.enrichByDefault)
    return ["meaning", "example", "exampleTranslation"];
  const pronounced = configured
    ? configured.starts.includes("pronunciation")
    : languageSupport(language) !== null || READING_LANGUAGES.has(primary);
  return [
    "meaning",
    "example",
    "exampleTranslation",
    ...(configured?.starts.includes("notes") ? (["notes"] as const) : []),
    ...(pronounced ? (["pronunciation"] as const) : []),
  ];
}

export function newDeckEnrichFields(
  language: string | null | undefined,
  purpose?: DeckPurpose | null,
): DeckEnrichField[] | null {
  if (deckPurpose(purpose, language) !== "language") return null;
  return configuredLanguage(language)?.enrichByDefault === false ? [] : null;
}

export const DECK_STYLE_MAX = 1200;

export const ENRICH_INSTRUCTIONS_MAX = 1000;

export function deckEnrichFields(
  stored: readonly string[] | null | undefined,
  language: string | null | undefined,
  purpose?: DeckPurpose | null,
): DeckEnrichField[] {
  if (!stored) return defaultEnrichFields(language, purpose);
  return DECK_ENRICH_FIELDS.filter((field) => stored.includes(field));
}

export type Fillable = { [F in EnrichedField]?: string | null | undefined };

export function emptyFields(card: Fillable): EnrichedField[] {
  return ENRICHED_FIELDS.filter((field) => !card[field]?.trim());
}

export function needsEnrichment(card: Fillable, fields: readonly DeckEnrichField[]): boolean {
  return emptyFields(card).some((field) => allows(fields, field));
}

export function unsetFields(card: Fillable): EnrichedField[] {
  return ENRICHED_FIELDS.filter((field) => card[field] == null);
}

export function fieldsToFill(card: Fillable, fields: readonly DeckEnrichField[]): EnrichedField[] {
  return unsetFields(card).filter((field) => allows(fields, field));
}

function allows(fields: readonly DeckEnrichField[], field: EnrichedField): boolean {
  return field === "language" || (fields as readonly string[]).includes(field);
}

export function wantsTranslation(
  card: { example?: string | null | undefined; exampleTranslation?: string | null | undefined },
  fields: readonly DeckEnrichField[],
): boolean {
  return (
    fields.includes("exampleTranslation") &&
    !!card.example?.trim() &&
    card.exampleTranslation == null
  );
}

export function canEnrich(
  card: Fillable & { exampleTranslation?: string | null | undefined },
  fields: readonly DeckEnrichField[],
): boolean {
  return (
    needsEnrichment(card, fields) ||
    wantsTranslation(
      { example: card.example, exampleTranslation: card.exampleTranslation?.trim() || null },
      fields,
    )
  );
}

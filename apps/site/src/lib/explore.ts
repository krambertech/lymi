import { PUBLICATION_CATEGORIES } from "@lymi/core";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import { type Locale, locales } from "./routes";

export function explorePath(locale: string): string {
  return locale === "en" ? "/explore" : `/${locale}/explore`;
}

export function explorePaths(): Record<Locale, string> {
  return Object.fromEntries(locales.map((locale) => [locale, explorePath(locale)])) as Record<
    Locale,
    string
  >;
}

/**
 * The shelves, in the order they appear, from the column's own list so the two cannot drift.
 * A deck sits on one shelf; a deck with no category gathers at the end, so publishing is never
 * blocked on choosing one. The headings themselves are in `explore-labels.ts`.
 */
export const CATEGORY_ORDER: readonly string[] = PUBLICATION_CATEGORIES;
export const UNCATEGORISED = "other";

export interface Shelf {
  key: string;
  decks: PublicDeckSummary[];
}

/** Decks grouped into shelves, in category order, with uncategorised decks last. */
export function shelvesOf(decks: readonly PublicDeckSummary[]): Shelf[] {
  const byCategory = new Map<string, PublicDeckSummary[]>();
  for (const deck of decks) {
    const key =
      deck.category && CATEGORY_ORDER.includes(deck.category) ? deck.category : UNCATEGORISED;
    const shelf = byCategory.get(key);
    if (shelf) shelf.push(deck);
    else byCategory.set(key, [deck]);
  }
  return [...CATEGORY_ORDER, UNCATEGORISED]
    .filter((key) => byCategory.has(key))
    .map((key) => ({ key, decks: byCategory.get(key) as PublicDeckSummary[] }));
}

/** FNV-1a of everything the page shows, folded into one value for the ETag. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function catalogContentHash(decks: readonly PublicDeckSummary[]): string {
  return hash(JSON.stringify(decks)).toString(36);
}

export function catalogEtag(parts: {
  content: string;
  locale: Locale;
  version: string | undefined;
}): string {
  return `W/"explore-${parts.content}-${parts.locale}-${parts.version ?? "dev"}"`;
}

/**
 * Searchable text for one deck: its name, summary, languages and the card on its tray. The
 * locale is the reader's, so the haystack folds case exactly as the typed query does.
 */
export function searchText(
  deck: PublicDeckSummary,
  languageNames: string[],
  locale: string,
): string {
  return [
    deck.name,
    deck.summary,
    deck.level,
    deck.card?.term,
    deck.card?.meaning,
    ...languageNames,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase(locale);
}

import type { PublicDeckSummary, ShelfRoute } from "@lymi/core/catalog";
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

/** A shelf's own page: `/explore/languages/german`, `/uk/explore/subjects/citizenship`. */
export function shelfPath(route: ShelfRoute, locale: string): string {
  return `${explorePath(locale)}/${route.kind}/${route.name}`;
}

/** The shelves and their order live in core, so both Explores group decks the same way. */
export {
  hasShelfPage,
  type Shelf,
  type ShelfRoute,
  shelfAt,
  shelfRoute,
  shelvesOf,
  UNCATEGORISED,
} from "@lymi/core/catalog";

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
  /** Which page of the catalogue, so a shelf's page never validates Explore's copy. */
  page?: string | undefined;
}): string {
  return `W/"${parts.page ?? "explore"}-${parts.content}-${parts.locale}-${parts.version ?? "dev"}"`;
}

/**
 * Searchable text for one deck: its name, summary, the card on its tray, and the names of its shelf,
 * languages and tags. The locale is the reader's, so the haystack folds case exactly as the typed
 * query does.
 */
export function searchText(deck: PublicDeckSummary, names: string[], locale: string): string {
  return [deck.name, deck.summary, deck.card?.term, deck.card?.meaning, ...names]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase(locale);
}

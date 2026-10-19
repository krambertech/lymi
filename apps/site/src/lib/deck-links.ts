import {
  hasShelfPage,
  type PublicDeckSummary,
  type ShelfRoute,
  shelfRoute,
  shelvesOf,
  taughtLanguage,
} from "@lymi/core/catalog";

/** A deck page links to this many of each kind of neighbour, so every deck is reached from several. */
export const LINKS_PER_GROUP = 12;

type Linkable = Pick<PublicDeckSummary, "slug" | "language" | "category">;

/** The words a slug may name a language by, as its shelf page does: "pt-BR" is "brazilian-portuguese", then "portuguese". */
function slugWords(tag: string | null): string[] {
  if (!tag) return [];
  const words = [tag, tag.split("-")[0] ?? tag].flatMap((each) => {
    const name = shelfRoute({ key: "", language: each })?.name;
    return name ? [name] : [];
  });
  return [...new Set(words)];
}

/**
 * What a deck covers, whatever its language: its slug with the language's own word taken out, so
 * `travel-greek` and `travel-finnish` are both `travel-*`. Null when the slug does not name the
 * language, since then there is nothing to match on.
 */
export function topicKey(deck: Pick<Linkable, "slug" | "language">): string | null {
  const parts = `-${deck.slug}-`;
  for (const word of slugWords(deck.language)) {
    const marked = parts.replace(`-${word}-`, "-*-");
    if (marked !== parts) return marked.slice(1, -1);
  }
  return null;
}

const baseLanguage = (deck: Linkable) => taughtLanguage(deck)?.split("-")[0] ?? null;

/**
 * Up to `limit` of `list`, starting just after `slug` and wrapping round, so each deck links to the
 * ones after it and every deck in a long list is linked from the ones before it.
 */
function after<T extends Pick<Linkable, "slug">>(list: readonly T[], slug: string, limit: number) {
  const at = list.findIndex((each) => each.slug === slug);
  const rest = at < 0 ? list : [...list.slice(at + 1), ...list.slice(0, at)];
  return rest.filter((each) => each.slug !== slug).slice(0, limit);
}

/** The other decks teaching the same language, after this one in the catalogue's order. */
export function sameLanguageDecks<T extends Linkable>(
  catalog: readonly T[],
  deck: Linkable,
  limit = LINKS_PER_GROUP,
): T[] {
  const language = baseLanguage(deck);
  if (!language) return [];
  const same = catalog.filter((other) => baseLanguage(other) === language);
  return after(same, deck.slug, limit);
}

/** The decks on the same topic in other languages, such as every A1 list or every travel deck. */
export function sameTopicDecks<T extends Linkable>(
  catalog: readonly T[],
  deck: Linkable,
  limit = LINKS_PER_GROUP,
): T[] {
  const key = topicKey(deck);
  if (!key) return [];
  const language = baseLanguage(deck);
  const same = catalog.filter(
    (other) =>
      topicKey(other) === key &&
      (other.slug === deck.slug || !language || baseLanguage(other) !== language),
  );
  return after(same, deck.slug, limit);
}

export interface DeckShelfLink {
  route: ShelfRoute;
  language: string | null;
  key: string;
}

/** The shelf page a deck sits on in this catalogue, when that shelf has a page. */
export function deckShelf(catalog: readonly Linkable[], slug: string): DeckShelfLink | null {
  const shelf = shelvesOf(catalog).find((each) => each.decks.some((deck) => deck.slug === slug));
  if (!shelf || !hasShelfPage(shelf)) return null;
  const route = shelfRoute(shelf);
  return route ? { route, language: shelf.language, key: shelf.key } : null;
}

export interface DeckLinks<T = PublicDeckSummary> {
  shelf: DeckShelfLink | null;
  language: T[];
  topic: T[];
}

/** Everything a deck page links to besides More like this, which it leaves out to avoid repeats. */
export function deckLinks<T extends Linkable>(
  catalog: readonly T[],
  deck: Linkable,
  shown: readonly Pick<PublicDeckSummary, "slug">[] = [],
): DeckLinks<T> {
  const skip = new Set(shown.map((each) => each.slug));
  const fresh = catalog.filter((each) => !skip.has(each.slug));
  return {
    shelf: deckShelf(catalog, deck.slug),
    language: sameLanguageDecks(fresh, deck),
    topic: sameTopicDecks(fresh, deck),
  };
}

/** The picked links with each deck swapped for its Explore row, dropping any that no longer loads. */
export function withSummaries(
  links: DeckLinks<Pick<PublicDeckSummary, "slug">>,
  summaries: readonly PublicDeckSummary[],
): DeckLinks {
  const bySlug = new Map(summaries.map((each) => [each.slug, each]));
  const rows = (decks: readonly Pick<PublicDeckSummary, "slug">[]) =>
    decks.flatMap((deck) => bySlug.get(deck.slug) ?? []);
  return { shelf: links.shelf, language: rows(links.language), topic: rows(links.topic) };
}

/** Every deck a set of picked links names, once, for loading their rows in one query. */
export function linkedSlugs(links: DeckLinks<Pick<PublicDeckSummary, "slug">>): string[] {
  return [...new Set([...links.language, ...links.topic].map((deck) => deck.slug))];
}

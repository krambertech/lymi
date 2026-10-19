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

/** A language tag's English name as it appears in a slug: "pt-BR" is "brazilian-portuguese". */
function slugWord(tag: string | null): string | null {
  if (!tag) return null;
  try {
    const name = new Intl.DisplayNames(["en"], { type: "language" }).of(tag);
    return name ? name.toLowerCase().replace(/[^a-z0-9]+/g, "-") : null;
  } catch {
    return null;
  }
}

/**
 * What a deck covers, whatever its language: its slug with the language's own word taken out, so
 * `travel-greek` and `travel-finnish` are both `travel-*`. Null when the slug does not name the
 * language, since then there is nothing to match on.
 */
export function topicKey(deck: Pick<Linkable, "slug" | "language">): string | null {
  const word = slugWord(deck.language);
  if (!word) return null;
  const parts = `-${deck.slug}-`;
  const marked = parts.replace(`-${word}-`, "-*-");
  return marked === parts ? null : marked.slice(1, -1);
}

/** The other decks teaching the same language, in the catalogue's order. */
export function sameLanguageDecks<T extends Linkable>(
  catalog: readonly T[],
  deck: Linkable,
  limit = LINKS_PER_GROUP,
): T[] {
  const language = taughtLanguage(deck)?.split("-")[0];
  if (!language) return [];
  return catalog
    .filter(
      (other) => other.slug !== deck.slug && taughtLanguage(other)?.split("-")[0] === language,
    )
    .slice(0, limit);
}

/** The decks on the same topic in other languages, such as every A1 list or every travel deck. */
export function sameTopicDecks<T extends Linkable>(
  catalog: readonly T[],
  deck: Linkable,
  limit = LINKS_PER_GROUP,
): T[] {
  const key = topicKey(deck);
  if (!key) return [];
  return catalog
    .filter((other) => other.slug !== deck.slug && topicKey(other) === key)
    .slice(0, limit);
}

/** The shelf page a deck sits on in this catalogue, when that shelf has a page. */
export function deckShelf(
  catalog: readonly PublicDeckSummary[],
  slug: string,
): { route: ShelfRoute; language: string | null; key: string } | null {
  const shelf = shelvesOf(catalog).find((each) => each.decks.some((deck) => deck.slug === slug));
  if (!shelf || !hasShelfPage(shelf)) return null;
  const route = shelfRoute(shelf);
  return route ? { route, language: shelf.language, key: shelf.key } : null;
}

export interface DeckLinks {
  shelf: { route: ShelfRoute; language: string | null; key: string } | null;
  language: PublicDeckSummary[];
  topic: PublicDeckSummary[];
}

/** Everything a deck page links to besides More like this, which it leaves out to avoid repeats. */
export function deckLinks(
  catalog: readonly PublicDeckSummary[],
  deck: Linkable,
  shown: readonly Pick<PublicDeckSummary, "slug">[] = [],
): DeckLinks {
  const skip = new Set(shown.map((each) => each.slug));
  const fresh = catalog.filter((each) => !skip.has(each.slug));
  return {
    shelf: deckShelf(catalog, deck.slug),
    language: sameLanguageDecks(fresh, deck),
    topic: sameTopicDecks(fresh, deck),
  };
}

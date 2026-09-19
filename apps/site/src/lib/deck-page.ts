import type { PublicDeckOut } from "@lymi/core/catalog";
import { HAND_SIZE } from "./hand";
import { type Locale, locales } from "./routes";

const SITE = "https://lymi.app";

/** The most cards laid out at the top of the page. */
export const SPREAD_SIZE = 5;
/** How many cards the page's hand holds, which is the hand's own size so a second round matches. */
export const STACK_SIZE = HAND_SIZE;

export type DeckCard = {
  term: string;
  meaning: string;
  section: string | null;
  image?: PublicDeckOut["sections"][number]["cards"][number]["image"];
  audio?: PublicDeckOut["sections"][number]["cards"][number]["audio"];
};

export function deckPath(slug: string, locale: Locale): string {
  return locale === "en" ? `/explore/${slug}` : `/${locale}/explore/${slug}`;
}

/**
 * Where a link to the old `/decks/<slug>` address goes now. A deck's address was shared before
 * Explore existed, so it answers a permanent redirect rather than a 404.
 */
export function movedDeckPath(pathname: string): string | null {
  const match = /^(?:\/(uk|ru))?\/decks\/([^/]+)\/?$/.exec(pathname);
  if (!match) return null;
  const locale = (match[1] ?? "en") as Locale;
  return deckPath(match[2] as string, locale);
}

/** The product's add page for a `/add/<slug>` link typed or shared with the wrong domain. */
export function productAddPath(pathname: string): string | null {
  const match = /^\/add\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(pathname);
  return match ? `/add/${match[1]}` : null;
}

/** The deck's own link preview, rendered by the Worker beside the page. */
export function deckSharePath(slug: string, locale: Locale): string {
  return `${deckPath(slug, locale)}/share.png`;
}

export function deckPaths(slug: string): Record<Locale, string> {
  return Object.fromEntries(locales.map((locale) => [locale, deckPath(slug, locale)])) as Record<
    Locale,
    string
  >;
}

function sectionsWithMeanings(deck: PublicDeckOut): DeckCard[][] {
  return deck.sections
    .map((section) =>
      section.cards.flatMap((card) =>
        card.meaning
          ? [
              {
                term: card.term,
                meaning: card.meaning,
                section: section.name,
                image: card.image,
                audio: card.audio,
              },
            ]
          : [],
      ),
    )
    .filter((cards) => cards.length > 0);
}

/** FNV-1a, so the spread stays the same for one revision of a deck. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Distinct cards from anywhere in the deck, shuffled from the deck own revision rather than at
 * random, so everyone who loads one revision is served the same page and its ETag stays honest.
 */
export function stackCards(deck: PublicDeckOut, size = STACK_SIZE): DeckCard[] {
  const cards = sectionsWithMeanings(deck).flat();
  let seed = hash(`${deck.slug}:${deck.revision}:stack`);
  for (let i = cards.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const j = seed % (i + 1);
    [cards[i], cards[j]] = [cards[j] as DeckCard, cards[i] as DeckCard];
  }
  return cards.slice(0, size);
}

/**
 * The cards laid out at the top of the page, in deck order: one from each of sections spread evenly
 * through the deck, preferring cards short enough to read at a glance. A deck with fewer sections
 * than places gives more than one card from a section. The choice changes only with the revision.
 */
export function spreadCards(deck: PublicDeckOut, size = SPREAD_SIZE): DeckCard[] {
  const groups = sectionsWithMeanings(deck);
  const count = Math.min(
    size,
    groups.reduce((sum, cards) => sum + cards.length, 0),
  );
  if (count === 0) return [];
  const perGroup = groups.map(() => 0);
  if (groups.length >= count) {
    for (let i = 0; i < count; i++) {
      const at = count === 1 ? 0 : Math.round((i * (groups.length - 1)) / (count - 1));
      perGroup[at] = 1;
    }
  } else {
    for (let placed = 0; placed < count; ) {
      groups.forEach((cards, at) => {
        if (placed < count && (perGroup[at] ?? 0) < cards.length) {
          perGroup[at] = (perGroup[at] ?? 0) + 1;
          placed++;
        }
      });
    }
  }
  return groups.flatMap((cards, at) => {
    const take = perGroup[at] ?? 0;
    if (take === 0) return [];
    const glanceable = cards.filter((card) => card.term.length <= 20 && card.meaning.length <= 36);
    const from = glanceable.length >= take ? glanceable : cards;
    const start = hash(`${deck.slug}:${deck.revision}:${at}`) % from.length;
    return Array.from({ length: take }, (_, k) => from[(start + k) % from.length] as DeckCard);
  });
}

export interface SectionStep {
  /** 1-based place in the deck's order, or null for cards outside any section. */
  position: number | null;
  name: string | null;
  cards: PublicDeckOut["sections"][number]["cards"];
}

/**
 * The deck as the path a learner walks: named sections in order, then any cards outside one.
 * `inOrder` is false for a deck with no sections, whose cards are one open group.
 */
export function sectionPath(deck: PublicDeckOut): { inOrder: boolean; steps: SectionStep[] } {
  let position = 0;
  const steps = deck.sections.map((section) => ({
    position: section.name === null ? null : ++position,
    name: section.name,
    cards: section.cards,
  }));
  return { inOrder: position > 0, steps };
}

/**
 * A language tag's name in the page's language. Ukrainian and Russian write it lower-case inside
 * a sentence, so `label` capitalises it only where it starts a label on its own.
 */
export function languageName(
  tag: string | null,
  locale: string,
  { label = false }: { label?: boolean } = {},
): string | null {
  if (!tag) return null;
  let name: string;
  try {
    name = new Intl.DisplayNames([locale], { type: "language" }).of(tag) ?? tag;
  } catch {
    return tag;
  }
  return label ? name.charAt(0).toLocaleUpperCase(locale) + name.slice(1) : name;
}

/**
 * Everything the page renders, folded into one value. The publish revision moves only on publish
 * and withdrawal, so a corrected meaning or a new card would otherwise keep its old validator.
 */
export function deckContentHash(deck: PublicDeckOut): string {
  return hash(JSON.stringify(deck)).toString(36);
}

/**
 * Changes whenever what the page shows changes: the deck's own content, the locale it is read in,
 * and the Worker that rendered it. It never depends on who is asking.
 */
export function deckEtag(parts: {
  slug: string;
  content: string;
  locale: Locale;
  version: string | undefined;
}): string {
  return `W/"deck-${parts.slug}-${parts.content}-${parts.locale}-${parts.version ?? "dev"}"`;
}

export function etagMatches(ifNoneMatch: string | null, etag: string): boolean {
  if (!ifNoneMatch) return false;
  const bare = (tag: string) => tag.trim().replace(/^W\//, "");
  return ifNoneMatch.split(",").some((tag) => tag.trim() === "*" || bare(tag) === bare(etag));
}

/** Short and public: a publisher's correction reaches visitors within minutes. */
export const DECK_CACHE_CONTROL = "public, max-age=300";
export const MISSING_CACHE_CONTROL = "public, max-age=60";

/** schema.org LearningResource: a vocabulary list with its CEFR level and the language it teaches. */
export function deckStructuredData(deck: PublicDeckOut, locale: Locale) {
  const url = new URL(deckPath(deck.slug, locale), SITE).toString();
  const language = languageName(deck.language, "en");
  return {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    "@id": url,
    url,
    name: deck.name,
    description: deck.summary,
    learningResourceType: "Vocabulary list",
    inLanguage: [...new Set([deck.language, deck.meaningLanguage].filter(Boolean))],
    ...(language && {
      teaches: `${language} vocabulary`,
      about: { "@type": "Language", name: language, alternateName: deck.language },
    }),
    ...(deck.level && {
      educationalLevel: {
        "@type": "DefinedTerm",
        name: deck.level,
        termCode: deck.level,
        inDefinedTermSet:
          "https://www.coe.int/en/web/common-european-framework-reference-languages",
      },
    }),
    publisher: { "@type": "Organization", name: deck.publisher },
    datePublished: deck.publishedAt,
    ...(deck.sources.length > 0 && {
      citation: deck.sources.map((source) => ({
        "@type": "CreativeWork",
        name: source.title,
        ...(source.url && { url: source.url }),
      })),
    }),
    isPartOf: { "@type": "WebSite", name: "Lymi", url: `${SITE}/` },
  };
}

/** JSON for a `<script>` element: `<` is escaped so a card cannot close the element. */
export function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

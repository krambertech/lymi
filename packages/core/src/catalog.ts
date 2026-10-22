// Portable: the phone imports this, so database reads stay in catalog-server.ts.
import { z } from "zod";
import { isImageMode } from "./modes";
import { OPEN } from "./responses/common";
import {
  PUBLICATION_CATEGORIES,
  PUBLICATION_SLUG,
  PublicationTag,
  ReviewModeKey,
  SectionProgression,
} from "./types";

/** A card's picture on a public page: only one whose publisher described it is ever public. */
const PublicImage = z.object({
  cardId: z.string(),
  description: z.string(),
  width: z.number().int(),
  height: z.number().int(),
});

/**
 * What a public deck page may show, and nothing else. This is the security boundary of
 * ADR 0016: the public Worker reads only through `loadPublicDeck`, which selects only these
 * fields, and every result is parsed through this schema so an extra column cannot pass.
 */
export const PublicDeckOut = z.object({
  slug: z.string(),
  name: z.string(),
  summary: z.string(),
  category: z.string().nullable(),
  tags: z.array(PublicationTag),
  /** The language the terms are in, from the deck. */
  language: z.string().nullable(),
  /** The meaning language of the edition on this page. */
  meaningLanguage: z.string(),
  /** The language the deck's own fields are written in, whichever edition is shown. */
  originalMeaningLanguage: z.string(),
  /** Every meaning language the deck can be read in, the original first. */
  editions: z.array(z.string()),
  publisher: z.string(),
  /**
   * The version of the publisher's photo, or null when they have none. Never an account id:
   * the image is fetched by this deck's slug, so ADR 0016's boundary keeps holding.
   */
  publisherAvatar: z.string().nullable(),
  sources: z.array(z.object({ title: z.string(), url: z.string().optional() })),
  reviewedAt: z.iso.datetime().nullable(),
  revision: z.number().int(),
  publishedAt: z.iso.datetime(),
  cardCount: z.number().int(),
  /** How each learner's sections open, so a page describes the deck's own order. */
  sectionProgression: SectionProgression,
  /** In deck order. A group with no name holds the cards outside any active section, last. */
  sections: z.array(
    z.object({
      name: z.string().nullable(),
      /** The language the name is in, when it is not `meaningLanguage`: an edition's section with no approved name shows the original's. */
      nameLanguage: z.string().optional(),
      cards: z.array(
        z.object({
          term: z.string(),
          meaning: z.string().nullable(),
          /** The modes a learner is asked this card in, so a preview asks it the same way. */
          modes: z.array(ReviewModeKey.meta(OPEN)).min(1),
          image: PublicImage.optional(),
          audio: z.object({ cardId: z.string() }).optional(),
        }),
      ),
    }),
  ),
});
export type PublicDeckOut = z.infer<typeof PublicDeckOut>;

/** `missing` is a 404 and `unavailable` a 410: withdrawn, archived, or with no cards left. */
export type PublicDeckResult =
  | { status: "published"; deck: PublicDeckOut }
  | { status: "unavailable" }
  | { status: "missing" };

/**
 * Which version of a learner's photo is the live one. A photo they chose themselves wins over
 * the one Google supplied, and a key without a version is a half-written row rather than a photo.
 */
export function activeAvatarVersion(row: {
  customKey?: string | null | undefined;
  customVersion?: string | null | undefined;
  googleVersion?: string | null | undefined;
}): string | null {
  if (row.customKey && row.customVersion) return row.customVersion;
  return row.googleVersion ?? null;
}

/** Where a published deck's publisher photo is served, beside the deck's approved media. */
export function publisherAvatarPath(slug: string, version: string): string {
  const path = `/public/media/deck/${encodeURIComponent(slug)}/publisher-avatar`;
  return `${path}?v=${encodeURIComponent(version)}`;
}

export function isPublicDeckSlug(slug: string | undefined): slug is string {
  return typeof slug === "string" && slug.length <= 80 && PUBLICATION_SLUG.test(slug);
}

/**
 * The one mode a public preview shows a card in. A picture is the most telling cue a card has, so
 * a picture mode goes first; otherwise the place in the preview steps through the card's modes,
 * so a deck asked both ways shows both.
 */
export function previewMode(
  card: { modes: readonly ReviewModeKey[]; image?: unknown },
  place = 0,
): ReviewModeKey {
  const picture = card.image ? card.modes.find(isImageMode) : undefined;
  if (picture) return picture;
  const text = card.modes.filter((key) => !isImageMode(key));
  return text[place % text.length] ?? "term_to_meaning";
}

/**
 * What Explore may show for each deck, and nothing else. The second allowlist of ADR 0016:
 * `listPublicCatalog` selects only these fields and every row is parsed through this schema.
 */
export const PublicDeckSummary = z.object({
  slug: z.string(),
  name: z.string(),
  summary: z.string(),
  category: z.string().nullable(),
  tags: z.array(PublicationTag),
  /** The language the terms are in, from the deck. */
  language: z.string().nullable(),
  /** The meaning language this row is written in, which is the edition Explore showed. */
  meaningLanguage: z.string(),
  cardCount: z.number().int(),
  sectionCount: z.number().int(),
  /** One card from the deck, for its tray. Null for a deck whose cards have no meanings. */
  card: z
    .object({
      term: z.string(),
      meaning: z.string(),
      section: z.string().nullable(),
      /**
       * The language the section is named in, when that is not `meaningLanguage`: an edition
       * whose section has no approved name keeps the original deck's, in the original's language.
       */
      sectionLanguage: z.string().optional(),
      /** The mode the tray shows it in, as the deck page's preview would. */
      mode: ReviewModeKey.meta(OPEN),
      image: PublicImage.optional(),
    })
    .nullable(),
});
export type PublicDeckSummary = z.infer<typeof PublicDeckSummary>;

/** The meaning languages whose readers can also use a deck written in English. */
const READ_ENGLISH_TOO = ["uk", "ru"];

/**
 * Whether a reader whose meaning language is `language` can use a deck: it is written in that
 * language or has a published edition in it, or, for a Ukrainian or Russian reader, it is written in
 * English. Explore, the sitemap and More like this list a deck only where this holds; its own page
 * answers in every locale. `docs/design/explore.md` owns the rule.
 */
export function readableIn(
  deck: { meaningLanguage: string; editions: readonly string[] },
  language: string,
): boolean {
  if (sameLanguage(deck.meaningLanguage, language)) return true;
  if (deck.editions.some((edition) => sameLanguage(edition, language))) return true;
  return (
    sameLanguage(deck.meaningLanguage, "en") &&
    READ_ENGLISH_TOO.some((reader) => sameLanguage(reader, language))
  );
}

/** What decides whether two published decks are related. */
export interface RelatedCandidate {
  slug: string;
  tags: readonly string[];
  category: string | null;
  /** The deck's language, which counts only while the deck is not on a subject shelf. */
  language: string | null;
}

/** "pt-BR" and "pt" teach the same language; a deck with no language shares it with nobody. */
function sameLanguage(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  return a.split("-")[0]?.toLowerCase() === b.split("-")[0]?.toLowerCase();
}

/**
 * The decks most like one, in order: the most shared tags, then the same taught language, then the same
 * shelf, with the catalogue's own order breaking ties. A deck sharing none of the three is left
 * out, so a deck with nothing like it gets an empty list rather than a row of strangers.
 */
export function rankRelated(
  deck: RelatedCandidate,
  candidates: readonly RelatedCandidate[],
  limit: number,
): string[] {
  return candidates
    .filter((other) => other.slug !== deck.slug)
    .map((other, at) => ({
      slug: other.slug,
      at,
      tags: other.tags.filter((tag) => deck.tags.includes(tag)).length,
      // A subject deck's terms are merely spoken in a language, so it shares no language with anyone.
      language: sameLanguage(taughtLanguage(deck), taughtLanguage(other)) ? 1 : 0,
      category: deck.category !== null && deck.category === other.category ? 1 : 0,
    }))
    .filter((other) => other.tags + other.language + other.category > 0)
    .sort(
      (a, b) =>
        b.tags - a.tags || b.language - a.language || b.category - a.category || a.at - b.at,
    )
    .slice(0, limit)
    .map((other) => other.slug);
}

/** FNV-1a, so a deck's tray hue, and its tray card for one revision, stay the same. */
export function stableHash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The most cards a deck page lays out at the top. */
export const DECK_PAGE_SPREAD = 5;
/** How many cards a deck page's hand holds. */
export const DECK_PAGE_HAND = 5;

/**
 * The cards of a deck page's hand: distinct cards from anywhere in the deck, shuffled from the
 * deck's own revision rather than at random, so everyone who loads one revision is served the
 * same page and its ETag stays honest. The product voices these ahead of a first play. #759.
 */
export function deckPageHand<T>(
  deck: { slug: string; revision: number },
  groups: readonly (readonly T[])[],
  size = DECK_PAGE_HAND,
): T[] {
  const cards = groups.flat();
  let seed = stableHash(`${deck.slug}:${deck.revision}:stack`);
  for (let i = cards.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const j = seed % (i + 1);
    [cards[i], cards[j]] = [cards[j] as T, cards[i] as T];
  }
  return cards.slice(0, size);
}

/**
 * The cards laid out at the top of a deck page, in deck order: one from each of sections spread
 * evenly through the deck, preferring cards short enough to read at a glance. A deck with fewer
 * sections than places gives more than one card from a section. The choice changes only with
 * the revision. The product voices these ahead of a first play. #759.
 */
export function deckPageSpread<T extends { term: string; meaning: string }>(
  deck: { slug: string; revision: number },
  groups: readonly (readonly T[])[],
  size = DECK_PAGE_SPREAD,
): T[] {
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
    const start = stableHash(`${deck.slug}:${deck.revision}:${at}`) % from.length;
    return Array.from({ length: take }, (_, k) => from[(start + k) % from.length] as T);
  });
}

/**
 * Eight hues, set as `[data-hue]` in `packages/design/tray.css`, which the site and the product
 * both import. A deck's own is a pure function of its slug, so Explore on the site, the
 * deck page and Explore in the product arrive at the same colour without storing one, and it does
 * not move as the catalogue grows around it.
 * docs/design/system/surfaces.md, "The tray".
 */
export const TRAY_HUES = 8;

export function trayHue(slug: string): number {
  return stableHash(slug) % TRAY_HUES;
}

/**
 * Explore inside the product: the same rows the public page reads, plus the decks the learner
 * already studies, so a row can lead to Library instead of adding a second time.
 */
export const ExploreOut = z.object({
  decks: z.array(PublicDeckSummary),
  /** Slug to the deck it is in Library, for every published deck the learner is a member of. */
  added: z.record(z.string(), z.string()),
});
export type ExploreOut = z.infer<typeof ExploreOut>;

/** One published deck in the app's chrome: the public projection, and where it sits in Library. */
export const ExploreDeckOut = z.object({
  deck: PublicDeckOut,
  deckId: z.string().nullable(),
  /** More like this, leaving out the decks already in the learner's Library. */
  related: z.array(PublicDeckSummary),
});
export type ExploreDeckOut = z.infer<typeof ExploreDeckOut>;

const SUBJECTS: readonly string[] = PUBLICATION_CATEGORIES.filter((key) => key !== "languages");

/** Where a deck with no shelf, or one naming a subject that has since gone, gathers: More decks. */
export const UNCATEGORISED = "other";

/**
 * The language a published deck teaches: the deck's own, unless it sits on a subject shelf, where
 * the deck's language only says what its terms are spoken in.
 */
export function taughtLanguage(deck: {
  category: string | null;
  language: string | null;
}): string | null {
  return deck.category && SUBJECTS.includes(deck.category) ? null : deck.language;
}

/** The subject a published deck sits under, or null for a language deck or one with no shelf. */
export function subjectOf(deck: { category: string | null }): string | null {
  return deck.category && SUBJECTS.includes(deck.category) ? deck.category : null;
}

/** How an app names what a deck is searched by, in the reader's language and in English. */
export interface CatalogSearchNames {
  language: (tag: string) => string | null;
  englishLanguage: (tag: string) => string | null;
  subject: (key: string) => string | null;
  tag: (key: PublicationTag) => string | null;
  englishTag: (key: PublicationTag) => string | null;
}

/**
 * Everything a search on Explore matches, lower-cased: the name, summary and tray card, the
 * languages the deck teaches and explains, its subject and its tags, the languages and tags in
 * English too, so a reader may search in either. Both Explores search through here.
 */
export function catalogSearchText(
  deck: PublicDeckSummary,
  names: CatalogSearchNames,
  locale: string,
): string {
  const languages = [taughtLanguage(deck), deck.meaningLanguage].flatMap((tag) =>
    tag ? [names.language(tag), names.englishLanguage(tag)] : [],
  );
  const subject = subjectOf(deck);
  return [
    deck.name,
    deck.summary,
    deck.card?.term,
    deck.card?.meaning,
    ...languages,
    subject ? names.subject(subject) : null,
    ...deck.tags.flatMap((tag) => [names.tag(tag), names.englishTag(tag)]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase(locale);
}

/** A shelf per language, then a shelf per subject, then More decks. Each app writes the headings. */
export interface Shelf<T = PublicDeckSummary> {
  /** Unique on the page, and safe in an element id. */
  key: string;
  /** The language a language shelf holds, or null for a subject shelf and More decks. */
  language: string | null;
  decks: T[];
}

/**
 * Decks grouped into shelves: one per language, most decks first, then the subjects in the order
 * `PUBLICATION_CATEGORIES` lists them, then More decks. Every deck lands on exactly one shelf, and
 * both Explores group through here so they cannot disagree. docs/design/explore.md.
 */
export function shelvesOf<T extends Pick<PublicDeckSummary, "category" | "language">>(
  decks: readonly T[],
): Shelf<T>[] {
  const byLanguage = new Map<string, T[]>();
  const bySubject = new Map<string, T[]>();
  const rest: T[] = [];
  for (const deck of decks) {
    const subject = subjectOf(deck);
    if (subject) push(bySubject, subject, deck);
    else if (deck.category === "languages" && deck.language) push(byLanguage, deck.language, deck);
    else rest.push(deck);
  }
  const languages = [...byLanguage]
    .sort(([a, one], [b, other]) => other.length - one.length || a.localeCompare(b, "en"))
    .map(([language, shelf]) => ({ key: `language-${language}`, language, decks: shelf }));
  const subjects = SUBJECTS.flatMap((subject) => {
    const shelf = bySubject.get(subject);
    return shelf ? [{ key: subject, language: null, decks: shelf }] : [];
  });
  return [
    ...languages,
    ...subjects,
    ...(rest.length > 0 ? [{ key: UNCATEGORISED, language: null, decks: rest }] : []),
  ];
}

/** A shelf gets a page of its own from this many decks; below it the page is one deck with a header. */
export const SHELF_PAGE_MIN_DECKS = 3;

export type ShelfKind = "languages" | "subjects";
export interface ShelfRoute {
  kind: ShelfKind;
  name: string;
}

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Where a shelf's page lives under Explore, or null for More decks. A language shelf is named by
 * the language's English name, so the address reads the same in every locale and needs nothing
 * stored: `languages/brazilian-portuguese`, `subjects/citizenship`.
 */
export function shelfRoute(shelf: Pick<Shelf, "key" | "language">): ShelfRoute | null {
  if (shelf.language) {
    let name = shelf.language;
    try {
      name = new Intl.DisplayNames(["en"], { type: "language" }).of(shelf.language) ?? name;
    } catch {}
    return { kind: "languages", name: slugify(name) };
  }
  if (shelf.key === UNCATEGORISED) return null;
  return { kind: "subjects", name: shelf.key };
}

export function hasShelfPage(shelf: Shelf<unknown>): boolean {
  return shelf.decks.length >= SHELF_PAGE_MIN_DECKS && shelfRoute(shelf) !== null;
}

/** The shelf a page address names, when that shelf is big enough to have a page. */
export function shelfAt(shelves: readonly Shelf[], route: ShelfRoute): Shelf | undefined {
  return shelves.find((shelf) => {
    const at = shelfRoute(shelf);
    return at?.kind === route.kind && at.name === route.name && hasShelfPage(shelf);
  });
}

function push<T>(groups: Map<string, T[]>, key: string, item: T) {
  const group = groups.get(key);
  if (group) group.push(item);
  else groups.set(key, [item]);
}

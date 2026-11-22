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

const PublicImage = z.object({
  cardId: z.string(),
  description: z.string(),
  width: z.number().int(),
  height: z.number().int(),
});

export const PublicDeckOut = z.object({
  slug: z.string(),
  name: z.string(),
  summary: z.string(),
  category: z.string().nullable(),
  tags: z.array(PublicationTag),
  language: z.string().nullable(),
  meaningLanguage: z.string(),
  originalMeaningLanguage: z.string(),
  editions: z.array(z.string()),
  publisher: z.string(),
  publisherAvatar: z.string().nullable(),
  sources: z.array(z.object({ title: z.string(), url: z.string().optional() })),
  reviewedAt: z.iso.datetime().nullable(),
  revision: z.number().int(),
  publishedAt: z.iso.datetime(),
  cardCount: z.number().int(),
  sectionProgression: SectionProgression,
  sections: z.array(
    z.object({
      name: z.string().nullable(),
      nameLanguage: z.string().optional(),
      cards: z.array(
        z.object({
          term: z.string(),
          meaning: z.string().nullable(),
          modes: z.array(ReviewModeKey.meta(OPEN)).min(1),
          image: PublicImage.optional(),
          audio: z.object({ cardId: z.string() }).optional(),
        }),
      ),
    }),
  ),
});
export type PublicDeckOut = z.infer<typeof PublicDeckOut>;

export type PublicDeckResult =
  | { status: "published"; deck: PublicDeckOut }
  | { status: "unavailable" }
  | { status: "missing" };

export function activeAvatarVersion(row: {
  customKey?: string | null | undefined;
  customVersion?: string | null | undefined;
  googleVersion?: string | null | undefined;
}): string | null {
  if (row.customKey && row.customVersion) return row.customVersion;
  return row.googleVersion ?? null;
}

export function publisherAvatarPath(slug: string, version: string): string {
  const path = `/public/media/deck/${encodeURIComponent(slug)}/publisher-avatar`;
  return `${path}?v=${encodeURIComponent(version)}`;
}

export function isPublicDeckSlug(slug: string | undefined): slug is string {
  return typeof slug === "string" && slug.length <= 80 && PUBLICATION_SLUG.test(slug);
}

export function previewMode(
  card: { modes: readonly ReviewModeKey[]; image?: unknown },
  place = 0,
): ReviewModeKey {
  const picture = card.image ? card.modes.find(isImageMode) : undefined;
  if (picture) return picture;
  const text = card.modes.filter((key) => !isImageMode(key));
  return text[place % text.length] ?? "term_to_meaning";
}

export const PublicDeckSummary = z.object({
  slug: z.string(),
  name: z.string(),
  summary: z.string(),
  category: z.string().nullable(),
  tags: z.array(PublicationTag),
  language: z.string().nullable(),
  meaningLanguage: z.string(),
  cardCount: z.number().int(),
  sectionCount: z.number().int(),
  card: z
    .object({
      term: z.string(),
      meaning: z.string(),
      section: z.string().nullable(),
      sectionLanguage: z.string().optional(),
      mode: ReviewModeKey.meta(OPEN),
      image: PublicImage.optional(),
    })
    .nullable(),
});
export type PublicDeckSummary = z.infer<typeof PublicDeckSummary>;

const READ_ENGLISH_TOO = ["uk", "ru"];

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

const NOT_OFFERED: Record<string, readonly string[]> = { uk: ["uk", "ru"], ru: ["ru"] };

export function offersLanguage(reader: string, language: string | null | undefined): boolean {
  const hidden = Object.entries(NOT_OFFERED).find(([each]) => sameLanguage(each, reader))?.[1];
  return !language || !hidden?.some((each) => sameLanguage(each, language));
}

export function offersDeck(
  reader: string,
  deck: { category: string | null; language: string | null },
): boolean {
  return offersLanguage(reader, taughtLanguage(deck));
}

export interface RelatedCandidate {
  slug: string;
  tags: readonly string[];
  category: string | null;
  language: string | null;
}

function sameLanguage(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  return a.split("-")[0]?.toLowerCase() === b.split("-")[0]?.toLowerCase();
}

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

export function stableHash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export const DECK_PAGE_SPREAD = 5;
export const DECK_PAGE_HAND = 5;

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
    for (let placed = 0; placed < count;) {
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

export const TRAY_HUES = 8;

export function trayHue(slug: string): number {
  return stableHash(slug) % TRAY_HUES;
}

export const ExploreOut = z.object({
  decks: z.array(PublicDeckSummary),
  added: z.record(z.string(), z.string()),
});
export type ExploreOut = z.infer<typeof ExploreOut>;

export const ExploreDeckOut = z.object({
  deck: PublicDeckOut,
  deckId: z.string().nullable(),
  related: z.array(PublicDeckSummary),
});
export type ExploreDeckOut = z.infer<typeof ExploreDeckOut>;

const SUBJECTS: readonly string[] = PUBLICATION_CATEGORIES.filter((key) => key !== "languages");

export const UNCATEGORISED = "other";

export function taughtLanguage(deck: {
  category: string | null;
  language: string | null;
}): string | null {
  return deck.category && SUBJECTS.includes(deck.category) ? null : deck.language;
}

export function subjectOf(deck: { category: string | null }): string | null {
  return deck.category && SUBJECTS.includes(deck.category) ? deck.category : null;
}

export interface CatalogSearchNames {
  language: (tag: string) => string | null;
  englishLanguage: (tag: string) => string | null;
  subject: (key: string) => string | null;
  tag: (key: PublicationTag) => string | null;
  englishTag: (key: PublicationTag) => string | null;
}

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

export interface Shelf<T = PublicDeckSummary> {
  key: string;
  language: string | null;
  decks: T[];
}

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

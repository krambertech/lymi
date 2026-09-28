import { and, asc, eq, inArray, isNotNull, isNull, type SQL, sql } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { z } from "zod";
import { selectIn } from "./db";
import { askedModes, isImageMode } from "./modes";
import { livePublicationMedia } from "./publication-media";
import {
  cardLocalizations,
  cards,
  deckEditions,
  deckLocalizations,
  deckPublications,
  decks,
  sectionLocalizations,
  sections,
  userAvatars,
} from "./schema/app";
import {
  type Directions,
  PUBLICATION_CATEGORIES,
  PUBLICATION_SLUG,
  PublicationTag,
  publicationTags,
  ReviewModeKey,
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
  /** In deck order. A group with no name holds the cards outside any active section, last. */
  sections: z.array(
    z.object({
      name: z.string().nullable(),
      cards: z.array(
        z.object({
          term: z.string(),
          meaning: z.string().nullable(),
          /** The modes a learner is asked this card in, so a preview asks it the same way. */
          modes: z.array(ReviewModeKey).min(1),
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

// biome-ignore lint/suspicious/noExplicitAny: both Workers pass their own typed D1 database.
type CatalogDb = BaseSQLiteDatabase<"async", any, any>;

export interface PublicationRow {
  slug: string;
  status: "published" | "withdrawn";
  summary: string;
  category: string | null;
  tags: string[];
  /** The edition this page shows, which is the original unless a published one was asked for. */
  meaningLanguage: string;
  originalMeaningLanguage: string;
  editions: string[];
  publisher: string;
  publisherAvatar: string | null;
  sources: { title: string; url?: string | undefined }[];
  reviewedAt: Date | null;
  revision: number;
  publishedAt: Date;
  deckName: string;
  deckLanguage: string | null;
  deckDirections: Directions;
  deckArchivedAt: Date | null;
}

export interface SectionRow {
  id: string;
  name: string;
}

export interface CardRow {
  id: string;
  term: string;
  meaning: string | null;
  sectionId: string | null;
  /** The card's own review modes, or null to follow the deck. */
  directions: Directions | null;
  reviewModeKeys: ReviewModeKey[] | null;
}

export interface PublicMediaRow {
  cardId: string;
  description: string | null;
  width: number | null;
  height: number | null;
  hasAudio: number;
}

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

/** A source link is shown only when it is a web address, never another scheme. */
function webUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:" ? url : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Group active cards under active sections, in the order given. Cards whose section is
 * archived, or who never had one, gather in one unnamed group at the end; empty groups go.
 */
export function projectPublicDeck(
  publication: PublicationRow,
  sectionRows: readonly SectionRow[],
  cardRows: readonly CardRow[],
  mediaRows: readonly PublicMediaRow[] = [],
): PublicDeckResult {
  if (publication.status !== "published" || publication.deckArchivedAt || cardRows.length === 0) {
    return { status: "unavailable" };
  }
  const groups = new Map<string | null, PublicDeckOut["sections"][number]>();
  const mediaByCard = new Map<
    string,
    {
      image?: PublicDeckOut["sections"][number]["cards"][number]["image"];
      audio?: { cardId: string };
    }
  >();
  for (const media of mediaRows) {
    const entry = mediaByCard.get(media.cardId) ?? {};
    if (media.description && media.width && media.height) {
      entry.image = {
        cardId: media.cardId,
        description: media.description,
        width: media.width,
        height: media.height,
      };
    }
    if (media.hasAudio) entry.audio = { cardId: media.cardId };
    mediaByCard.set(media.cardId, entry);
  }
  for (const section of sectionRows) groups.set(section.id, { name: section.name, cards: [] });
  groups.set(null, { name: null, cards: [] });
  for (const card of cardRows) {
    const group = groups.get(card.sectionId) ?? groups.get(null);
    const media = mediaByCard.get(card.id);
    group?.cards.push({
      term: card.term,
      meaning: card.meaning,
      modes: modesOf(publication.deckDirections, card, !!media?.image),
      ...(media?.image ? { image: media.image } : {}),
      ...(media?.audio ? { audio: media.audio } : {}),
    });
  }
  const deck = PublicDeckOut.parse({
    slug: publication.slug,
    name: publication.deckName,
    summary: publication.summary,
    category: publication.category,
    tags: publicationTags(publication.tags),
    language: publication.deckLanguage,
    meaningLanguage: publication.meaningLanguage,
    originalMeaningLanguage: publication.originalMeaningLanguage,
    editions: publication.editions,
    publisher: publication.publisher,
    publisherAvatar: publication.publisherAvatar,
    sources: publication.sources.map((source) => {
      const url = webUrl(source.url);
      return url ? { title: source.title, url } : { title: source.title };
    }),
    reviewedAt: publication.reviewedAt?.toISOString() ?? null,
    revision: publication.revision,
    publishedAt: publication.publishedAt.toISOString(),
    cardCount: cardRows.length,
    sections: [...groups.values()].filter((group) => group.cards.length > 0),
  });
  return { status: "published", deck };
}

/** The modes a card is asked in, from its own list when it overrides its deck. */
function modesOf(
  deckDirections: Directions,
  card: Pick<CardRow, "directions" | "reviewModeKeys">,
  hasPicture: boolean,
): ReviewModeKey[] {
  return card.directions
    ? askedModes(card.directions, card.reviewModeKeys, hasPicture)
    : askedModes(deckDirections, null, hasPicture);
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
 * An edition's text replaces the deck's own only where a person has approved it. Text that has
 * gone stale since it was approved still shows: it is the best the reader's language has, and
 * publishing an edition already refused staleness. ADR 0015.
 */
const approvedIn = (language: string | null) =>
  language === null
    ? sql`0 = 1`
    : sql`${sql.raw("localization.status")} = 'approved' and ${sql.raw("localization.language")} = ${language}`;

/**
 * Read one published deck for its public page, in the meaning language asked for when the deck
 * is published in it. Selects allowlisted columns only, and never a draft or withdrawn edition.
 */
export async function loadPublicDeck(
  db: CatalogDb,
  slug: string,
  language?: string | undefined,
): Promise<PublicDeckResult> {
  if (!isPublicDeckSlug(slug)) return { status: "missing" };
  const [publication] = await db
    .select({
      deckId: deckPublications.deckId,
      id: deckPublications.id,
      slug: deckPublications.slug,
      status: deckPublications.status,
      summary: deckPublications.summary,
      category: deckPublications.category,
      tags: deckPublications.tags,
      meaningLanguage: deckPublications.meaningLanguage,
      publisher: deckPublications.publisher,
      sources: deckPublications.sources,
      reviewedAt: deckPublications.reviewedAt,
      revision: deckPublications.revision,
      publishedAt: deckPublications.publishedAt,
      deckName: decks.name,
      deckLanguage: decks.defaultLanguage,
      deckDirections: decks.directions,
      deckArchivedAt: decks.archivedAt,
      customKey: userAvatars.customKey,
      customVersion: userAvatars.customVersion,
      googleVersion: userAvatars.googleVersion,
    })
    .from(deckPublications)
    .innerJoin(decks, eq(decks.id, deckPublications.deckId))
    .leftJoin(userAvatars, eq(userAvatars.userId, decks.userId))
    .where(eq(deckPublications.slug, slug));
  if (!publication) return { status: "missing" };
  if (publication.status !== "published" || publication.deckArchivedAt) {
    return { status: "unavailable" };
  }

  const published = await db
    .select({ language: deckEditions.language })
    .from(deckEditions)
    .where(and(eq(deckEditions.deckId, publication.deckId), eq(deckEditions.status, "published")))
    .orderBy(asc(deckEditions.language));
  const original = publication.meaningLanguage;
  const editions = [original, ...published.map((row) => row.language)];
  // Only a published edition is shown, so a draft or a withdrawn one reads as the original.
  const wanted =
    language && language !== original && published.some((row) => row.language === language)
      ? language
      : null;
  const shown = wanted ?? original;

  const [deckText, sectionRows, cardRows, mediaRows] = await Promise.all([
    wanted
      ? db
          .select({ name: deckLocalizations.name, summary: deckLocalizations.summary })
          .from(deckLocalizations)
          .where(
            and(
              eq(deckLocalizations.deckId, publication.deckId),
              eq(deckLocalizations.language, wanted),
              eq(deckLocalizations.status, "approved"),
            ),
          )
      : [],
    db
      .select({
        id: sections.id,
        name: sql<string>`coalesce(localization.name, ${sections.name})`,
      })
      .from(sections)
      .leftJoin(
        sql`${sectionLocalizations} as localization`,
        and(sql`${sql.raw("localization.section_id")} = ${sections.id}`, approvedIn(wanted)),
      )
      .where(and(eq(sections.deckId, publication.deckId), isNull(sections.archivedAt)))
      .orderBy(asc(sections.position), asc(sections.createdAt), asc(sections.id)),
    db
      .select({
        id: cards.id,
        term: sql<string>`coalesce(localization.term, ${cards.term})`,
        meaning: sql<string | null>`coalesce(localization.meaning, ${cards.meaning})`,
        sectionId: cards.sectionId,
        directions: cards.directions,
        reviewModeKeys: cards.reviewModeKeys,
      })
      .from(cards)
      .leftJoin(
        sql`${cardLocalizations} as localization`,
        and(sql`${sql.raw("localization.card_id")} = ${cards.id}`, approvedIn(wanted)),
      )
      .where(and(eq(cards.deckId, publication.deckId), isNull(cards.archivedAt)))
      // Cards added in one batch share a timestamp; rowid keeps the order they were sent in.
      .orderBy(asc(cards.createdAt), sql`cards.rowid`),
    livePublicationMedia(db, { publicationId: publication.id }),
  ]);
  const text = deckText[0];
  return projectPublicDeck(
    {
      ...publication,
      meaningLanguage: shown,
      originalMeaningLanguage: original,
      editions,
      summary: text?.summary ?? publication.summary,
      deckName: text?.name ?? publication.deckName,
      publisherAvatar: activeAvatarVersion(publication),
    },
    sectionRows,
    cardRows,
    mediaRows,
  );
}

/**
 * A sitemap file holds 50,000 URLs and each deck takes one per locale, so the listing stops well
 * inside that. A catalog approaching this needs a paginated sitemap index rather than a bigger cap.
 */
export const SITEMAP_DECK_LIMIT = 10_000;

/**
 * The slugs whose public page answers 200, for the sitemap, with the meaning languages each is
 * published in so the sitemap lists a deck only in the locales `readableIn` allows.
 */
export async function listPublicDeckSlugs(db: CatalogDb, limit = SITEMAP_DECK_LIMIT) {
  const rows = await db
    .select({
      deckId: deckPublications.deckId,
      slug: deckPublications.slug,
      updatedAt: deckPublications.updatedAt,
      meaningLanguage: deckPublications.meaningLanguage,
    })
    .from(deckPublications)
    .innerJoin(decks, eq(decks.id, deckPublications.deckId))
    .where(publishedAndAlive())
    .orderBy(asc(deckPublications.slug))
    .limit(limit);
  const editionsOf = await publishedEditionLanguages(
    db,
    rows.map((row) => row.deckId),
  );
  return rows.map(({ deckId, ...row }) => ({ ...row, editions: editionsOf.get(deckId) ?? [] }));
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
      /** The mode the tray shows it in, as the deck page's preview would. */
      mode: ReviewModeKey,
      image: PublicImage.optional(),
    })
    .nullable(),
});
export type PublicDeckSummary = z.infer<typeof PublicDeckSummary>;

/** A deck appears on Explore only while its own page answers 200, so the two can never disagree. */
const publishedAndAlive = () =>
  and(
    eq(deckPublications.status, "published"),
    isNull(decks.archivedAt),
    sql`exists (select 1 from ${cards} where ${cards.deckId} = ${decks.id} and ${cards.archivedAt} is null)`,
  );

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

/** The published decks a reader of `language` can use, or every one when no language is given. */
async function readableRows<T extends { deckId: string; meaningLanguage: string }>(
  db: CatalogDb,
  rows: T[],
  language: string | undefined,
): Promise<T[]> {
  if (!language) return rows;
  const editionsOf = await publishedEditionLanguages(
    db,
    rows.map((row) => row.deckId),
  );
  return rows.filter((row) =>
    readableIn(
      { meaningLanguage: row.meaningLanguage, editions: editionsOf.get(row.deckId) ?? [] },
      language,
    ),
  );
}

/** Each deck's published editions, by meaning language. A draft or withdrawn one counts for nothing. */
async function publishedEditionLanguages(
  db: CatalogDb,
  deckIds: string[],
): Promise<Map<string, string[]>> {
  const rows = await selectIn(deckIds, (slice) =>
    db
      .select({ deckId: deckEditions.deckId, language: deckEditions.language })
      .from(deckEditions)
      .where(and(inArray(deckEditions.deckId, slice), eq(deckEditions.status, "published"))),
  );
  const languages = new Map<string, string[]>();
  for (const row of rows) push(languages, row.deckId, row.language);
  return languages;
}

/**
 * Every published deck a reader of `language` can use, for Explore, in that meaning language where
 * the deck has a published edition in it. Reads no cookie and no learner row, so one cached copy per
 * locale is right for every visitor. ADR 0016.
 */
export async function listPublicCatalog(
  db: CatalogDb,
  language?: string | undefined,
  limit = SITEMAP_DECK_LIMIT,
): Promise<PublicDeckSummary[]> {
  return catalogSummaries(db, publishedAndAlive(), language, limit);
}

async function catalogSummaries(
  db: CatalogDb,
  where: SQL | undefined,
  language: string | undefined,
  limit: number,
): Promise<PublicDeckSummary[]> {
  const selected = await db
    .select({
      deckId: deckPublications.deckId,
      slug: deckPublications.slug,
      summary: deckPublications.summary,
      category: deckPublications.category,
      tags: deckPublications.tags,
      meaningLanguage: deckPublications.meaningLanguage,
      revision: deckPublications.revision,
      deckName: decks.name,
      deckLanguage: decks.defaultLanguage,
      deckDirections: decks.directions,
    })
    .from(deckPublications)
    .innerJoin(decks, eq(decks.id, deckPublications.deckId))
    .where(where)
    .orderBy(asc(deckPublications.publishedAt), asc(deckPublications.slug))
    .limit(limit);
  const rows = await readableRows(db, selected, language);
  if (rows.length === 0) return [];

  const deckIds = rows.map((row) => row.deckId);
  const editionOf = await publishedEditions(db, deckIds, language);
  const [cardsPerDeck, sectionsPerDeck, sample] = await Promise.all([
    cardCounts(db, deckIds),
    sectionCounts(db, deckIds),
    sampleCards(db, rows, editionOf, language),
  ]);
  return rows.map((row) => {
    const shown = editionOf.get(row.deckId) ?? null;
    const text = shown?.deck;
    return PublicDeckSummary.parse({
      slug: row.slug,
      name: text?.name ?? row.deckName,
      summary: text?.summary ?? row.summary,
      category: row.category,
      tags: publicationTags(row.tags),
      language: row.deckLanguage,
      meaningLanguage: shown?.language ?? row.meaningLanguage,
      cardCount: cardsPerDeck.get(row.deckId) ?? 0,
      sectionCount: sectionsPerDeck.get(row.deckId) ?? 0,
      card: sample.get(row.deckId) ?? null,
    });
  });
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

/**
 * More like this: the published decks most like the one at `slug`, as Explore rows in the meaning
 * language asked for. `exclude` leaves out decks before ranking, so a learner's own still fill the
 * row with others. Reads no learner row itself, so the public page can cache it. ADR 0016.
 */
export async function listRelatedDecks(
  db: CatalogDb,
  slug: string,
  opts: { language?: string | undefined; exclude?: ReadonlySet<string>; limit: number },
): Promise<PublicDeckSummary[]> {
  const rows = await db
    .select({
      deckId: deckPublications.deckId,
      slug: deckPublications.slug,
      tags: deckPublications.tags,
      category: deckPublications.category,
      language: decks.defaultLanguage,
      meaningLanguage: deckPublications.meaningLanguage,
    })
    .from(deckPublications)
    .innerJoin(decks, eq(decks.id, deckPublications.deckId))
    .where(publishedAndAlive())
    .orderBy(asc(deckPublications.publishedAt), asc(deckPublications.slug))
    .limit(SITEMAP_DECK_LIMIT);
  // The deck itself need not be readable here: its page answers by direct link in every locale.
  const deck = rows.find((row) => row.slug === slug);
  if (!deck) return [];
  const candidates = await readableRows(
    db,
    rows.filter((row) => !opts.exclude?.has(row.slug)),
    opts.language,
  );
  const ranked = rankRelated(deck, candidates, opts.limit);
  if (ranked.length === 0) return [];
  const summaries = await catalogSummaries(
    db,
    and(publishedAndAlive(), inArray(deckPublications.slug, ranked)),
    opts.language,
    ranked.length,
  );
  const bySlug = new Map(summaries.map((summary) => [summary.slug, summary]));
  return ranked.flatMap((key) => bySlug.get(key) ?? []);
}

interface ShownEdition {
  language: string;
  deck: { name: string | null; summary: string | null } | undefined;
}

/** The edition each deck is read in here: the one asked for where it is published, else nothing. */
async function publishedEditions(
  db: CatalogDb,
  deckIds: string[],
  language: string | undefined,
): Promise<Map<string, ShownEdition>> {
  const shown = new Map<string, ShownEdition>();
  if (!language) return shown;
  const published = await selectIn(deckIds, (slice) =>
    db
      .select({ deckId: deckEditions.deckId })
      .from(deckEditions)
      .where(
        and(
          inArray(deckEditions.deckId, slice),
          eq(deckEditions.language, language),
          eq(deckEditions.status, "published"),
        ),
      ),
  );
  if (published.length === 0) return shown;
  const wanted = published.map((row) => row.deckId);
  const text = await selectIn(wanted, (slice) =>
    db
      .select({
        deckId: deckLocalizations.deckId,
        name: deckLocalizations.name,
        summary: deckLocalizations.summary,
      })
      .from(deckLocalizations)
      .where(
        and(
          inArray(deckLocalizations.deckId, slice),
          eq(deckLocalizations.language, language),
          eq(deckLocalizations.status, "approved"),
        ),
      ),
  );
  const byDeck = new Map(text.map((row) => [row.deckId, row]));
  for (const deckId of wanted) shown.set(deckId, { language, deck: byDeck.get(deckId) });
  return shown;
}

async function cardCounts(db: CatalogDb, deckIds: string[]): Promise<Map<string, number>> {
  const rows = await selectIn(deckIds, (slice) =>
    db
      .select({ deckId: cards.deckId, count: sql<number>`count(*)` })
      .from(cards)
      .where(and(inArray(cards.deckId, slice), isNull(cards.archivedAt)))
      .groupBy(cards.deckId),
  );
  return new Map(rows.map((row) => [row.deckId, Number(row.count)]));
}

async function sectionCounts(db: CatalogDb, deckIds: string[]): Promise<Map<string, number>> {
  const rows = await selectIn(deckIds, (slice) =>
    db
      .select({ deckId: sections.deckId, count: sql<number>`count(*)` })
      .from(sections)
      .where(and(inArray(sections.deckId, slice), isNull(sections.archivedAt)))
      .groupBy(sections.deckId),
  );
  return new Map(rows.map((row) => [row.deckId, Number(row.count)]));
}

/** How many of a deck's cards the tray chooses between. */
const TRAY_CANDIDATES = 40;

interface CandidateCard {
  cardId: string;
  term: string;
  meaning: string | null;
  sectionName: string | null;
  directions: Directions | null;
  reviewModeKeys: ReviewModeKey[] | null;
}

/** The card a deck's tray shows, before its edition's own words are read. */
type TrayCard = CandidateCard & { meaning: string; deckDirections: Directions };

/**
 * One card per deck for its tray, drawn from the deck's own revision rather than at random, so
 * every visitor to one revision is served the same page and its validator stays honest.
 */
async function sampleCards(
  db: CatalogDb,
  rows: readonly { deckId: string; slug: string; revision: number; deckDirections: Directions }[],
  editionOf: Map<string, ShownEdition>,
  language: string | undefined,
): Promise<Map<string, PublicDeckSummary["card"]>> {
  const deckIds = rows.map((row) => row.deckId);
  const candidates = await selectIn(deckIds, (slice) => trayCandidates(db, slice));

  const byDeck = new Map<string, CandidateCard[]>();
  for (const card of candidates) {
    const list = byDeck.get(card.deckId);
    if (list) list.push(card);
    else byDeck.set(card.deckId, [card]);
  }
  const picked = new Map<string, TrayCard>();
  for (const row of rows) {
    const list = byDeck.get(row.deckId);
    if (!list || list.length === 0) continue;
    // Prefer a card short enough to read at a glance on a tray, as the deck page's spread does.
    const glanceable = list.filter(
      (card) => card.term.length <= 22 && (card.meaning?.length ?? 0) <= 40,
    );
    const from = glanceable.length > 0 ? glanceable : list;
    const card = from[hash(`${row.slug}:${row.revision}:tray`) % from.length];
    if (!card?.meaning) continue;
    picked.set(row.deckId, { ...card, meaning: card.meaning, deckDirections: row.deckDirections });
  }

  // Only the card each tray shows is localized: binding every candidate carried one parameter
  // per card, which went past D1's cap of 100 once a few decks were published.
  const pickedIds = [...picked.values()].map((card) => card.cardId);
  const [localized, pictures] = await Promise.all([
    localizedSamples(db, picked, editionOf, language),
    selectIn(pickedIds, (slice) => livePublicationMedia(db, { cardIds: slice })),
  ]);
  const pictureOf = new Map(
    pictures.flatMap((media) =>
      media.description && media.width && media.height
        ? [
            [
              media.cardId,
              {
                cardId: media.cardId,
                description: media.description,
                width: media.width,
                height: media.height,
              },
            ] as const,
          ]
        : [],
    ),
  );
  const chosen = new Map<string, PublicDeckSummary["card"]>();
  for (const [deckId, card] of picked) {
    const text = localized.get(card.cardId);
    const image = pictureOf.get(card.cardId);
    const modes = modesOf(card.deckDirections, card, !!image);
    const mode = previewMode({ modes, image });
    chosen.set(deckId, {
      term: text?.term ?? card.term,
      meaning: text?.meaning ?? card.meaning,
      section: card.sectionName,
      mode,
      // The tray shows the picture only as the cue, as review does before a card is turned.
      ...(image && isImageMode(mode) ? { image } : {}),
    });
  }
  return chosen;
}

/** The first cards of each deck in the slice, which the tray then chooses between. */
async function trayCandidates(
  db: CatalogDb,
  deckIds: string[],
): Promise<(CandidateCard & { deckId: string })[]> {
  // One card per deck is wanted, so only the first few of each are read. Without the cap this
  // query would carry every card of every published deck to render one tray apiece.
  const ranked = db
    .select({
      deckId: cards.deckId,
      cardId: cards.id,
      term: cards.term,
      meaning: cards.meaning,
      sectionId: cards.sectionId,
      directions: cards.directions,
      reviewModeKeys: cards.reviewModeKeys,
      place: sql<number>`row_number() over (
        partition by ${cards.deckId} order by ${cards.createdAt} asc, cards.rowid asc
      )`.as("place"),
    })
    .from(cards)
    .where(and(inArray(cards.deckId, deckIds), isNull(cards.archivedAt), isNotNull(cards.meaning)))
    .as("ranked");
  return db
    .select({
      deckId: ranked.deckId,
      cardId: ranked.cardId,
      term: ranked.term,
      meaning: ranked.meaning,
      sectionName: sections.name,
      directions: ranked.directions,
      reviewModeKeys: ranked.reviewModeKeys,
    })
    .from(ranked)
    .leftJoin(sections, and(eq(sections.id, ranked.sectionId), isNull(sections.archivedAt)))
    .where(sql`${ranked.place} <= ${TRAY_CANDIDATES}`)
    .orderBy(asc(ranked.place));
}

/** The chosen cards' approved text in the edition each deck is shown in. ADR 0015. */
async function localizedSamples(
  db: CatalogDb,
  picked: ReadonlyMap<string, TrayCard>,
  editionOf: Map<string, ShownEdition>,
  language: string | undefined,
): Promise<Map<string, { term: string | null; meaning: string | null }>> {
  if (!language) return new Map();
  const wanted = [...picked]
    .filter(([deckId]) => editionOf.has(deckId))
    .map(([, card]) => card.cardId);
  const rows = await selectIn(wanted, (slice) =>
    db
      .select({
        cardId: cardLocalizations.cardId,
        term: cardLocalizations.term,
        meaning: cardLocalizations.meaning,
      })
      .from(cardLocalizations)
      .where(
        and(
          inArray(cardLocalizations.cardId, slice),
          eq(cardLocalizations.language, language),
          eq(cardLocalizations.status, "approved"),
        ),
      ),
  );
  return new Map(rows.map((row) => [row.cardId, row]));
}

/** FNV-1a, so a deck's tray card stays the same for one revision. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Eight hues, set as `.deck-tray[data-hue]` in the site's `styles.css` and the product's
 * `styles/deck.css`. A deck's own is a pure function of its slug, so Explore on the site, the
 * deck page and Explore in the product arrive at the same colour without storing one, and it does
 * not move as the catalogue grows around it.
 * docs/design/system/surfaces.md, "The tray".
 */
export const TRAY_HUES = 8;

export function trayHue(slug: string): number {
  return hash(slug) % TRAY_HUES;
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

/** A shelf per language, then a shelf per subject, then More decks. Each app writes the headings. */
export interface Shelf {
  /** Unique on the page, and safe in an element id. */
  key: string;
  /** The language a language shelf holds, or null for a subject shelf and More decks. */
  language: string | null;
  decks: PublicDeckSummary[];
}

/**
 * Decks grouped into shelves: one per language, most decks first, then the subjects in the order
 * `PUBLICATION_CATEGORIES` lists them, then More decks. Every deck lands on exactly one shelf, and
 * both Explores group through here so they cannot disagree. docs/design/explore.md.
 */
export function shelvesOf(decks: readonly PublicDeckSummary[]): Shelf[] {
  const byLanguage = new Map<string, PublicDeckSummary[]>();
  const bySubject = new Map<string, PublicDeckSummary[]>();
  const rest: PublicDeckSummary[] = [];
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

function push<T>(groups: Map<string, T[]>, key: string, item: T) {
  const group = groups.get(key);
  if (group) group.push(item);
  else groups.set(key, [item]);
}

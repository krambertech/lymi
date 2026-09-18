import { and, asc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { z } from "zod";
import { selectIn } from "./db";
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
import { PUBLICATION_CATEGORIES, PUBLICATION_SLUG } from "./types";

/**
 * What a public deck page may show, and nothing else. This is the security boundary of
 * ADR 0016: the public Worker reads only through `loadPublicDeck`, which selects only these
 * fields, and every result is parsed through this schema so an extra column cannot pass.
 */
export const PublicDeckOut = z.object({
  slug: z.string(),
  name: z.string(),
  summary: z.string(),
  level: z.string().nullable(),
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
          image: z
            .object({
              id: z.string(),
              description: z.string(),
              width: z.number().int(),
              height: z.number().int(),
            })
            .optional(),
          audio: z.object({ id: z.string() }).optional(),
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
  level: string | null;
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
}

export interface PublicMediaRow {
  id: string;
  cardId: string;
  kind: "image" | "audio";
  description: string | null;
  width: number | null;
  height: number | null;
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
    { image?: PublicDeckOut["sections"][number]["cards"][number]["image"]; audio?: { id: string } }
  >();
  for (const media of mediaRows) {
    const entry = mediaByCard.get(media.cardId) ?? {};
    if (media.kind === "image" && media.description && media.width && media.height) {
      entry.image = {
        id: media.id,
        description: media.description,
        width: media.width,
        height: media.height,
      };
    }
    if (media.kind === "audio") entry.audio = { id: media.id };
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
      ...(media?.image ? { image: media.image } : {}),
      ...(media?.audio ? { audio: media.audio } : {}),
    });
  }
  const deck = PublicDeckOut.parse({
    slug: publication.slug,
    name: publication.deckName,
    summary: publication.summary,
    level: publication.level,
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
      level: deckPublications.level,
      meaningLanguage: deckPublications.meaningLanguage,
      publisher: deckPublications.publisher,
      sources: deckPublications.sources,
      reviewedAt: deckPublications.reviewedAt,
      revision: deckPublications.revision,
      publishedAt: deckPublications.publishedAt,
      deckName: decks.name,
      deckLanguage: decks.defaultLanguage,
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

/** The slugs whose public page answers 200, for the sitemap. */
export async function listPublicDeckSlugs(db: CatalogDb, limit = SITEMAP_DECK_LIMIT) {
  return db
    .select({ slug: deckPublications.slug, updatedAt: deckPublications.updatedAt })
    .from(deckPublications)
    .innerJoin(decks, eq(decks.id, deckPublications.deckId))
    .where(
      and(
        eq(deckPublications.status, "published"),
        isNull(decks.archivedAt),
        sql`exists (select 1 from ${cards} where ${cards.deckId} = ${decks.id} and ${cards.archivedAt} is null)`,
      ),
    )
    .orderBy(asc(deckPublications.slug))
    .limit(limit);
}

/**
 * What Explore may show for each deck, and nothing else. The second allowlist of ADR 0016:
 * `listPublicCatalog` selects only these fields and every row is parsed through this schema.
 */
export const PublicDeckSummary = z.object({
  slug: z.string(),
  name: z.string(),
  summary: z.string(),
  level: z.string().nullable(),
  category: z.string().nullable(),
  /** The language the terms are in, from the deck. */
  language: z.string().nullable(),
  /** The meaning language this row is written in, which is the edition Explore showed. */
  meaningLanguage: z.string(),
  cardCount: z.number().int(),
  sectionCount: z.number().int(),
  /** One card from the deck, for its tray. Null for a deck whose cards have no meanings. */
  card: z
    .object({ term: z.string(), meaning: z.string(), section: z.string().nullable() })
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

/**
 * Every published deck, for Explore, in the meaning language asked for where the deck has a
 * published edition in it. Reads no cookie and no learner row, so one cached copy per locale
 * is right for every visitor. ADR 0016.
 */
export async function listPublicCatalog(
  db: CatalogDb,
  language?: string | undefined,
  limit = SITEMAP_DECK_LIMIT,
): Promise<PublicDeckSummary[]> {
  const rows = await db
    .select({
      deckId: deckPublications.deckId,
      slug: deckPublications.slug,
      summary: deckPublications.summary,
      level: deckPublications.level,
      category: deckPublications.category,
      meaningLanguage: deckPublications.meaningLanguage,
      revision: deckPublications.revision,
      deckName: decks.name,
      deckLanguage: decks.defaultLanguage,
    })
    .from(deckPublications)
    .innerJoin(decks, eq(decks.id, deckPublications.deckId))
    .where(publishedAndAlive())
    .orderBy(asc(deckPublications.publishedAt), asc(deckPublications.slug))
    .limit(limit);
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
      level: row.level,
      category: row.category,
      language: row.deckLanguage,
      meaningLanguage: shown?.language ?? row.meaningLanguage,
      cardCount: cardsPerDeck.get(row.deckId) ?? 0,
      sectionCount: sectionsPerDeck.get(row.deckId) ?? 0,
      card: sample.get(row.deckId) ?? null,
    });
  });
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
}

/** The card a deck's tray shows, before its edition's own words are read. */
type TrayCard = CandidateCard & { meaning: string };

/**
 * One card per deck for its tray, drawn from the deck's own revision rather than at random, so
 * every visitor to one revision is served the same page and its validator stays honest.
 */
async function sampleCards(
  db: CatalogDb,
  rows: readonly { deckId: string; slug: string; revision: number }[],
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
    picked.set(row.deckId, { ...card, meaning: card.meaning });
  }

  // Only the card each tray shows is localized: binding every candidate carried one parameter
  // per card, which went past D1's cap of 100 once a few decks were published.
  const localized = await localizedSamples(db, picked, editionOf, language);
  const chosen = new Map<string, PublicDeckSummary["card"]>();
  for (const [deckId, card] of picked) {
    const text = localized.get(card.cardId);
    chosen.set(deckId, {
      term: text?.term ?? card.term,
      meaning: text?.meaning ?? card.meaning,
      section: card.sectionName,
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
 * Eight hues, set as `.deck-tray[data-hue]` in both apps' `styles.css`. A deck's own is a pure
 * function of its slug, so Explore on the site, the deck page and Explore in the product arrive
 * at the same colour without storing one, and it does not move as the catalogue grows around it.
 * DESIGN.md, "The tray".
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
});
export type ExploreDeckOut = z.infer<typeof ExploreDeckOut>;

/**
 * The shelves, in the order they appear, from the column's own list so the two cannot drift.
 * A deck sits on one shelf; a deck with no category gathers at the end, so publishing is never
 * blocked on choosing one. Each app writes its own headings, because they are translated strings.
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

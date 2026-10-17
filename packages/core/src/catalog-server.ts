import { and, asc, eq, inArray, isNotNull, isNull, type SQL, sql } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import {
  activeAvatarVersion,
  deckPageHand,
  deckPageSpread,
  isPublicDeckSlug,
  PublicDeckOut,
  type PublicDeckResult,
  PublicDeckSummary,
  previewMode,
  rankRelated,
  readableIn,
  stableHash,
} from "./catalog";
import { selectIn } from "./db";
import { askedModes, isImageMode } from "./modes";
import { livePublicationMedia } from "./publication-media";
import {
  cardLocalizations,
  cards,
  deckEditions,
  deckLocalizations,
  deckPageViews,
  deckPublications,
  decks,
  sectionLocalizations,
  sections,
  userAvatars,
} from "./schema/app";
import { SPOKEN_TERM_MAX } from "./terms";
import {
  type Directions,
  publicationTags,
  type ReviewModeKey,
  type SectionProgression,
} from "./types";

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
  deckSectionProgression: SectionProgression;
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
  /** Whether the card can be spoken, so its page offers a clip the product makes on first play. */
  speakable?: boolean;
}

export interface PublicMediaRow {
  cardId: string;
  description: string | null;
  width: number | null;
  height: number | null;
  hasAudio: number;
}

/**
 * Count one request for a published deck's public page on its UTC day. A slug that is missing,
 * withdrawn or archived counts nothing. Publisher reports read these rows; ADR 0028.
 */
export async function countDeckPageView(
  db: CatalogDb,
  slug: string,
  locale: string,
  at: Date = new Date(),
): Promise<void> {
  if (!isPublicDeckSlug(slug)) return;
  const day = at.toISOString().slice(0, 10);
  await db
    .insert(deckPageViews)
    .select(
      db
        .select({
          deckId: deckPublications.deckId,
          day: sql<string>`${day}`.as("day"),
          locale: sql<string>`${locale}`.as("locale"),
          views: sql<number>`1`.as("views"),
        })
        .from(deckPublications)
        .innerJoin(decks, eq(decks.id, deckPublications.deckId))
        .where(
          and(
            eq(deckPublications.slug, slug),
            eq(deckPublications.status, "published"),
            isNull(decks.archivedAt),
          ),
        ),
    )
    .onConflictDoUpdate({
      target: [deckPageViews.deckId, deckPageViews.day, deckPageViews.locale],
      set: { views: sql`${deckPageViews.views} + 1` },
    });
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
    const audio = media?.audio ?? (card.speakable ? { cardId: card.id } : undefined);
    group?.cards.push({
      term: card.term,
      meaning: card.meaning,
      modes: modesOf(publication.deckDirections, card, !!media?.image),
      ...(media?.image ? { image: media.image } : {}),
      ...(audio ? { audio } : {}),
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
    sectionProgression: publication.deckSectionProgression,
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
  const read = await readPublicDeck(db, slug, language);
  if ("status" in read) return read;
  return projectPublicDeck(read.publication, read.sectionRows, read.cardRows, read.mediaRows);
}

/**
 * The ids of the cards a deck page shows before a visitor opens the full list, the spread and
 * the hand, in the original and every published edition. The product voices these ahead. #759.
 */
export async function publicDeckFrontCards(db: CatalogDb, slug: string): Promise<string[]> {
  const original = await readPublicDeck(db, slug);
  if ("status" in original) return [];
  const editions = await Promise.all(
    original.publication.editions.slice(1).map((language) => readPublicDeck(db, slug, language)),
  );
  const ids = new Set<string>();
  for (const read of [original, ...editions]) {
    if ("status" in read) continue;
    const groups = new Map<string | null, (CardRow & { meaning: string })[]>();
    for (const section of read.sectionRows) groups.set(section.id, []);
    groups.set(null, []);
    for (const card of read.cardRows) {
      if (!card.meaning) continue;
      const group = groups.get(card.sectionId) ?? groups.get(null);
      group?.push({ ...card, meaning: card.meaning });
    }
    const shown = [...groups.values()].filter((cards) => cards.length > 0);
    for (const card of deckPageSpread(read.publication, shown)) ids.add(card.id);
    for (const card of deckPageHand(read.publication, shown)) ids.add(card.id);
  }
  return [...ids];
}

async function readPublicDeck(
  db: CatalogDb,
  slug: string,
  language?: string | undefined,
): Promise<
  | { status: "missing" | "unavailable" }
  | {
      publication: PublicationRow;
      sectionRows: SectionRow[];
      cardRows: CardRow[];
      mediaRows: PublicMediaRow[];
    }
> {
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
      deckSectionProgression: decks.sectionProgression,
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
        speakable: sql<number>`${cards.language} is not null and length(${cards.term}) <= ${SPOKEN_TERM_MAX}`,
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
  return {
    publication: {
      ...publication,
      meaningLanguage: shown,
      originalMeaningLanguage: original,
      editions,
      summary: text?.summary ?? publication.summary,
      deckName: text?.name ?? publication.deckName,
      publisherAvatar: activeAvatarVersion(publication),
    },
    sectionRows,
    cardRows: cardRows.map(({ speakable, ...card }) => ({ ...card, speakable: speakable === 1 })),
    mediaRows,
  };
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

/** A deck appears on Explore only while its own page answers 200, so the two can never disagree. */
const publishedAndAlive = () =>
  and(
    eq(deckPublications.status, "published"),
    isNull(decks.archivedAt),
    sql`exists (select 1 from ${cards} where ${cards.deckId} = ${decks.id} and ${cards.archivedAt} is null)`,
  );

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
  for (const row of rows) {
    const list = languages.get(row.deckId);
    if (list) list.push(row.language);
    else languages.set(row.deckId, [row.language]);
  }
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
    const card = from[stableHash(`${row.slug}:${row.revision}:tray`) % from.length];
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

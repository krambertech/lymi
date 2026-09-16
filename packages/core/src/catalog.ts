import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { z } from "zod";
import { cards, deckPublications, decks, sections } from "./schema/app";
import { PUBLICATION_SLUG } from "./types";

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
  meaningLanguage: z.string(),
  publisher: z.string(),
  sources: z.array(z.object({ title: z.string(), url: z.string().optional() })),
  reviewedAt: z.iso.datetime().nullable(),
  revision: z.number().int(),
  publishedAt: z.iso.datetime(),
  cardCount: z.number().int(),
  /** In deck order. A group with no name holds the cards outside any active section, last. */
  sections: z.array(
    z.object({
      name: z.string().nullable(),
      cards: z.array(z.object({ term: z.string(), meaning: z.string().nullable() })),
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
  meaningLanguage: string;
  publisher: string;
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
  term: string;
  meaning: string | null;
  sectionId: string | null;
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
): PublicDeckResult {
  if (publication.status !== "published" || publication.deckArchivedAt || cardRows.length === 0) {
    return { status: "unavailable" };
  }
  const groups = new Map<string | null, PublicDeckOut["sections"][number]>();
  for (const section of sectionRows) groups.set(section.id, { name: section.name, cards: [] });
  groups.set(null, { name: null, cards: [] });
  for (const card of cardRows) {
    const group = groups.get(card.sectionId) ?? groups.get(null);
    group?.cards.push({ term: card.term, meaning: card.meaning });
  }
  const deck = PublicDeckOut.parse({
    slug: publication.slug,
    name: publication.deckName,
    summary: publication.summary,
    level: publication.level,
    language: publication.deckLanguage,
    meaningLanguage: publication.meaningLanguage,
    publisher: publication.publisher,
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

/** Read one published deck for its public page. Selects allowlisted columns only. */
export async function loadPublicDeck(db: CatalogDb, slug: string): Promise<PublicDeckResult> {
  if (!isPublicDeckSlug(slug)) return { status: "missing" };
  const [publication] = await db
    .select({
      deckId: deckPublications.deckId,
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
    })
    .from(deckPublications)
    .innerJoin(decks, eq(decks.id, deckPublications.deckId))
    .where(eq(deckPublications.slug, slug));
  if (!publication) return { status: "missing" };
  if (publication.status !== "published" || publication.deckArchivedAt) {
    return { status: "unavailable" };
  }
  const [sectionRows, cardRows] = await Promise.all([
    db
      .select({ id: sections.id, name: sections.name })
      .from(sections)
      .where(and(eq(sections.deckId, publication.deckId), isNull(sections.archivedAt)))
      .orderBy(asc(sections.position), asc(sections.createdAt), asc(sections.id)),
    db
      .select({ term: cards.term, meaning: cards.meaning, sectionId: cards.sectionId })
      .from(cards)
      .where(and(eq(cards.deckId, publication.deckId), isNull(cards.archivedAt)))
      // Cards added in one batch share a timestamp; rowid keeps the order they were sent in.
      .orderBy(asc(cards.createdAt), sql`rowid`),
  ]);
  return projectPublicDeck(publication, sectionRows, cardRows);
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

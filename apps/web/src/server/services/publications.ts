import type { JoinPreviewOut, PublicationInput, PublicationOut } from "@lymi/core";
import { newId, PUBLICATION_SLUG } from "@lymi/core";
import { and, eq, isNull, sql } from "@lymi/core/db";
import { auditStatement } from "../audit";
import { type Db, schema } from "../db";
import { type ServiceContext, ServiceError } from "./context";
import { previewDoor } from "./deck-door";
import { addableEditions } from "./editions";
import { join, ownedDeck } from "./members";
import { assertPublisher } from "./publishers";

export function isPublicationSlug(value: string | undefined | null): value is string {
  return typeof value === "string" && value.length <= 80 && PUBLICATION_SLUG.test(value);
}

async function publicationOf(db: Db, deckId: string) {
  const [row] = await db
    .select()
    .from(schema.deckPublications)
    .where(eq(schema.deckPublications.deckId, deckId));
  return row ?? null;
}

export function publicationOut(
  productUrl: string,
  row: typeof schema.deckPublications.$inferSelect | null,
): PublicationOut {
  if (!row) return { publication: null };
  return {
    publication: {
      slug: row.slug,
      status: row.status,
      summary: row.summary,
      level: row.level,
      meaningLanguage: row.meaningLanguage,
      editionFields: row.editionFields,
      publisher: row.publisher,
      sources: row.sources,
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      revision: row.revision,
      publishedAt: row.publishedAt.toISOString(),
      withdrawnAt: row.withdrawnAt?.toISOString() ?? null,
      addUrl: new URL(`/add/${row.slug}`, productUrl).toString(),
    },
  };
}

/** The deck's publication, published or withdrawn, or null. Owner only. */
export async function getPublication(ctx: ServiceContext, deckId: string) {
  await ownedDeck(ctx, deckId);
  return publicationOf(ctx.db, deckId);
}

/**
 * Publish a deck, or update what its public page shows. Every call raises the revision so
 * public caches refresh. Publishing again after a withdrawal brings the same slug back.
 */
export async function publishDeck(
  ctx: ServiceContext,
  deckId: string,
  input: PublicationInput,
  publishers: Set<string>,
) {
  const { db, userId, actor } = ctx;
  await assertPublisher(ctx, publishers);
  const deck = await ownedDeck(ctx, deckId);
  if (deck.archivedAt) throw new ServiceError("invalid", "Restore the deck before publishing it");
  const [cards] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.cards)
    .where(and(eq(schema.cards.deckId, deckId), isNull(schema.cards.archivedAt)));
  if (!cards?.count) throw new ServiceError("invalid", "Add cards before publishing the deck");

  const [taken] = await db
    .select({ deckId: schema.deckPublications.deckId })
    .from(schema.deckPublications)
    .where(eq(schema.deckPublications.slug, input.slug));
  if (taken && taken.deckId !== deckId) {
    throw new ServiceError("conflict", "Another deck already uses this slug");
  }
  // The original is the deck's own words, so it can never also be one of its editions.
  const [clash] = await db
    .select({ id: schema.deckEditions.id })
    .from(schema.deckEditions)
    .where(
      and(
        eq(schema.deckEditions.deckId, deckId),
        eq(schema.deckEditions.language, input.meaningLanguage),
      ),
    );
  if (clash) {
    throw new ServiceError("conflict", "The deck already has an edition in that language");
  }

  const now = new Date();
  const existing = await publicationOf(db, deckId);
  const fields = {
    slug: input.slug,
    status: "published" as const,
    summary: input.summary,
    level: input.level ?? null,
    meaningLanguage: input.meaningLanguage,
    // Left out, the choice stands: shrinking it silently would make a half-written edition
    // read as complete, and publishing it would put untranslated cards in front of a learner.
    editionFields: input.editionFields ?? existing?.editionFields ?? ["meaning" as const],
    publisher: input.publisher,
    sources: input.sources,
    reviewedAt: input.reviewedAt ? new Date(input.reviewedAt) : null,
    withdrawnAt: null,
    updatedAt: now,
  };
  const revision = (existing?.revision ?? 0) + 1;
  // The summary is text an edition translates, so a new one makes every edition of it stale.
  const summaryChanged = existing ? existing.summary !== input.summary : false;
  try {
    await db.batch([
      db
        .insert(schema.deckPublications)
        .values({ id: newId(), deckId, ...fields, revision, publishedAt: now })
        .onConflictDoUpdate({
          target: schema.deckPublications.deckId,
          set: {
            ...fields,
            revision: sql`${schema.deckPublications.revision} + 1`,
            // The first publication date stays; a return from withdrawal is a new one.
            publishedAt: sql`case when ${schema.deckPublications.status} = 'withdrawn'
              then ${now.getTime()} else ${schema.deckPublications.publishedAt} end`,
          },
        }),
      ...(summaryChanged
        ? [
            db
              .update(schema.decks)
              .set({ revision: sql`revision + 1`, updatedAt: now })
              .where(eq(schema.decks.id, deckId)),
          ]
        : []),
      auditStatement(db, {
        userId,
        actor,
        action: existing?.status === "published" ? "update_publication" : "publish",
        entity: "deck",
        entityId: deckId,
        payload: { slug: input.slug },
      }),
    ]);
  } catch (err) {
    if (String(err).includes("UNIQUE")) {
      throw new ServiceError("conflict", "Another deck already uses this slug");
    }
    throw err;
  }
  return publicationOf(db, deckId);
}

/** Take a deck off its public page. Members keep studying it; nobody new can add it. */
export async function withdrawDeck(ctx: ServiceContext, deckId: string) {
  const { db, userId, actor } = ctx;
  await ownedDeck(ctx, deckId);
  const existing = await publicationOf(db, deckId);
  if (!existing) throw new ServiceError("not_found", "This deck is not published");
  if (existing.status === "withdrawn") return existing;
  const now = new Date();
  await db.batch([
    db
      .update(schema.deckPublications)
      .set({
        status: "withdrawn",
        withdrawnAt: now,
        revision: sql`${schema.deckPublications.revision} + 1`,
        updatedAt: now,
      })
      .where(eq(schema.deckPublications.id, existing.id)),
    auditStatement(db, {
      userId,
      actor,
      action: "withdraw_publication",
      entity: "deck",
      entityId: deckId,
      payload: { slug: existing.slug },
    }),
  ]);
  return publicationOf(db, deckId);
}

async function publicationBySlug(db: Db, slug: string) {
  if (!isPublicationSlug(slug)) return null;
  const [row] = await db
    .select({
      id: schema.deckPublications.id,
      status: schema.deckPublications.status,
      publisher: schema.deckPublications.publisher,
      deckId: schema.decks.id,
      deckName: schema.decks.name,
      deckLanguage: schema.decks.defaultLanguage,
      deckArchivedAt: schema.decks.archivedAt,
      ownerId: schema.decks.userId,
      meaningLanguage: schema.deckPublications.meaningLanguage,
    })
    .from(schema.deckPublications)
    .innerJoin(schema.decks, eq(schema.decks.id, schema.deckPublications.deckId))
    .where(eq(schema.deckPublications.slug, slug));
  return row ?? null;
}

/** True when the slug names a published deck that is not archived. */
export async function publicationAdmits(db: Db, slug: string): Promise<boolean> {
  const publication = await publicationBySlug(db, slug);
  return Boolean(publication && publication.status === "published" && !publication.deckArchivedAt);
}

/** What the add page may show, in the join page's shape: a withdrawn deck reads as `off`. */
export async function previewPublication(
  db: Db,
  slug: string,
  viewerId: string | null,
): Promise<JoinPreviewOut> {
  const publication = await publicationBySlug(db, slug);
  const deck = publication && {
    id: publication.deckId,
    name: publication.deckName,
    language: publication.deckLanguage,
    ownerId: publication.ownerId,
    shownOwner: publication.publisher,
    archivedAt: publication.deckArchivedAt,
  };
  const preview = await previewDoor(db, deck, publication?.status === "withdrawn", viewerId);
  if (!publication || preview.status !== "live") return preview;
  return {
    ...preview,
    editions: await addableEditions(db, publication.deckId, publication.meaningLanguage),
  };
}

/**
 * Add a published deck to the learner's Library, in the edition the visitor chose. The edition is
 * pinned on the membership and never moves again, whatever the app language does. ADR 0015.
 * Repeats are safe; a learner the owner removed is refused, and a withdrawn deck admits nobody.
 */
export async function addPublishedDeck(
  ctx: ServiceContext,
  slug: string,
  meaningLanguage?: string | undefined,
  /** Take the original when the chosen edition is gone, rather than refusing the whole add. */
  opts: { fallBackToOriginal?: boolean } = {},
) {
  const publication = await publicationBySlug(ctx.db, slug);
  if (!publication || publication.status !== "published" || publication.deckArchivedAt) {
    throw new ServiceError("not_found", "This deck is not published");
  }
  const editions = await addableEditions(ctx.db, publication.deckId, publication.meaningLanguage);
  const chosen = meaningLanguage && editions.includes(meaningLanguage) ? meaningLanguage : null;
  if (meaningLanguage && !chosen && !opts.fallBackToOriginal) {
    throw new ServiceError("invalid", "This deck is not published in that language");
  }
  // The original edition is the deck's own words, so it pins nothing.
  const pinned = chosen && chosen !== publication.meaningLanguage ? chosen : undefined;
  const { role } = await join(ctx, publication.deckId, {
    publicationId: publication.id,
    meaningLanguage: pinned,
  });
  return { deckId: publication.deckId, role };
}

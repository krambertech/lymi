import type { JoinPreviewOut, PublicationInput, PublicationOut } from "@lymi/core";
import { newId, PUBLICATION_SLUG } from "@lymi/core";
import { and, eq, isNull, sql } from "@lymi/core/db";
import { auditStatement } from "../audit";
import { type Db, schema } from "../db";
import { type ServiceContext, ServiceError } from "./context";
import { previewDoor } from "./deck-door";
import { join, ownedDeck } from "./members";

export function isPublicationSlug(value: string | undefined | null): value is string {
  return typeof value === "string" && value.length <= 80 && PUBLICATION_SLUG.test(value);
}

/**
 * Only first-party publishers may publish while the catalog is curated. The list is the
 * `PUBLISHER_EMAILS` variable; the publisher must also own the deck. ADR 0015.
 */
async function assertPublisher(ctx: ServiceContext, publishers: Set<string>) {
  const [row] = await ctx.db
    .select({ email: schema.user.email })
    .from(schema.user)
    .where(eq(schema.user.id, ctx.userId));
  if (!row || !publishers.has(row.email.toLowerCase())) {
    throw new ServiceError("forbidden", "Only Lymi's publishers can publish a deck");
  }
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

  const now = new Date();
  const fields = {
    slug: input.slug,
    status: "published" as const,
    summary: input.summary,
    level: input.level ?? null,
    meaningLanguage: input.meaningLanguage,
    publisher: input.publisher,
    sources: input.sources,
    reviewedAt: input.reviewedAt ? new Date(input.reviewedAt) : null,
    withdrawnAt: null,
    updatedAt: now,
  };
  const existing = await publicationOf(db, deckId);
  const revision = (existing?.revision ?? 0) + 1;
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
  return previewDoor(db, deck, publication?.status === "withdrawn", viewerId);
}

/**
 * Add a published deck to the learner's Library. Repeats are safe; a learner the owner removed
 * is refused, and a withdrawn or archived deck admits nobody.
 */
export async function addPublishedDeck(ctx: ServiceContext, slug: string) {
  const publication = await publicationBySlug(ctx.db, slug);
  if (!publication || publication.status !== "published" || publication.deckArchivedAt) {
    throw new ServiceError("not_found", "This deck is not published");
  }
  const { role } = await join(ctx, publication.deckId, { publicationId: publication.id });
  return { deckId: publication.deckId, role };
}

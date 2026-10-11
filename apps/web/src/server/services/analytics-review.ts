import { and, eq, isNull, lt, ne, or } from "@lymi/core/db";
import { schema } from "../db";
import { track } from "./analytics";
import { audit, auditStatementWhen } from "./audit";
import type { ServiceContext } from "./context";

/** Marks a stored grade as the account's or a published deck's first, after the response. */
export function recordFirstReview(
  ctx: ServiceContext,
  deckId: string,
  review: { id: string; reviewedAt: Date },
): void {
  ctx.analytics?.later?.(async () => {
    try {
      await record(ctx, deckId, review);
    } catch {
      /* A failed analytics marker cannot undo a stored grade. */
    }
  });
}

async function record(
  ctx: ServiceContext,
  deckId: string,
  review: { id: string; reviewedAt: Date },
) {
  const [publication] = await ctx.db
    .select({ slug: schema.deckPublications.slug })
    .from(schema.deckPublications)
    .where(
      and(
        eq(schema.deckPublications.deckId, deckId),
        eq(schema.deckPublications.status, "published"),
      ),
    );
  const keys = [
    {
      key: `${ctx.userId}:account`,
      deckId: undefined as string | undefined,
      slug: undefined as string | undefined,
    },
    ...(publication
      ? [{ key: `${ctx.userId}:deck:${deckId}`, deckId, slug: publication.slug }]
      : []),
  ];
  for (const item of keys) {
    const [existing] = await ctx.db
      .select()
      .from(schema.analyticsReviewStarts)
      .where(eq(schema.analyticsReviewStarts.key, item.key));
    // A later grade may already have named this one first; it still owes the event.
    if (existing && existing.firstReviewId !== null && existing.firstReviewId !== review.id)
      continue;
    if (!existing) {
      const [before] = await ctx.db
        .select({ id: schema.reviews.id })
        .from(schema.reviews)
        .innerJoin(schema.cards, eq(schema.cards.id, schema.reviews.cardId))
        .where(
          and(
            eq(schema.reviews.userId, ctx.userId),
            ne(schema.reviews.source, "import"),
            or(
              lt(schema.reviews.reviewedAt, review.reviewedAt),
              and(
                eq(schema.reviews.reviewedAt, review.reviewedAt),
                lt(schema.reviews.id, review.id),
              ),
            ),
            ...(item.deckId ? [eq(schema.cards.deckId, item.deckId)] : []),
          ),
        )
        .limit(1);
      if (before) {
        const seeded = await ctx.db
          .insert(schema.analyticsReviewStarts)
          .values({ key: item.key, userId: ctx.userId, firstReviewId: before.id })
          .onConflictDoNothing()
          .returning();
        if (seeded.length)
          await audit(ctx, { entity: "account", action: "analytics.review_start", id: ctx.userId });
        continue;
      }
      await ctx.db
        .insert(schema.analyticsReviewStarts)
        .values({ key: item.key, userId: ctx.userId, firstReviewId: null })
        .onConflictDoNothing();
    }
    const eligible = and(
      eq(schema.analyticsReviewStarts.key, item.key),
      or(
        isNull(schema.analyticsReviewStarts.firstReviewId),
        eq(schema.analyticsReviewStarts.firstReviewId, review.id),
      ),
    )!;
    const [, rows] = await ctx.db.batch([
      auditStatementWhen(
        ctx,
        { entity: "account", action: "analytics.review_start", id: ctx.userId },
        schema.analyticsReviewStarts,
        eligible,
      ),
      ctx.db
        .update(schema.analyticsReviewStarts)
        .set({ firstReviewId: review.id })
        .where(eligible)
        .returning(),
    ]);
    if (!rows.length) continue;
    if (item.slug) track(ctx.analytics, { name: "first_session_started", deck_slug: item.slug });
    else
      track(ctx.analytics, { name: "welcome_step_finished", step_name: "review", skipped: false });
  }
}

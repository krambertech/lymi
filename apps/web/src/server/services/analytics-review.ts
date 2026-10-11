import { and, eq, isNull, ne } from "@lymi/core/db";
import { schema } from "../db";
import { track } from "./analytics";
import { audit, auditStatementWhen } from "./audit";
import type { ServiceContext } from "./context";

/** Marks a stored grade as the account's or a published deck's first, after the response. */
export function recordFirstReview(ctx: ServiceContext, deckId: string, reviewId: string): void {
  ctx.analytics?.later?.(async () => {
    try {
      await record(ctx, deckId, reviewId);
    } catch {
      /* A failed analytics marker cannot undo a stored grade. */
    }
  });
}

async function record(ctx: ServiceContext, deckId: string, reviewId: string) {
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
    if (existing && existing.firstReviewId !== null) continue;
    if (!existing) {
      const [before] = await ctx.db
        .select({ id: schema.reviews.id })
        .from(schema.reviews)
        .innerJoin(schema.cards, eq(schema.cards.id, schema.reviews.cardId))
        .where(
          and(
            eq(schema.reviews.userId, ctx.userId),
            ne(schema.reviews.id, reviewId),
            ne(schema.reviews.source, "import"),
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
      isNull(schema.analyticsReviewStarts.firstReviewId),
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
        .set({ firstReviewId: reviewId })
        .where(eligible)
        .returning(),
    ]);
    if (!rows.length) continue;
    if (item.slug) track(ctx.analytics, { name: "first_session_started", deck_slug: item.slug });
    else
      track(ctx.analytics, { name: "welcome_step_finished", step_name: "review", skipped: false });
  }
}

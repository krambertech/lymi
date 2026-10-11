import { and, eq, isNull, ne } from "@lymi/core/db";
import { schema } from "../db";
import { track } from "./analytics";
import { audit, auditStatementWhen } from "./audit";
import type { ServiceContext } from "./context";

export async function prepareReviewAnalytics(ctx: ServiceContext, deckId: string) {
  try {
    return await prepare(ctx, deckId);
  } catch {
    return async () => {};
  }
}
async function prepare(ctx: ServiceContext, deckId: string) {
  if (!ctx.analytics?.capture) return async () => {};
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
  const pending: typeof keys = [];
  for (const item of keys) {
    const [existing] = await ctx.db
      .select()
      .from(schema.analyticsReviewStarts)
      .where(eq(schema.analyticsReviewStarts.key, item.key));
    if (existing) {
      if (existing.firstReviewId === null) pending.push(item);
      continue;
    }
    const [before] = await ctx.db
      .select({ id: schema.reviews.id })
      .from(schema.reviews)
      .innerJoin(schema.cards, eq(schema.cards.id, schema.reviews.cardId))
      .where(
        and(
          eq(schema.reviews.userId, ctx.userId),
          ne(schema.reviews.source, "import"),
          ...(item.deckId ? [eq(schema.cards.deckId, item.deckId)] : []),
        ),
      )
      .limit(1);
    if (!before) pending.push(item);
    const inserted = await ctx.db
      .insert(schema.analyticsReviewStarts)
      .values({ key: item.key, userId: ctx.userId, firstReviewId: before?.id ?? null })
      .onConflictDoNothing()
      .returning();
    if (inserted.length)
      await audit(ctx, { entity: "account", action: "analytics.review_start", id: ctx.userId });
  }
  return async (reviewId: string) => {
    try {
      for (const item of pending) {
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
            .where(
              and(
                eq(schema.analyticsReviewStarts.key, item.key),
                isNull(schema.analyticsReviewStarts.firstReviewId),
              ),
            )
            .returning(),
        ]);
        if (!rows.length) continue;
        if (item.slug)
          track(ctx.analytics, { name: "first_session_started", deck_slug: item.slug });
        else
          track(ctx.analytics, {
            name: "welcome_step_finished",
            step_name: "review",
            skipped: false,
          });
      }
    } catch {
      /* A failed analytics marker cannot undo a stored grade. */
    }
  };
}

import { and, eq, ne } from "@lymi/core/db";
import { schema } from "../db";
import { track } from "./analytics";
import type { ServiceContext } from "./context";

/**
 * Finishes the welcome guide's `deck` step when the account gets its first deck, by creating
 * one or joining one, after the response. The guide often is not on screen when that happens
 * (joining a ready deck goes straight to a review), so the server logs it, as it does `review`.
 * Marked in `analytics_review_starts` under its own key, so a second deck logs nothing.
 */
export function recordFirstDeck(ctx: ServiceContext, deckId: string): void {
  ctx.analytics?.later?.(async () => {
    try {
      await record(ctx, deckId);
    } catch {
      /* A failed analytics marker cannot undo a stored deck. */
    }
  });
}

async function record(ctx: ServiceContext, deckId: string) {
  const key = `${ctx.userId}:welcome-deck`;
  const [existing] = await ctx.db
    .select({ key: schema.analyticsReviewStarts.key })
    .from(schema.analyticsReviewStarts)
    .where(eq(schema.analyticsReviewStarts.key, key));
  if (existing) return;
  // An account that already had a deck before this marker existed finished the step long ago.
  const [owned] = await ctx.db
    .select({ id: schema.decks.id })
    .from(schema.decks)
    .where(and(eq(schema.decks.userId, ctx.userId), ne(schema.decks.id, deckId)))
    .limit(1);
  const [member] = await ctx.db
    .select({ id: schema.deckMembers.id })
    .from(schema.deckMembers)
    .where(and(eq(schema.deckMembers.userId, ctx.userId), ne(schema.deckMembers.deckId, deckId)))
    .limit(1);
  const marked = await ctx.db
    .insert(schema.analyticsReviewStarts)
    .values({ key, userId: ctx.userId, firstReviewId: null })
    .onConflictDoNothing()
    .returning();
  if (!marked.length || owned || member) return;
  track(ctx.analytics, { name: "welcome_step_finished", step_name: "deck", skipped: false });
}

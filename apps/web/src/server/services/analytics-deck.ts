import { and, type Column, eq, lt, or, type SQL } from "@lymi/core/db";
import { schema } from "../db";
import { track } from "./analytics";
import type { ServiceContext } from "./context";

/**
 * The deck the account just created, or the first of an import's new decks, or the deck it
 * just joined.
 */
export type NewDeck = { created: string } | { joined: string };

/**
 * Finishes the welcome guide's `deck` step when the account gets its first deck, by creating
 * one, importing some or joining one, after the response. The guide often is not on screen when
 * that happens (joining a ready deck goes straight to a review), so the server logs it, as it
 * does `review`. Only the account's earliest deck or membership may claim the step, and it
 * claims it by inserting a marker in `analytics_review_starts` under its own key: two first
 * decks made at nearly the same moment race on that insert, and only the winner logs.
 */
export function recordFirstDeck(ctx: ServiceContext, deck: NewDeck): void {
  ctx.analytics?.later?.(async () => {
    try {
      await record(ctx, deck);
    } catch {
      /* A failed analytics marker cannot undo a stored deck. */
    }
  });
}

/** Earlier by time, then by id, which `newId` orders by creation time within one table. */
function before(
  table: { createdAt: Column; id: Column },
  at: { createdAt: Date; id: string },
): SQL {
  return or(
    lt(table.createdAt, at.createdAt),
    and(eq(table.createdAt, at.createdAt), lt(table.id, at.id)),
  ) as SQL;
}

async function record(ctx: ServiceContext, deck: NewDeck) {
  const { db, userId } = ctx;
  const columns = { createdAt: schema.decks.createdAt, id: schema.decks.id };
  const memberColumns = { createdAt: schema.deckMembers.createdAt, id: schema.deckMembers.id };
  const own = "created" in deck;
  const [first] = own
    ? await db
        .select(columns)
        .from(schema.decks)
        .where(and(eq(schema.decks.userId, userId), eq(schema.decks.id, deck.created)))
    : await db
        .select(memberColumns)
        .from(schema.deckMembers)
        .where(
          and(eq(schema.deckMembers.userId, userId), eq(schema.deckMembers.deckId, deck.joined)),
        );
  if (!first) return;
  // A deck or membership from before this one, including one from before the marker existed,
  // claims the step itself, or finished it long ago.
  const [earlierDeck] = await db
    .select({ id: schema.decks.id })
    .from(schema.decks)
    .where(
      and(
        eq(schema.decks.userId, userId),
        own ? before(columns, first) : lt(schema.decks.createdAt, first.createdAt),
      ),
    )
    .limit(1);
  if (earlierDeck) return;
  const [earlierMembership] = await db
    .select({ id: schema.deckMembers.id })
    .from(schema.deckMembers)
    .where(
      and(
        eq(schema.deckMembers.userId, userId),
        own ? lt(schema.deckMembers.createdAt, first.createdAt) : before(memberColumns, first),
      ),
    )
    .limit(1);
  if (earlierMembership) return;
  const marked = await db
    .insert(schema.analyticsReviewStarts)
    .values({ key: `${userId}:welcome-deck`, userId, firstReviewId: null })
    .onConflictDoNothing()
    .returning({ key: schema.analyticsReviewStarts.key });
  if (marked.length === 0) return;
  track(ctx.analytics, { name: "welcome_step_finished", step_name: "deck", skipped: false });
}

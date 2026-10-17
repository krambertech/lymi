import { newId } from "@lymi/core";
import { and, eq, inArray } from "@lymi/core/db";
import { schema } from "../db";
import { track } from "./analytics";
import { auditStatement } from "./audit";
import { runBatch, type Statement, selectIn } from "./batch";
import { type CardView, presentCard } from "./card-view";
import {
  CARDS_PER_BATCH,
  type CardWriteError,
  getCard,
  refusalOf,
  visibleCards,
  writeFailed,
} from "./cards";
import { notFound, type ServiceContext } from "./context";

const CHANNEL = { user: "app", api: "api", mcp: "mcp" } as const;

/**
 * Marks or unmarks a card as important to the learner, in any deck they can see. The mark weights
 * the draw and never changes a schedule. Setting the mark it already has writes nothing.
 */
export async function setImportant(
  ctx: ServiceContext,
  cardId: string,
  important: boolean,
): Promise<CardView> {
  const card = await getCard(ctx, cardId);
  const mine = and(
    eq(schema.importantCards.cardId, card.id),
    eq(schema.importantCards.userId, ctx.userId),
  );
  const [existing] = await ctx.db
    .select({ id: schema.importantCards.id })
    .from(schema.importantCards)
    .where(mine);
  if (Boolean(existing) !== important) {
    const write = important
      ? ctx.db
          .insert(schema.importantCards)
          .values({ id: newId(), cardId: card.id, userId: ctx.userId, createdAt: new Date() })
          .onConflictDoNothing()
      : ctx.db.delete(schema.importantCards).where(mine);
    await ctx.db.batch([
      write,
      auditStatement(ctx, {
        entity: "card",
        action: important ? "mark_important" : "unmark_important",
        id: card.id,
        deckId: card.deckId,
      }),
    ]);
    const channel = CHANNEL[ctx.actor as keyof typeof CHANNEL];
    if (channel) track(ctx.analytics, { name: "card_importance_set", important, channel });
  }
  return presentCard(ctx.db, card, ctx.userId);
}

export type ImportantCardOutcome =
  | { id: string; status: "updated"; important: boolean }
  | CardWriteError;

/**
 * Sets each card's mark, as `setImportant` would, with an audit row per change. A card the learner
 * cannot see reports why and the rest still change. Outcomes come back in the order sent.
 */
export async function setImportantMany(
  ctx: ServiceContext,
  marks: readonly { cardId: string; important: boolean }[],
): Promise<ImportantCardOutcome[]> {
  const ids = marks.map((mark) => mark.cardId);
  const cards = await visibleCards(ctx, ids);
  const marked = new Set(
    (
      await selectIn([...cards.keys()], (slice) =>
        ctx.db
          .select({ cardId: schema.importantCards.cardId })
          .from(schema.importantCards)
          .where(
            and(
              inArray(schema.importantCards.cardId, slice),
              eq(schema.importantCards.userId, ctx.userId),
            ),
          ),
      )
    ).map((row) => row.cardId),
  );
  const writes: { id: string; important: boolean; statements: Statement[] }[] = [];
  const refusals = marks.map(({ cardId, important }) =>
    refusalOf(cardId, () => {
      const card = cards.get(cardId);
      if (!card) throw notFound("Card");
      if (marked.has(cardId) === important) return;
      const mine = and(
        eq(schema.importantCards.cardId, cardId),
        eq(schema.importantCards.userId, ctx.userId),
      );
      writes.push({
        id: cardId,
        important,
        statements: [
          important
            ? ctx.db
                .insert(schema.importantCards)
                .values({ id: newId(), cardId, userId: ctx.userId, createdAt: new Date() })
                .onConflictDoNothing()
            : ctx.db.delete(schema.importantCards).where(mine),
          auditStatement(ctx, {
            entity: "card",
            action: important ? "mark_important" : "unmark_important",
            id: cardId,
            deckId: card.deckId,
          }),
        ],
      });
    }),
  );
  const failed = new Set<string>();
  for (let i = 0; i < writes.length; i += CARDS_PER_BATCH) {
    const slice = writes.slice(i, i + CARDS_PER_BATCH);
    try {
      await runBatch(
        ctx.db,
        slice.flatMap((write) => write.statements),
      );
    } catch (err) {
      console.error("Bulk important write failed", {
        error: err instanceof Error ? err.name : typeof err,
      });
      for (const write of slice) failed.add(write.id);
    }
  }
  const channel = CHANNEL[ctx.actor as keyof typeof CHANNEL];
  for (const important of [true, false]) {
    const count = writes.filter((w) => w.important === important && !failed.has(w.id)).length;
    if (channel && count > 0) {
      track(ctx.analytics, { name: "card_importance_set", important, channel, count });
    }
  }
  return marks.map(({ cardId, important }, index) => {
    const refused = refusals[index];
    if (refused) return refused;
    return failed.has(cardId) ? writeFailed(cardId) : { id: cardId, status: "updated", important };
  });
}

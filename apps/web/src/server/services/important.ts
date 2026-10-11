import { newId } from "@lymi/core";
import { and, eq } from "@lymi/core/db";
import { schema } from "../db";
import { track } from "./analytics";
import { auditStatement } from "./audit";
import { type CardView, presentCard } from "./card-view";
import { getCard } from "./cards";
import type { ServiceContext } from "./context";

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

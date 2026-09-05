import { deserializeState, GradeInput, newId, preview, schedule, serializeState } from "@lymi/core";
import { and, asc, eq, isNull, lte, sql } from "@lymi/core/db";
import { Hono } from "hono";
import { audit } from "../audit";
import { schema } from "../db";
import type { AppEnv } from "../index";

export const review = new Hono<AppEnv>();

/**
 * Cards due now, oldest due first, with the four possible next intervals so the
 * grade buttons can show "Good · 6 d" without a round trip.
 */
review.get("/queue", async (c) => {
  const db = c.get("db");
  const userId = c.get("user").id;
  const deckId = c.req.query("deck");
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);
  const now = new Date();

  const rows = await db
    .select({ card: schema.cards, state: schema.cardStates })
    .from(schema.cardStates)
    .innerJoin(schema.cards, eq(schema.cards.id, schema.cardStates.cardId))
    .where(
      and(
        eq(schema.cardStates.userId, userId),
        lte(schema.cardStates.due, now),
        isNull(schema.cards.archivedAt),
        deckId ? eq(schema.cards.deckId, deckId) : undefined,
      ),
    )
    .orderBy(asc(schema.cardStates.due))
    .limit(limit);

  const [{ total } = { total: 0 }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(schema.cardStates)
    .innerJoin(schema.cards, eq(schema.cards.id, schema.cardStates.cardId))
    .where(
      and(
        eq(schema.cardStates.userId, userId),
        lte(schema.cardStates.due, now),
        isNull(schema.cards.archivedAt),
        deckId ? eq(schema.cards.deckId, deckId) : undefined,
      ),
    );

  const items = rows.map(({ card, state }) => {
    const fsrs = deserializeState(state.fsrs);
    const next = preview(fsrs, now);
    return {
      card,
      direction: state.direction,
      stateId: state.id,
      fsrsState: state.state,
      next: {
        1: next[1].toISOString(),
        2: next[2].toISOString(),
        3: next[3].toISOString(),
        4: next[4].toISOString(),
      },
    };
  });

  return c.json({ total, items });
});

/** Apply one grade. Idempotent enough for offline replay: a duplicate review of the same state is a no-op. */
review.post("/grade", async (c) => {
  const db = c.get("db");
  const userId = c.get("user").id;
  const parsed = GradeInput.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: "Invalid grade", issues: parsed.error.issues }, 400);
  const { cardId, direction, rating } = parsed.data;
  const reviewedAt = parsed.data.reviewedAt ?? new Date();

  const [state] = await db
    .select()
    .from(schema.cardStates)
    .where(
      and(
        eq(schema.cardStates.cardId, cardId),
        eq(schema.cardStates.userId, userId),
        eq(schema.cardStates.direction, direction),
      ),
    );
  if (!state) return c.json({ error: "Card not found" }, 404);

  // Offline replay guard: if we already have a review for this state at this moment, skip it.
  if (state.lastReview && state.lastReview.getTime() >= reviewedAt.getTime()) {
    return c.json({ ok: true, duplicate: true, due: state.due.toISOString() });
  }

  const result = schedule(deserializeState(state.fsrs), rating, reviewedAt);

  await db.batch([
    db
      .update(schema.cardStates)
      .set({
        due: result.card.due,
        state: result.card.state,
        fsrs: serializeState(result.card),
        lastReview: reviewedAt,
        updatedAt: new Date(),
      })
      .where(eq(schema.cardStates.id, state.id)),
    db.insert(schema.reviews).values({
      id: newId(),
      userId,
      cardId,
      cardStateId: state.id,
      direction,
      rating,
      state: result.log.state,
      elapsedDays: result.log.elapsedDays,
      scheduledDays: result.log.scheduledDays,
      stabilityAfter: result.card.stability,
      difficultyAfter: result.card.difficulty,
      reviewedAt,
      source: "web",
    }),
  ]);
  await audit(db, {
    userId,
    actor: "user",
    action: "grade",
    entity: "review",
    entityId: cardId,
    payload: { rating, direction },
  });

  return c.json({ ok: true, due: result.card.due.toISOString(), state: result.card.state });
});

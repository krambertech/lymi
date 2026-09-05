import {
  CardInput,
  CardPatch,
  emptyState,
  expandDirections,
  newId,
  serializeState,
} from "@lymi/core";
import { and, eq } from "@lymi/core/db";
import { Hono } from "hono";
import { audit } from "../audit";
import { type Db, schema } from "../db";
import type { AppEnv } from "../index";

export const cards = new Hono<AppEnv>();

/**
 * Create a card and its scheduling state. Both directions get a state row so the review
 * queue can serve either; production is opt-in per deck later, so only recognition is due now.
 */
cards.post("/", async (c) => {
  const db = c.get("db");
  const userId = c.get("user").id;
  const parsed = CardInput.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: "Invalid card", issues: parsed.error.issues }, 400);
  const input = parsed.data;

  const [deck] = await db
    .select({
      id: schema.decks.id,
      defaultLanguage: schema.decks.defaultLanguage,
      directions: schema.decks.directions,
    })
    .from(schema.decks)
    .where(and(eq(schema.decks.id, input.deckId), eq(schema.decks.userId, userId)));
  if (!deck) return c.json({ error: "Deck not found" }, 404);

  const id = newId();
  const now = new Date();
  const language = input.language === undefined ? deck.defaultLanguage : input.language;
  const directions = expandDirections(input.directions ?? deck.directions);

  await db.batch([
    db.insert(schema.cards).values({
      id,
      userId,
      deckId: input.deckId,
      term: input.term,
      meaning: input.meaning ?? null,
      pronunciation: input.pronunciation ?? null,
      example: input.example ?? null,
      notes: input.notes ?? null,
      language,
      tags: input.tags ?? [],
      source: input.source ?? null,
      directions: input.directions ?? null,
      meaningSource: input.meaningSource ?? (input.meaning ? "manual" : null),
      exampleSource: input.exampleSource ?? (input.example ? "manual" : null),
    }),
    ...directions.map((direction) =>
      db.insert(schema.cardStates).values({
        id: newId(),
        cardId: id,
        userId,
        direction,
        due: now,
        state: 0,
        fsrs: serializeState(emptyState(now)),
      }),
    ),
  ]);
  await audit(db, {
    userId,
    actor: "user",
    action: "create",
    entity: "card",
    entityId: id,
    payload: input,
  });

  const [card] = await db.select().from(schema.cards).where(eq(schema.cards.id, id));
  return c.json(card, 201);
});

cards.patch("/:id", async (c) => {
  const db = c.get("db");
  const userId = c.get("user").id;
  const id = c.req.param("id");
  const parsed = CardPatch.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: "Invalid patch", issues: parsed.error.issues }, 400);

  const [existing] = await db
    .select({ id: schema.cards.id })
    .from(schema.cards)
    .where(and(eq(schema.cards.id, id), eq(schema.cards.userId, userId)));
  if (!existing) return c.json({ error: "Not found" }, 404);

  await db
    .update(schema.cards)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(schema.cards.id, id));
  await audit(db, {
    userId,
    actor: "user",
    action: "update",
    entity: "card",
    entityId: id,
    payload: parsed.data,
  });

  const [card] = await db.select().from(schema.cards).where(eq(schema.cards.id, id));
  return c.json(card);
});

/** Archive, never delete. Undo is a second call with `restore`. */
cards.post("/:id/archive", async (c) => {
  const ok = await setArchived(c.get("db"), c.get("user").id, c.req.param("id"), new Date());
  return ok ? c.json({ ok: true }) : c.json({ error: "Not found" }, 404);
});
cards.post("/:id/restore", async (c) => {
  const ok = await setArchived(c.get("db"), c.get("user").id, c.req.param("id"), null);
  return ok ? c.json({ ok: true }) : c.json({ error: "Not found" }, 404);
});

async function setArchived(db: Db, userId: string, id: string, archivedAt: Date | null) {
  const result = await db
    .update(schema.cards)
    .set({ archivedAt, updatedAt: new Date() })
    .where(and(eq(schema.cards.id, id), eq(schema.cards.userId, userId)))
    .returning({ id: schema.cards.id });
  if (result.length === 0) return false;
  await audit(db, {
    userId,
    actor: "user",
    action: archivedAt ? "archive" : "restore",
    entity: "card",
    entityId: id,
  });
  return true;
}

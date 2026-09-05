import { DeckInput, newId } from "@lymi/core";
import { and, asc, eq, isNull, sql } from "@lymi/core/db";
import { Hono } from "hono";
import { audit } from "../audit";
import type { Db } from "../db";
import { schema } from "../db";
import type { AppEnv } from "../index";

export const decks = new Hono<AppEnv>();

/** All active decks with counts of due and total cards. */
decks.get("/", async (c) => {
  const db = c.get("db");
  const userId = c.get("user").id;
  const now = Date.now();

  const rows = await db
    .select({
      id: schema.decks.id,
      name: schema.decks.name,
      description: schema.decks.description,
      defaultLanguage: schema.decks.defaultLanguage,
      directions: schema.decks.directions,
      position: schema.decks.position,
      total: sql<number>`(select count(*) from cards c where c.deck_id = decks.id and c.archived_at is null)`,
      due: sql<number>`(select count(*) from card_states s join cards c on c.id = s.card_id where c.deck_id = decks.id and c.archived_at is null and s.due <= ${now})`,
    })
    .from(schema.decks)
    .where(and(eq(schema.decks.userId, userId), isNull(schema.decks.archivedAt)))
    .orderBy(asc(schema.decks.position), asc(schema.decks.createdAt));

  return c.json(rows);
});

decks.post("/", async (c) => {
  const db = c.get("db");
  const userId = c.get("user").id;
  const parsed = DeckInput.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: "Invalid deck", issues: parsed.error.issues }, 400);

  const id = newId();
  await db.insert(schema.decks).values({
    id,
    userId,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    defaultLanguage: parsed.data.defaultLanguage ?? null,
    directions: parsed.data.directions ?? "recognition",
  });
  await audit(db, {
    userId,
    actor: "user",
    action: "create",
    entity: "deck",
    entityId: id,
    payload: parsed.data,
  });

  const [deck] = await db.select().from(schema.decks).where(eq(schema.decks.id, id));
  return c.json(deck, 201);
});

decks.get("/:id", async (c) => {
  const db = c.get("db");
  const userId = c.get("user").id;
  const [deck] = await db
    .select()
    .from(schema.decks)
    .where(and(eq(schema.decks.id, c.req.param("id")), eq(schema.decks.userId, userId)));
  if (!deck) return c.json({ error: "Not found" }, 404);
  return c.json(deck);
});

decks.patch("/:id", async (c) => {
  const db = c.get("db");
  const userId = c.get("user").id;
  const id = c.req.param("id");
  const parsed = DeckInput.partial().safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: "Invalid deck", issues: parsed.error.issues }, 400);

  const result = await db
    .update(schema.decks)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(schema.decks.id, id), eq(schema.decks.userId, userId)))
    .returning({ id: schema.decks.id });
  if (result.length === 0) return c.json({ error: "Not found" }, 404);
  await audit(db, {
    userId,
    actor: "user",
    action: "update",
    entity: "deck",
    entityId: id,
    payload: parsed.data,
  });
  const [deck] = await db.select().from(schema.decks).where(eq(schema.decks.id, id));
  return c.json(deck);
});

/** Archive, never delete. The cards stay where they are; the deck leaves every list until restored. */
decks.post("/:id/archive", async (c) => {
  const ok = await setArchived(c.get("db"), c.get("user").id, c.req.param("id"), new Date());
  return ok ? c.json({ ok: true }) : c.json({ error: "Not found" }, 404);
});
decks.post("/:id/restore", async (c) => {
  const ok = await setArchived(c.get("db"), c.get("user").id, c.req.param("id"), null);
  return ok ? c.json({ ok: true }) : c.json({ error: "Not found" }, 404);
});

async function setArchived(db: Db, userId: string, id: string, archivedAt: Date | null) {
  const result = await db
    .update(schema.decks)
    .set({ archivedAt, updatedAt: new Date() })
    .where(and(eq(schema.decks.id, id), eq(schema.decks.userId, userId)))
    .returning({ id: schema.decks.id });
  if (result.length === 0) return false;
  await audit(db, {
    userId,
    actor: "user",
    action: archivedAt ? "archive" : "restore",
    entity: "deck",
    entityId: id,
    payload: {},
  });
  return true;
}

/** Cards in a deck with their recognition-direction state, newest first. */
decks.get("/:id/cards", async (c) => {
  const db = c.get("db");
  const userId = c.get("user").id;
  const deckId = c.req.param("id");

  const rows = await db
    .select({
      card: schema.cards,
      state: schema.cardStates,
    })
    .from(schema.cards)
    .leftJoin(
      schema.cardStates,
      and(
        eq(schema.cardStates.cardId, schema.cards.id),
        eq(schema.cardStates.direction, "recognition"),
      ),
    )
    .where(
      and(
        eq(schema.cards.deckId, deckId),
        eq(schema.cards.userId, userId),
        isNull(schema.cards.archivedAt),
      ),
    )
    .orderBy(sql`${schema.cards.createdAt} desc`);

  return c.json(rows);
});

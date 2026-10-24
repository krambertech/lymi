import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Db, schema } from "../db";
import { personaEmail } from "../dev/personas";
import { addCards } from "./cards";
import type { ServiceContext } from "./context";
import { createDeck } from "./decks";
import { deletePersonaAccount } from "./dev";
import { addPublishedDeck, publishDeck } from "./publications";
import { gradeCard } from "./review";
import { learner, testDb } from "./test-db";

/**
 * Deleting an account past every service, as `wrangler d1 execute` would. The database refuses
 * while the account owns a deck other people study, since only `deleteAccount` copies it for
 * them first. Migration 0063.
 */
let db: Db;
let raw: D1Database;
let dispose: () => Promise<void>;
let anna: ServiceContext;

beforeAll(async () => {
  ({ db, raw, dispose } = await testDb());
  anna = await learner(db, "anna", "Anna");
}, 60_000);

afterAll(async () => {
  await dispose();
});

async function publisher(id: string, email = `${id}@lymi.test`): Promise<ServiceContext> {
  await db.insert(schema.user).values({ id, name: "Lymi", email });
  return { db, userId: id, actor: "user" };
}

/** A deck `owner` publishes under `slug`, which Anna then adds and reviews once. */
async function studiedDeck(owner: ServiceContext, email: string, slug: string) {
  const deck = await createDeck(owner, { name: `Deck ${slug}`, defaultLanguage: "et" });
  const [added] = await addCards(owner, [{ deckId: deck.id, term: `tere ${slug}`, meaning: "hi" }]);
  if (added?.status !== "added") throw new Error("card not added");
  await publishDeck(
    owner,
    deck.id,
    {
      slug,
      summary: "Words for your first weeks in Estonia.",
      meaningLanguage: "en",
      publisher: "Lymi",
      sources: [{ title: "EKI A1 word list" }],
    },
    new Set([email]),
  );
  await addPublishedDeck(anna, slug);
  await gradeCard(anna, { cardId: added.card.id, direction: "recognition", rating: 3 });
  return deck;
}

/** A delete as `wrangler d1 execute` would send it, past every service. */
const deleteUser = (id: string) => raw.prepare("delete from user where id = ?").bind(id).run();

async function count(table: string, column: string, value: string) {
  const row = await raw
    .prepare(`select count(*) as n from "${table}" where "${column}" = ?`)
    .bind(value)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

describe("deleting an account", () => {
  it("is refused while it owns an unarchived deck someone else studies", async () => {
    const lymi = await publisher("lymi-studied-guard");
    const deck = await studiedDeck(lymi, "lymi-studied-guard@lymi.test", "guarded");
    const annaReviews = await count("reviews", "user_id", anna.userId);

    await expect(deleteUser(lymi.userId)).rejects.toThrow(/owns a deck other people study/);
    expect(await count("decks", "id", deck.id)).toBe(1);
    expect(await count("reviews", "user_id", anna.userId)).toBe(annaReviews);

    await raw.prepare("update decks set archived_at = 1 where id = ?").bind(deck.id).run();
    await deleteUser(lymi.userId);
    expect(await count("user", "id", lymi.userId)).toBe(0);
  });

  it("goes through for an account studying a published deck", async () => {
    const lymi = await publisher("lymi-studied");
    await studiedDeck(lymi, "lymi-studied@lymi.test", "studied-guard");
    const marko = await learner(db, "marko", "Marko");
    const own = await createDeck(marko, { name: "Mine", defaultLanguage: "et" });
    await addCards(marko, [{ deckId: own.id, term: "kass" }]);
    await addPublishedDeck(marko, "studied-guard");

    await deleteUser(marko.userId);

    expect(await count("user", "id", marko.userId)).toBe(0);
    expect(await count("decks", "id", own.id)).toBe(0);
    expect(await count("card_states", "user_id", marko.userId)).toBe(0);
  });

  it("rebuilds a stale publisher persona by deleting its publications first", async () => {
    const email = personaEmail("publisher");
    const persona = await publisher("persona-publisher", email);
    const deck = await studiedDeck(persona, email, "persona-guard");

    await deletePersonaAccount(db, email);

    expect(await count("user", "id", persona.userId)).toBe(0);
    expect(await count("decks", "id", deck.id)).toBe(0);
  });
});

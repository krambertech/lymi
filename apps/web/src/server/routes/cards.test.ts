import {
  AddCardsOut,
  ApiKeyCreatedOut,
  ArchiveCardsOut,
  CardDetailOut,
  CardOut,
  DeckOut,
  EditCardsOut,
  TerseCardsOut,
} from "@lymi/core";
import { beforeAll, describe, expect, it } from "vitest";
import { json, type Session, type TestApp, testApp } from "../test-app";

let app: TestApp;
let learner: Session;
let deckId: string;

async function addTerms(terms: string[], query = "") {
  const response = await app.fetch(`/api/cards/batch${query}`, {
    ...json({ cards: terms.map((term) => ({ deckId, term, source: "Lezione 3" })) }),
    as: learner,
  });
  expect(response.status).toBe(200);
  return response.json();
}

async function ids(terms: string[]) {
  const { results } = AddCardsOut.parse(await addTerms(terms));
  return results.map((outcome) => {
    if (outcome.status !== "added") throw new Error(`${outcome.term} was skipped`);
    return outcome.card.id;
  });
}

beforeAll(async () => {
  app = await testApp();
  learner = await app.signUp("learner");
  const response = await app.fetch("/api/decks", {
    ...json({ name: "Lezione", defaultLanguage: "it" }),
    as: learner,
  });
  deckId = DeckOut.parse(await response.json()).id;
}, 60_000);

describe("bulk card writes", () => {
  it("edits many cards, reporting a missing one without failing the rest", async () => {
    const [first, second] = await ids(["ormai", "magari"]);

    const response = await app.fetch("/api/cards/batch", {
      ...json(
        {
          cards: [
            { cardId: first, source: "" },
            { cardId: "no-such-card", source: "" },
            { cardId: second, source: "" },
          ],
        },
        { method: "PATCH" },
      ),
      as: learner,
    });

    expect(response.status).toBe(200);
    const { results } = EditCardsOut.parse(await response.json());
    expect(results.map((outcome) => outcome.status)).toEqual(["updated", "error", "updated"]);
    expect(results[0]).toMatchObject({ id: first, card: { id: first, source: "" } });
    expect(results[1]).toEqual({
      id: "no-such-card",
      status: "error",
      code: "not_found",
      error: "Card not found",
    });
  });

  it("returns only ids and statuses when asked for terse", async () => {
    const [first] = await ids(["allora"]);

    const edited = await app.fetch("/api/cards/batch?response=terse", {
      ...json({ cards: [{ cardId: first, meaning: "then" }] }, { method: "PATCH" }),
      as: learner,
    });
    expect(TerseCardsOut.parse(await edited.json()).results).toEqual([
      { id: first, status: "updated" },
    ]);

    const added = TerseCardsOut.parse(await addTerms(["allora", "dunque"], "?response=terse"));
    expect(added.results[0]).toEqual({
      id: first,
      status: "skipped",
      enrichmentStatus: null,
      term: "allora",
      deckId,
      deckName: "Lezione",
    });
    expect(added.results[1]).toMatchObject({ status: "added", enrichmentStatus: null });
  });

  it("answers a single edit with the whole card, whatever the query asks", async () => {
    const [first] = await ids(["quindi"]);
    const response = await app.fetch(`/api/cards/${first}?response=terse`, {
      ...json({ meaning: "so" }, { method: "PATCH" }),
      as: learner,
    });
    const body = await response.json();
    expect(CardOut.parse(body).meaning).toBe("so");
    expect(body).not.toHaveProperty("status");
  });

  it("archives many cards, reporting a missing one without failing the rest", async () => {
    const [first, second] = await ids(["pure", "anzi"]);

    const response = await app.fetch("/api/cards/archive", {
      ...json({ cardIds: [first, "no-such-card", second] }),
      as: learner,
    });

    expect(response.status).toBe(200);
    expect(ArchiveCardsOut.parse(await response.json()).results).toEqual([
      { id: first, status: "archived" },
      { id: "no-such-card", status: "error", code: "not_found", error: "Card not found" },
      { id: second, status: "archived" },
    ]);
    const card = await app.fetch(`/api/cards/${first}`, { as: learner });
    expect(CardOut.parse(await card.json()).archivedAt).not.toBeNull();

    const restored = await app.fetch("/api/cards/restore", {
      ...json({ cardIds: [first, second] }),
      as: learner,
    });
    expect(restored.status).toBe(200);
    expect(ArchiveCardsOut.parse(await restored.json()).results).toEqual([
      { id: first, status: "restored" },
      { id: second, status: "restored" },
    ]);
    const back = await app.fetch(`/api/cards/${first}`, { as: learner });
    const read = CardDetailOut.parse(await back.json());
    expect(read.archivedAt).toBeNull();
    expect(read.diagnosis).toBeNull();
  });

  it("refuses a bulk edit that lists a card twice", async () => {
    const [first] = await ids(["eppure"]);
    const response = await app.fetch("/api/cards/batch", {
      ...json({ cards: [{ cardId: first }, { cardId: first }] }, { method: "PATCH" }),
      as: learner,
    });
    expect(response.status).toBe(400);
  });
});

describe("publisher deck overlap", () => {
  it("lets a publisher repeat a term across its own decks, never within one", async () => {
    const app = await testApp({ publishers: ["publisher@lymi.local"] });
    const publisher = await app.signUp("publisher");
    const learner = await app.signUp("another-learner");
    const makeDeck = async (name: string, as: Session) =>
      DeckOut.parse(
        await (
          await app.fetch("/api/decks", { ...json({ name, defaultLanguage: "ja" }), as })
        ).json(),
      );
    const first = await makeDeck("First", publisher);
    const second = await makeDeck("Second", publisher);
    const third = await makeDeck("Third", publisher);
    const input = (deckId: string) => ({ cards: [{ deckId, term: "友達", meaning: "friend" }] });
    const send = (deckId: string, query: string, as = publisher) =>
      app.fetch(`/api/cards/batch${query}`, { ...json(input(deckId)), as });
    const status = async (deckId: string, query = "") =>
      AddCardsOut.parse(await (await send(deckId, query)).json()).results[0]?.status;

    expect(await status(first.id)).toBe("added");
    expect(await status(second.id)).toBe("added");
    expect(await status(second.id)).toBe("skipped");
    expect(await status(second.id, "?publisherOverlap=true")).toBe("skipped");

    const single = await app.fetch("/api/cards", {
      ...json({ deckId: third.id, term: "友達" }),
      as: publisher,
    });
    expect(single.status).toBe(201);

    const own = await makeDeck("Mine", learner);
    const theirs = await makeDeck("Also mine", learner);
    expect((await send(own.id, "", learner)).status).toBe(200);
    const repeated = AddCardsOut.parse(await (await send(theirs.id, "", learner)).json());
    expect(repeated.results[0]).toMatchObject({ status: "skipped", deckName: "Mine" });
    expect((await send(own.id, "?publisherOverlap=true", learner)).status).toBe(403);

    const madeKey = await app.fetch("/api/keys", {
      ...json({ name: "Deck publisher", scope: "write" }),
      as: publisher,
    });
    const key = ApiKeyCreatedOut.parse(await madeKey.json()).key;
    const fourth = await makeDeck("Fourth", publisher);
    const viaKey = await app.fetch("/api/cards/batch?publisherOverlap=true", {
      ...json(input(fourth.id), { headers: { "x-api-key": key } }),
    });
    expect(viaKey.status).toBe(200);
    expect(AddCardsOut.parse(await viaKey.json()).results[0]?.status).toBe("added");
  });
});

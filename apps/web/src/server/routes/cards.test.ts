import { AddCardsOut, CardOut, DeckOut, EditCardsOut, TerseCardsOut } from "@lymi/core";
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
    expect(results[0]).toMatchObject({ card: { id: first, source: "" } });
    expect(results[1]).toEqual({
      status: "error",
      cardId: "no-such-card",
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

    const one = await app.fetch(`/api/cards/${first}?response=terse`, {
      ...json({ meaning: "so" }, { method: "PATCH" }),
      as: learner,
    });
    expect(one.status).toBe(200);
    expect(await one.json()).toEqual({ id: first, status: "updated" });

    const added = TerseCardsOut.parse(await addTerms(["allora", "dunque"], "?response=terse"));
    expect(added.results[0]).toEqual({ id: first, status: "skipped" });
    expect(added.results[1]).toMatchObject({ status: "added" });
  });

  it("keeps the full card as the default answer to a single edit", async () => {
    const [first] = await ids(["quindi"]);
    const response = await app.fetch(`/api/cards/${first}`, {
      ...json({ meaning: "so" }, { method: "PATCH" }),
      as: learner,
    });
    expect(CardOut.parse(await response.json()).meaning).toBe("so");
  });

  it("archives many cards, reporting a missing one without failing the rest", async () => {
    const [first, second] = await ids(["pure", "anzi"]);

    const response = await app.fetch("/api/cards/archive", {
      ...json({ cardIds: [first, "no-such-card", second] }),
      as: learner,
    });

    expect(response.status).toBe(200);
    expect(TerseCardsOut.parse(await response.json()).results).toEqual([
      { id: first, status: "archived" },
      { id: "no-such-card", status: "error", error: "Card not found" },
      { id: second, status: "archived" },
    ]);
    const card = await app.fetch(`/api/cards/${first}`, { as: learner });
    expect(CardOut.parse(await card.json()).archivedAt).not.toBeNull();
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

import { AddCardOutcomeOut, CardHitOut, DeckOut, DeckSummaryOut } from "@lymi/core";
import { beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { json, type Session, type TestApp, testApp } from "../test-app";

/**
 * Archive is the only removal Lymi has, so what was archived must stay reachable and come back.
 * The Archived screen reads the two archived lists this file proves.
 */
let app: TestApp;
let learner: Session;
let other: Session;
let oldDeck: string;
let keptDeck: string;
let sunset: string;

const Decks = z.array(DeckSummaryOut);
const Cards = z.array(CardHitOut);

async function createDeck(name: string) {
  const response = await app.fetch("/api/decks", {
    ...json({ name, defaultLanguage: "it" }),
    as: learner,
  });
  expect(response.status).toBe(201);
  return DeckOut.parse(await response.json()).id;
}

async function addCard(deckId: string, term: string, meaning: string) {
  const response = await app.fetch("/api/cards", {
    ...json({ deckId, term, meaning }),
    as: learner,
  });
  expect(response.status).toBe(201);
  const outcome = AddCardOutcomeOut.parse(await response.json());
  if (outcome.status !== "added") throw new Error(`${term} was skipped`);
  return outcome.card.id;
}

async function names(path: string) {
  const response = await app.fetch(path, { as: learner });
  expect(response.status).toBe(200);
  return Decks.parse(await response.json()).map((deck) => deck.name);
}

async function archivedTerms() {
  const response = await app.fetch("/api/cards?archived=true", { as: learner });
  expect(response.status).toBe(200);
  return Cards.parse(await response.json()).map((card) => [card.term, card.deckName]);
}

beforeAll(async () => {
  app = await testApp();
  learner = await app.signUp("learner");
  other = await app.signUp("other");
  oldDeck = await createDeck("Lista vecchia");
  await addCard(oldDeck, "la nebbia", "the fog");
  keptDeck = await createDeck("Lezione");
  sunset = await addCard(keptDeck, "il tramonto", "the sunset");
}, 60_000);

describe("archiving and restoring", () => {
  it("moves a whole deck to the archived list and leaves its cards where they are", async () => {
    const archived = await app.fetch(`/api/decks/${oldDeck}/archive`, {
      method: "POST",
      as: learner,
    });
    expect(archived.status).toBe(200);

    expect(await names("/api/decks")).toEqual(["Lezione"]);
    expect(await names("/api/decks?archived=true")).toEqual(["Lista vecchia"]);
    // The deck's card was never archived on its own, so the card list does not carry it.
    expect(await archivedTerms()).toEqual([]);
  });

  it("lists one archived card with its deck, which stays active", async () => {
    const archived = await app.fetch(`/api/cards/${sunset}/archive`, {
      method: "POST",
      as: learner,
    });
    expect(archived.status).toBe(200);

    expect(await archivedTerms()).toEqual([["il tramonto", "Lezione"]]);
    expect(await names("/api/decks")).toEqual(["Lezione"]);
  });

  it("puts both back where they were", async () => {
    for (const path of [`/api/decks/${oldDeck}/restore`, `/api/cards/${sunset}/restore`]) {
      expect((await app.fetch(path, { method: "POST", as: learner })).status, path).toBe(200);
    }

    expect((await names("/api/decks")).sort()).toEqual(["Lezione", "Lista vecchia"]);
    expect(await names("/api/decks?archived=true")).toEqual([]);
    expect(await archivedTerms()).toEqual([]);
    const cards = await app.fetch(`/api/decks/${keptDeck}/cards`, { as: learner });
    expect(await cards.json()).toMatchObject([{ card: { term: "il tramonto" } }]);
  });

  it("is one learner's own", async () => {
    const response = await app.fetch(`/api/decks/${oldDeck}/archive`, {
      method: "POST",
      as: other,
    });
    expect(response.status).toBe(404);
    expect(await names("/api/decks?archived=true")).toEqual([]);
  });
});

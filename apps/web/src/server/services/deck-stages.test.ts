import { DeckOut, QueueOut } from "@lymi/core";
import { beforeAll, describe, expect, it } from "vitest";
import { json, type Session, type TestApp, testApp } from "../test-app";
import { deckStages } from "./stats";

let app: TestApp;
let learner: Session;
let lessonId: string;
let otherId: string;

async function newDeck(name: string, terms: string[]) {
  const deck = await app.fetch("/api/decks", {
    ...json({ name, defaultLanguage: "it" }),
    as: learner,
  });
  const id = DeckOut.parse(await deck.json()).id;
  const cards = await app.fetch("/api/cards/batch", {
    ...json({ cards: terms.map((term) => ({ deckId: id, term, meaning: term })) }),
    as: learner,
  });
  expect(cards.status).toBe(200);
  return id;
}

beforeAll(async () => {
  app = await testApp();
  learner = await app.signUp("deck-stages");
  lessonId = await newDeck("Lesson 14", ["il binario", "la fermata", "il treno"]);
  otherId = await newDeck("Verbi", ["sbrigarsi", "magari"]);

  const queue = QueueOut.parse(
    await (await app.fetch(`/api/review/queue?deck=${lessonId}`, { as: learner })).json(),
  );
  const item = queue.items.find((i) => i.card.deckId === lessonId);
  if (!item) throw new Error("The queue has no Lesson 14 card");
  const graded = await app.fetch("/api/review/grade", {
    ...json({ cardId: item.card.id, mode: item.mode, rating: 3 }),
    as: learner,
  });
  expect(graded.status).toBe(200);
});

describe("deckStages", () => {
  it("counts only the deck's own cards, by stage", async () => {
    const ctx = { db: app.db, userId: learner.userId, actor: "user" as const };

    const lesson = await deckStages(ctx, lessonId);
    expect(lesson.new + lesson.learning + lesson.known).toBe(3);
    expect(lesson.new).toBe(2);
    expect(await deckStages(ctx, otherId)).toEqual({ new: 2, learning: 0, known: 0 });
  });

  it("refuses a deck the learner cannot see", async () => {
    const stranger = await app.signUp("deck-stages-stranger");
    await expect(
      deckStages({ db: app.db, userId: stranger.userId, actor: "user" }, lessonId),
    ).rejects.toThrow();
  });
});

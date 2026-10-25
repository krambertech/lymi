// The HTTP contract of a card's hint and of a grade the hint helped; the rules are service tests.
import { AddCardOutcomeOut, CardHistoryOut, CardOut, DeckOut, GradeOut, UndoOut } from "@lymi/core";
import { beforeAll, describe, expect, it } from "vitest";
import { json, type Session, type TestApp, testApp } from "../test-app";

let app: TestApp;
let learner: Session;

beforeAll(async () => {
  app = await testApp();
  learner = await app.signUp("hint-route");
}, 60_000);

async function hintedCard(term: string) {
  const deck = await app.fetch("/api/decks", {
    ...json({ name: `Hints ${term}`, defaultLanguage: "et" }),
    as: learner,
  });
  const deckId = DeckOut.parse(await deck.json()).id;
  const added = await app.fetch("/api/cards", {
    ...json({ deckId, term, meaning: "snow", hint: " A luminous street ", enrich: false }),
    as: learner,
  });
  const outcome = AddCardOutcomeOut.parse(await added.json());
  if (outcome.status !== "added") throw new Error("not added");
  return outcome.card;
}

const grade = (cardId: string, rating: number, extra: Record<string, unknown> = {}) =>
  app.fetch("/api/review/grade", {
    ...json({
      cardId,
      mode: { cue: "term", target: "meaning" },
      rating,
      timezone: "UTC",
      ...extra,
    }),
    as: learner,
  });

const history = async (cardId: string) =>
  CardHistoryOut.parse(
    await (await app.fetch(`/api/cards/${cardId}/history`, { as: learner })).json(),
  );

describe("hints", () => {
  it("takes a hint on add and edit, the learner's unless the caller names the lesson", async () => {
    const card = await hintedCard("lumi");
    expect(card).toMatchObject({ hint: "A luminous street", hintSource: "manual" });

    const patched = await app.fetch(`/api/cards/${card.id}`, {
      ...json({ hint: "Lumi lights the street", hintSource: "lesson" }, { method: "PATCH" }),
      as: learner,
    });
    expect(CardOut.parse(await patched.json())).toMatchObject({
      hint: "Lumi lights the street",
      hintSource: "lesson",
    });

    const cleared = await app.fetch(`/api/cards/${card.id}`, {
      ...json({ hint: "" }, { method: "PATCH" }),
      as: learner,
    });
    expect(CardOut.parse(await cleared.json())).toMatchObject({ hint: null, hintSource: null });

    const ai = await app.fetch(`/api/cards/${card.id}`, {
      ...json({ hint: "Mine", hintSource: "ai" }, { method: "PATCH" }),
      as: learner,
    });
    expect(ai.status).toBe(400);

    // A source alone says nothing about a hint that is not there.
    const sourceOnly = await app.fetch(`/api/cards/${card.id}`, {
      ...json({ hintSource: "lesson" }, { method: "PATCH" }),
      as: learner,
    });
    expect(CardOut.parse(await sourceOnly.json())).toMatchObject({ hint: null, hintSource: null });
  });

  it("records a peek with the grade, refuses Easy after one, and Undo takes both back", async () => {
    const card = await hintedCard("lumi2");
    const easy = await grade(card.id, 4, { aid: "hint" });
    expect(easy.status).toBe(400);
    expect((await history(card.id)).reviews).toEqual([]);

    const good = GradeOut.parse(await (await grade(card.id, 3, { aid: "hint" })).json());
    expect((await history(card.id)).reviews).toMatchObject([{ rating: 3, aid: "hint" }]);

    const undone = await app.fetch("/api/review/undo", {
      ...json({ reviewId: good.reviewId }),
      as: learner,
    });
    expect(undone.status).toBe(200);
    expect(UndoOut.parse(await undone.json()).day.attempts).toBe(0);

    // An unaided recall is unchanged: no aid, and Easy is allowed.
    await grade(card.id, 4, { reviewedAt: new Date(Date.now() + 60_000).toISOString() });
    expect((await history(card.id)).reviews[0]).toMatchObject({ rating: 4, aid: null });
  });
});

describe("the hint's old name", () => {
  it("takes a hook as the hint and returns it under both names", async () => {
    const card = await hintedCard("lumi3");
    const patched = await app.fetch(`/api/cards/${card.id}`, {
      ...json({ hook: "Lumi lights the street", hookSource: "lesson" }, { method: "PATCH" }),
      as: learner,
    });
    expect(await patched.json()).toMatchObject({
      hint: "Lumi lights the street",
      hintSource: "lesson",
      hook: "Lumi lights the street",
      hookSource: "lesson",
    });
  });

  it("keeps a queued grade that names its aid hook, stored as hint", async () => {
    const card = await hintedCard("lumi4");
    expect((await grade(card.id, 4, { aid: "hook" })).status).toBe(400);
    expect((await grade(card.id, 3, { aid: "hook" })).status).toBe(200);
    expect((await history(card.id)).reviews).toMatchObject([{ rating: 3, aid: "hint" }]);
  });

  it("answers the old draft path under the old name", async () => {
    const card = await hintedCard("lumi5");
    const drafted = await app.fetch(`/api/cards/${card.id}/hook-draft`, {
      method: "POST",
      as: learner,
    });
    expect(drafted.status).not.toBe(404);
    if (drafted.ok) expect(await drafted.json()).toHaveProperty("hook");
  });
});

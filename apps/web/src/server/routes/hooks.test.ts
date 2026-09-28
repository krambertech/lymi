import { AddCardOutcomeOut, CardHistoryOut, CardOut, DeckOut, GradeOut } from "@lymi/core";
import { beforeAll, describe, expect, it } from "vitest";
import { json, type Session, type TestApp, testApp } from "../test-app";

/** The HTTP contract of a card's hook and of a grade the hook helped. */
let app: TestApp;
let learner: Session;

beforeAll(async () => {
  app = await testApp();
  learner = await app.signUp("hook-route");
}, 60_000);

async function hookedCard(term: string) {
  const deck = await app.fetch("/api/decks", {
    ...json({ name: `Hooks ${term}`, defaultLanguage: "et" }),
    as: learner,
  });
  const deckId = DeckOut.parse(await deck.json()).id;
  const added = await app.fetch("/api/cards", {
    ...json({ deckId, term, meaning: "snow", hook: " A luminous street ", enrich: false }),
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

describe("hooks", () => {
  it("takes a hook on add and edit, the learner's unless the caller names the lesson", async () => {
    const card = await hookedCard("lumi");
    expect(card).toMatchObject({ hook: "A luminous street", hookSource: "manual" });

    const patched = await app.fetch(`/api/cards/${card.id}`, {
      ...json({ hook: "Lumi lights the street", hookSource: "lesson" }, { method: "PATCH" }),
      as: learner,
    });
    expect(CardOut.parse(await patched.json())).toMatchObject({
      hook: "Lumi lights the street",
      hookSource: "lesson",
    });

    const cleared = await app.fetch(`/api/cards/${card.id}`, {
      ...json({ hook: "" }, { method: "PATCH" }),
      as: learner,
    });
    expect(CardOut.parse(await cleared.json())).toMatchObject({ hook: null, hookSource: null });

    const ai = await app.fetch(`/api/cards/${card.id}`, {
      ...json({ hook: "Mine", hookSource: "ai" }, { method: "PATCH" }),
      as: learner,
    });
    expect(ai.status).toBe(400);
  });

  it("records a peek with the grade, refuses Easy after one, and Undo takes both back", async () => {
    const card = await hookedCard("lumi2");
    const easy = await grade(card.id, 4, { aid: "hook" });
    expect(easy.status).toBe(400);
    expect((await history(card.id)).reviews).toEqual([]);

    const good = GradeOut.parse(await (await grade(card.id, 3, { aid: "hook" })).json());
    expect((await history(card.id)).reviews).toMatchObject([{ rating: 3, aid: "hook" }]);

    const undone = await app.fetch("/api/review/undo", {
      ...json({ reviewId: good.reviewId }),
      as: learner,
    });
    expect(undone.status).toBe(200);
    expect((await undone.json()) as { day: { attempts: number } }).toMatchObject({
      day: { attempts: 0 },
    });

    // An unaided recall is unchanged: no aid, and Easy is allowed.
    await grade(card.id, 4, { reviewedAt: new Date(Date.now() + 60_000).toISOString() });
    expect((await history(card.id)).reviews[0]).toMatchObject({ rating: 4, aid: null });
  });
});

import { AddCardOutcomeOut, DeckOut, DrawOut, FixOut } from "@lymi/core";
import { beforeAll, describe, expect, it } from "vitest";
import { schema } from "../db";
import { json, type Session, type TestApp, testApp } from "../test-app";

/** The HTTP contract of offering, accepting and undoing a fix; the rules are `services/fixes.test.ts`. */
let app: TestApp;
let learner: Session;
let stranger: Session;

const DAY = 86_400_000;

beforeAll(async () => {
  app = await testApp();
  learner = await app.signUp("fix-route");
  stranger = await app.signUp("fix-route-stranger");
}, 60_000);

/** An often-forgotten card with a finished diagnosis of more than one right answer. */
async function diagnosedCard(term: string) {
  const deck = await app.fetch("/api/decks", {
    ...json({ name: "Eesti", defaultLanguage: "et" }),
    as: learner,
  });
  const deckId = DeckOut.parse(await deck.json()).id;
  const added = await app.fetch("/api/cards", {
    ...json({ deckId, term, meaning: "tall", enrich: false }),
    as: learner,
  });
  const outcome = AddCardOutcomeOut.parse(await added.json());
  if (outcome.status !== "added") throw new Error("not added");
  const cardId = outcome.card.id;
  for (const daysAgo of [4, 3, 2]) {
    await app.fetch("/api/review/grade", {
      ...json({
        cardId,
        direction: "recognition",
        rating: 1,
        reviewedAt: new Date(Date.now() - daysAgo * DAY).toISOString(),
        timezone: "UTC",
      }),
      as: learner,
    });
  }
  const id = `diagnosis-${cardId}`;
  await app.db.insert(schema.cardDiagnoses).values({
    id,
    userId: learner.userId,
    cardId,
    revision: 1,
    status: "done",
    cause: "several_answers",
    confidence: 0.9,
    draft: { field: "meaning", text: "tall (of a person)", otherAnswer: "kõrge" },
    model: "test",
  });
  return { id, cardId };
}

describe("fixes", () => {
  it("offers the fix with the draw until it is marked offered", async () => {
    const { id, cardId } = await diagnosedCard("pikk");
    const draw = async () =>
      DrawOut.parse(await (await app.fetch("/api/review/draw?tz=UTC", { as: learner })).json());
    const offer = (await draw()).cards.find((c) => c.card.id === cardId)?.offer;
    expect(offer).toMatchObject({ diagnosisId: id, cause: "several_answers", other: null });

    const marked = await app.fetch(`/api/diagnoses/${id}/offered`, { method: "POST", as: learner });
    expect(marked.status).toBe(200);
    expect((await draw()).cards.find((c) => c.card.id === cardId)?.offer).toBeUndefined();
  });

  it("accepts a fix, refuses a malformed or someone else's, and undoes it", async () => {
    const { id } = await diagnosedCard("kõrge");
    const malformed = await app.fetch(`/api/diagnoses/${id}/accept`, {
      ...json({ cause: "several_answers" }),
      as: learner,
    });
    expect(malformed.status).toBe(400);
    const theirs = await app.fetch(`/api/diagnoses/${id}/accept`, {
      ...json({ cause: "several_answers", text: "tall (of a person)" }),
      as: stranger,
    });
    expect(theirs.status).toBe(404);

    const accepted = await app.fetch(`/api/diagnoses/${id}/accept`, {
      ...json({ cause: "several_answers", text: "tall (of a person)" }),
      as: learner,
    });
    expect(accepted.status).toBe(200);
    expect(FixOut.parse(await accepted.json()).edited).toMatchObject({
      meaning: "tall (of a person)",
      meaningSource: "ai",
    });
    const again = await app.fetch(`/api/diagnoses/${id}/accept`, {
      ...json({ cause: "several_answers", text: "tall (of a person)" }),
      as: learner,
    });
    expect(again.status).toBe(409);

    const undone = await app.fetch(`/api/diagnoses/${id}/undo`, { method: "POST", as: learner });
    expect(undone.status).toBe(200);
  });
});

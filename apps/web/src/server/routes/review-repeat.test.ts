// A second grade of a mode on one learner-local day cannot be Easy, ADR 0031.
import { AddCardOutcomeOut, CardHistoryOut, DeckOut } from "@lymi/core";
import { beforeAll, describe, expect, it } from "vitest";
import { json, type Session, type TestApp, testApp } from "../test-app";

let app: TestApp;
let learner: Session;

beforeAll(async () => {
  app = await testApp();
  learner = await app.signUp("review-repeat");
}, 60_000);

async function card(term: string) {
  const deck = await app.fetch("/api/decks", {
    ...json({ name: `Repeat ${term}`, defaultLanguage: "et" }),
    as: learner,
  });
  const deckId = DeckOut.parse(await deck.json()).id;
  const added = await app.fetch("/api/cards", {
    ...json({ deckId, term, meaning: "snow", enrich: false }),
    as: learner,
  });
  const outcome = AddCardOutcomeOut.parse(await added.json());
  if (outcome.status !== "added") throw new Error("not added");
  return outcome.card;
}

const grade = (cardId: string, rating: number, reviewedAt: string) =>
  app.fetch("/api/review/grade", {
    ...json({
      cardId,
      mode: { cue: "term", target: "meaning" },
      rating,
      reviewedAt,
      timezone: "UTC",
    }),
    as: learner,
  });

const ratings = async (cardId: string) =>
  CardHistoryOut.parse(
    await (await app.fetch(`/api/cards/${cardId}/history`, { as: learner })).json(),
  )
    .reviews.map((r) => r.rating)
    .sort();

describe("a same-day repeat", () => {
  it("records Easy as Good on the mode's second grade today, and allows it tomorrow", async () => {
    const { id } = await card("lumi");
    expect((await grade(id, 1, "2026-09-13T09:00:00Z")).status).toBe(200);
    expect((await grade(id, 4, "2026-09-13T09:10:00Z")).status).toBe(200);
    expect(await ratings(id)).toEqual([1, 3]);

    expect((await grade(id, 4, "2026-09-14T09:00:00Z")).status).toBe(200);
    expect(await ratings(id)).toEqual([1, 3, 4]);
  });
});

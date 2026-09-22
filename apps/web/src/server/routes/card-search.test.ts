import { AddCardOutcomeOut, CardSearchOut, DeckOut } from "@lymi/core";
import { beforeAll, describe, expect, it } from "vitest";
import { json, type Session, type TestApp, testApp } from "../test-app";

let app: TestApp;
let learner: Session;
let deckId: string;

beforeAll(async () => {
  app = await testApp();
  learner = await app.signUp("searcher");
  const deck = await app.fetch("/api/decks", {
    ...json({ name: "Pere", defaultLanguage: "et" }),
    as: learner,
  });
  deckId = DeckOut.parse(await deck.json()).id;
  for (const term of ["ema", "tema", "emakeel", "isa"]) {
    const added = await app.fetch("/api/cards", { ...json({ deckId, term }), as: learner });
    expect(AddCardOutcomeOut.parse(await added.json()).status).toBe("added");
  }
}, 60_000);

async function page(path: string) {
  const response = await app.fetch(path, { as: learner });
  expect(response.status).toBe(200);
  return CardSearchOut.parse(await response.json());
}

describe("card search over the query string", () => {
  it("filters and pages with query parameters", async () => {
    expect((await page(`/api/cards?deckId=${deckId}&term=EMA`)).cards.map((c) => c.term)).toEqual([
      "ema",
    ]);

    const terms: string[] = [];
    let cursor: string | null = null;
    do {
      const next: Awaited<ReturnType<typeof page>> = await page(
        `/api/cards?deckId=${deckId}&limit=3${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
      );
      terms.push(...next.cards.map((card) => card.term));
      expect(next.total).toBe(4);
      cursor = next.nextCursor;
    } while (cursor);
    expect(terms.sort()).toEqual(["ema", "emakeel", "isa", "tema"]);
  });

  it("answers 400 for a cursor it did not hand out", async () => {
    for (const cursor of ["page-2", "9999999999999999.abc"]) {
      const response = await app.fetch(`/api/cards?cursor=${cursor}`, { as: learner });
      expect(response.status).toBe(400);
    }
  });
});

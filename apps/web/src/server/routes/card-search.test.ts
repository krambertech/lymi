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

async function page(response: Response) {
  expect(response.status).toBe(200);
  return CardSearchOut.parse(await response.json());
}

describe("card search over REST", () => {
  it("answers the query string and the POST filter with the same page", async () => {
    const byQuery = await page(
      await app.fetch(`/api/cards?deckId=${deckId}&term=EMA&limit=5`, { as: learner }),
    );
    const byFilter = await page(
      await app.fetch("/api/cards/search", {
        ...json({ filter: { deckId: { eq: deckId }, term: { eq: "EMA" } }, limit: 5 }),
        as: learner,
      }),
    );

    expect(byQuery.cards.map((card) => card.term)).toEqual(["ema"]);
    expect(byFilter).toEqual(byQuery);
  });

  it("sorts, pages and adds review stats from the POST body", async () => {
    const first = await page(
      await app.fetch("/api/cards/search", {
        ...json({
          filter: { term: { contains: "ema" } },
          sort: [{ field: "term", direction: "asc" }],
          stats: true,
          limit: 2,
        }),
        as: learner,
      }),
    );
    expect(first.cards.map((card) => card.term)).toEqual(["ema", "emakeel"]);
    // The term compares in SQL, so the count is exact.
    expect(first.total).toBe(3);
    // A new card has no grades yet, and its asked mode is due.
    expect(first.cards[0]?.stats).toMatchObject({
      reviewCount: 0,
      lapses: 0,
      lastRating: null,
      modes: [
        { mode: { cue: "term", target: "meaning" }, reviewCount: 0, dueAt: expect.any(String) },
      ],
    });

    const second = await page(
      await app.fetch("/api/cards/search", {
        ...json({
          filter: { term: { contains: "ema" } },
          sort: [{ field: "term", direction: "asc" }],
          limit: 2,
          cursor: first.nextCursor,
        }),
        as: learner,
      }),
    );
    expect(second.cards.map((card) => card.term)).toEqual(["tema"]);
    expect(second.nextCursor).toBeNull();
    expect(second.total).toBe(3);
  });

  it("filters and pages with query parameters", async () => {
    const terms: string[] = [];
    let cursor: string | null = null;
    do {
      const response = await app.fetch(
        `/api/cards?deckId=${deckId}&limit=3${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
        { as: learner },
      );
      const next = await page(response);
      terms.push(...next.cards.map((card) => card.term));
      expect(next.total).toBe(4);
      cursor = next.nextCursor;
    } while (cursor);
    expect(terms.sort()).toEqual(["ema", "emakeel", "isa", "tema"]);
  });

  it("answers 400 for a cursor it did not hand out", async () => {
    for (const cursor of ["page 2", "bm9wZQ"]) {
      const response = await app.fetch(`/api/cards?cursor=${encodeURIComponent(cursor)}`, {
        as: learner,
      });
      expect(response.status).toBe(400);
    }
  });

  it("refuses an unknown filter field instead of ignoring it", async () => {
    const response = await app.fetch("/api/cards/search", {
      ...json({ filter: { deck: { eq: deckId } } }),
      as: learner,
    });
    expect(response.status).toBe(400);
  });

  it("documents both routes in the OpenAPI document", async () => {
    const response = await app.fetch("/api/openapi.json", {});
    expect(response.status).toBe(200);
    const document = (await response.json()) as {
      paths: Record<string, Record<string, { parameters?: { name: string }[] }>>;
    };
    const names = document.paths["/api/cards"]?.get?.parameters?.map((p) => p.name) ?? [];
    expect(names).toEqual(expect.arrayContaining(["query", "term", "deckId", "cursor", "stats"]));
    expect(document.paths["/api/cards/search"]?.post).toBeDefined();
  });
});

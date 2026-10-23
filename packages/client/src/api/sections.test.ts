import { CARD_BATCH_LIMIT } from "@lymi/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { configureForTest } from "../test/configure";
import { sectionsApi } from "./sections";

const fetch = vi.fn(
  async (_url: string, _init: RequestInit) =>
    new Response(JSON.stringify({ id: "s1", name: "Lesson 1", sections: [] })),
);
vi.stubGlobal("fetch", fetch);

afterEach(() => fetch.mockClear());

const bodies = () =>
  fetch.mock.calls.map(([url, init]) => [url, JSON.parse(String(init.body))] as const);

describe("making a section with cards in it", () => {
  it("sends a selection within the bulk limit with the section", async () => {
    configureForTest(new Map());
    await sectionsApi.createSection("d1", { name: "Lesson 1", cardIds: ["c1", "c2"] });
    expect(bodies()).toEqual([
      ["/api/decks/d1/sections", { name: "Lesson 1", cardIds: ["c1", "c2"] }],
    ]);
  });

  it("moves the cards past the bulk limit into it a call at a time", async () => {
    configureForTest(new Map());
    const ids = Array.from({ length: CARD_BATCH_LIMIT * 2 + 1 }, (_, i) => `c${i}`);
    await sectionsApi.createSection("d1", { name: "Lesson 1", cardIds: ids });
    const sent = bodies();
    expect(sent.map(([url]) => url)).toEqual([
      "/api/decks/d1/sections",
      "/api/decks/d1/cards/section",
      "/api/decks/d1/cards/section",
    ]);
    expect(sent[0]?.[1].cardIds).toEqual(ids.slice(0, CARD_BATCH_LIMIT));
    expect(sent[1]?.[1]).toEqual({
      cardIds: ids.slice(CARD_BATCH_LIMIT, CARD_BATCH_LIMIT * 2),
      sectionId: "s1",
    });
    expect(sent[2]?.[1].cardIds).toEqual(ids.slice(CARD_BATCH_LIMIT * 2));
  });
});

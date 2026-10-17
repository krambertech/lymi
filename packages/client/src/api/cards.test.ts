import { afterEach, describe, expect, it, vi } from "vitest";
import { configureForTest } from "../test/configure";
import { cardsApi, KEEPALIVE_MAX_BYTES } from "./cards";

const fetch = vi.fn(
  async (_url: string, _init: RequestInit) =>
    new Response(JSON.stringify({ status: "added", id: "c1" })),
);
vi.stubGlobal("fetch", fetch);

afterEach(() => fetch.mockClear());

const sent = () => fetch.mock.calls[0]?.[1] ?? {};

describe("adding a card", () => {
  it("keeps the request alive, so a reload mid-send does not cut it off", async () => {
    configureForTest(new Map());
    await cardsApi.addCard({ deckId: "d1", term: "煎餅" });
    expect(sent().keepalive).toBe(true);
  });

  it("sends a body of 64 KB or more without keepalive, which browsers would refuse", async () => {
    configureForTest(new Map());
    // Multi-byte text, so the limit is counted in bytes rather than characters.
    const notes = "煎".repeat(Math.ceil(KEEPALIVE_MAX_BYTES / 3));
    await cardsApi.addCard({ deckId: "d1", term: "煎餅", notes });
    expect(notes.length).toBeLessThan(KEEPALIVE_MAX_BYTES);
    expect(sent().keepalive).toBe(false);
  });
});

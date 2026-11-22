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
    const notes = "煎".repeat(Math.ceil(KEEPALIVE_MAX_BYTES / 3));
    await cardsApi.addCard({ deckId: "d1", term: "煎餅", notes });
    expect(notes.length).toBeLessThan(KEEPALIVE_MAX_BYTES);
    expect(sent().keepalive).toBe(false);
  });
});

describe("uploading a picture", () => {
  const upload = async (version: string | null) => {
    configureForTest(new Map());
    await cardsApi.uploadCardImage("c1", new Blob(["x"], { type: "image/png" }), version);
    return sent().body as FormData;
  };

  it("sends the form on the phone, whose FormData has no set", async () => {
    const set = vi.spyOn(FormData.prototype, "set").mockImplementation(() => {
      throw new TypeError("undefined is not a function");
    });
    expect((await upload("v1")).get("version")).toBe("v1");
    set.mockRestore();
  });

  it("names an empty version for a card with no picture yet", async () => {
    expect((await upload(null)).get("version")).toBe("");
  });

  it("leaves the content type to the form, whose boundary the server needs", async () => {
    await upload(null);
    expect(sent().headers).toEqual({});
  });
});

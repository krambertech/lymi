import type { Card } from "@lymi/core/schema";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SpeechProvider } from "../ai";
import type { Db } from "../db";
import { pronunciationAudio } from "./audio";
import type { ServiceContext } from "./context";

afterEach(() => vi.restoreAllMocks());

function card(patch: Partial<Card> = {}): Card {
  const now = new Date();
  return {
    id: "card-1",
    userId: "user-1",
    deckId: "deck-1",
    term: "jäääär",
    normalizedTerm: "jäääär",
    meaning: "edge of the ice",
    pronunciation: null,
    example: null,
    notes: null,
    language: "et",
    tags: [],
    source: null,
    directions: null,
    meaningSource: "manual",
    exampleSource: null,
    audioKey: null,
    createdBy: "user",
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    ...patch,
  };
}

function context(row: Card): ServiceContext {
  const returning = vi.fn(async () => [{ id: row.id }]);
  const whereUpdate = vi.fn(() => ({ returning }));
  const set = vi.fn(() => ({ where: whereUpdate }));
  const update = vi.fn(() => ({ set }));
  const values = vi.fn(async () => undefined);
  const insert = vi.fn(() => ({ values }));
  // `getCard` joins decks for membership and selects `{ card }`. See ADR 0011.
  const whereSelect = vi.fn(async () => [{ card: row }]);
  const innerJoin = vi.fn(() => ({ where: whereSelect }));
  const from = vi.fn(() => ({ innerJoin }));
  const select = vi.fn(() => ({ from }));
  const db = new Proxy(Object.create(null) as Db, {
    get: (_target, property) => ({ select, update, insert })[property as "select"],
  });
  return { db, userId: row.userId, actor: "user" };
}

function storedAudio(key = "audio.mp3"): R2ObjectBody {
  const bytes = new Uint8Array([1, 2, 3]);
  return {
    key,
    version: "1",
    size: bytes.byteLength,
    etag: "etag",
    httpEtag: '"etag"',
    checksums: Object.create(null) as R2Checksums,
    uploaded: new Date(),
    storageClass: "Standard",
    body: new Blob([bytes]).stream(),
    bodyUsed: false,
    writeHttpMetadata: () => undefined,
    arrayBuffer: async () => bytes.buffer,
    bytes: async () => bytes,
    text: async () => "",
    json: async <T>() => ({}) as T,
    blob: async () => new Blob([bytes]),
  };
}

function provider(
  name: SpeechProvider["provider"],
  speech: SpeechProvider["speech"],
): SpeechProvider {
  return {
    provider: name,
    model: name === "google-chirp" ? "chirp-3-hd" : "gpt-4o-mini-tts",
    voice: "Kore",
    locale: "et-EE",
    contentType: "audio/mpeg",
    extension: "mp3",
    speech,
  };
}

describe("pronunciation audio", () => {
  it("generates only on first play and reuses R2 afterward", async () => {
    let stored: R2ObjectBody | null = null;
    const get = vi.fn(async () => stored);
    const put = vi.fn(async (key: string) => {
      stored = storedAudio(key);
    });
    const bucket = new Proxy(Object.create(null) as R2Bucket, {
      get: (_target, property) => ({ get, put })[property as "get"],
    });
    const speech = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
    const providers = vi.fn(() => [provider("google-chirp", speech)]);
    const deps = { bucket, providers };

    await pronunciationAudio(context(card()), "card-1", deps);
    await pronunciationAudio(context(card()), "card-1", deps);

    expect(speech).toHaveBeenCalledTimes(1);
    expect(put).toHaveBeenCalledTimes(1);
    expect(providers).toHaveBeenCalledWith("et");
  });

  it("tries a later provider when an earlier provider fails", async () => {
    let stored: R2ObjectBody | null = null;
    const bucket = new Proxy(Object.create(null) as R2Bucket, {
      get: (_target, property) =>
        ({
          get: vi.fn(async () => stored),
          put: vi.fn(async (key: string) => {
            stored = storedAudio(key);
          }),
        })[property as "get"],
    });
    const openai = vi.fn(async () => {
      throw Object.assign(new Error("private upstream details"), {
        name: "OpenAiSpeechError",
        status: 401,
      });
    });
    const chirp = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await pronunciationAudio(context(card()), "card-1", {
      bucket,
      providers: () => [provider("openai", openai), provider("google-chirp", chirp)],
    });

    expect(openai).toHaveBeenCalledOnce();
    expect(chirp).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(
      JSON.stringify({
        event: "pronunciation_provider_failed",
        provider: "openai",
        language: "et",
        error: "OpenAiSpeechError",
        status: 401,
      }),
    );
    expect(warn.mock.calls.flat().join(" ")).not.toContain("private upstream details");
    expect(warn.mock.calls.flat().join(" ")).not.toContain("card-1");
  });

  it("does not try another provider when audio storage fails", async () => {
    const bucket = new Proxy(Object.create(null) as R2Bucket, {
      get: (_target, property) =>
        ({
          get: vi.fn(async () => null),
          put: vi.fn(async () => {
            throw new Error("R2 unavailable");
          }),
        })[property as "get"],
    });
    const openai = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
    const chirp = vi.fn(async () => new Response(new Uint8Array([4, 5, 6])));

    await expect(
      pronunciationAudio(context(card()), "card-1", {
        bucket,
        providers: () => [provider("openai", openai), provider("google-chirp", chirp)],
      }),
    ).rejects.toThrow("R2 unavailable");

    expect(openai).toHaveBeenCalledOnce();
    expect(chirp).not.toHaveBeenCalled();
  });

  it("never reaches R2 or a provider for a card without a language", async () => {
    const get = vi.fn();
    const providers = vi.fn();
    const bucket = new Proxy(Object.create(null) as R2Bucket, {
      get: (_target, property) => ({ get })[property as "get"],
    });

    await expect(
      pronunciationAudio(context(card({ language: null })), "card-1", { bucket, providers }),
    ).rejects.toThrow("only available for language cards");
    expect(get).not.toHaveBeenCalled();
    expect(providers).not.toHaveBeenCalled();
  });

  it("reuses the card's remembered object before selecting a provider", async () => {
    const stored = storedAudio("cards/card-1/existing.mp3");
    const get = vi.fn(async () => stored);
    const providers = vi.fn();
    const bucket = new Proxy(Object.create(null) as R2Bucket, {
      get: (_target, property) => ({ get })[property as "get"],
    });

    await pronunciationAudio(context(card({ audioKey: stored.key })), "card-1", {
      bucket,
      providers,
    });

    expect(get).toHaveBeenCalledWith(stored.key);
    expect(providers).not.toHaveBeenCalled();
  });
});

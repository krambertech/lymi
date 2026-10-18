import type { Card } from "@lymi/core/schema";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SpeechProvider, SpeechRequest } from "../ai";
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
    revision: 1,
    term: "jäääär",
    normalizedTerm: "jäääär",
    meaning: "edge of the ice",
    pronunciation: null,
    example: null,
    notes: null,
    hook: null,
    hookSource: null,
    hookDraft: null,
    language: "et",
    tags: [],
    source: null,
    sectionId: null,
    directions: null,
    reviewModeKeys: null,
    imageVersion: null,
    importId: null,
    externalId: null,
    meaningSource: "manual",
    exampleSource: null,
    pronunciationSource: null,
    notesSource: null,
    enrichmentStatus: null,
    enrichmentFields: null,
    audioKey: null,
    audioSource: null,
    audioApprovedKey: null,
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
    model: {
      "google-gemini": "gemini-3.1-flash-tts-preview",
      "google-chirp": "chirp-3-hd",
      "gemini-api": "gemini-3.1-flash-tts-preview",
      elevenlabs: "eleven_v4",
      openai: "gpt-4o-mini-tts",
    }[name],
    voice: "Kore",
    locale: "et-EE",
    contentType: "audio/mpeg",
    extension: "mp3",
    speech,
  };
}

describe("pronunciation audio", () => {
  it("serves a recording an import brought and never asks a provider for speech", async () => {
    const key = "cards/card-1/recorded/0123.mp3";
    const get = vi.fn(async (asked: string) => (asked === key ? storedAudio(key) : null));
    const put = vi.fn();
    const bucket = new Proxy(Object.create(null) as R2Bucket, {
      get: (_target, property) => ({ get, put })[property as "get"],
    });
    const speech = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));

    const audio = await pronunciationAudio(
      context(card({ audioKey: key, audioSource: "recorded" })),
      "card-1",
      { bucket, providers: () => [provider("google-gemini", speech)] },
    );

    expect(audio.key).toBe(key);
    expect(speech).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });

  it.each([
    {
      term: "õppima · õppida · õpin",
      spoken: "õppima, õppida, õpin",
      oldKey: "cards/card-1/979eebc4fedb64b1c6216e095b355f53.mp3",
    },
    {
      term: "jäääär",
      spoken: "jäääär",
      oldKey: "cards/card-1/d5ec3ef391f178010649f5e94ce6b6f5.mp3",
    },
  ])(
    "refreshes pre-versioned recordings once on the next play: $term",
    async ({ term, spoken, oldKey }) => {
      const objects = new Map([[oldKey, storedAudio(oldKey)]]);
      const get = vi.fn(async (key: string) => objects.get(key) ?? null);
      const put = vi.fn(async (key: string) => {
        objects.set(key, storedAudio(key));
      });
      const bucket = new Proxy(Object.create(null) as R2Bucket, {
        get: (_target, property) => ({ get, put })[property as "get"],
      });
      const speech = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
      const providers = () => [provider("google-chirp", speech)];
      const first = await pronunciationAudio(context(card({ term, audioKey: oldKey })), "card-1", {
        bucket,
        providers,
      });
      expect(speech).toHaveBeenCalledOnce();
      expect(speech).toHaveBeenCalledWith({
        text: spoken,
        language: "et",
        usage: expect.any(Function),
      });
      expect(first.key).toMatch(/^cards\/card-1\/v2\//);
      expect(first.key).not.toBe(oldKey);
      expect(objects.has(oldKey)).toBe(true);
      await pronunciationAudio(context(card({ term, audioKey: first.key })), "card-1", {
        bucket,
        providers,
      });
      expect(speech).toHaveBeenCalledOnce();
    },
  );

  it("says a Japanese card's kana reading and regenerates when the reading changes", async () => {
    const objects = new Map<string, R2ObjectBody>();
    const get = vi.fn(async (key: string) => objects.get(key) ?? null);
    const put = vi.fn(async (key: string) => {
      objects.set(key, storedAudio(key));
    });
    const bucket = new Proxy(Object.create(null) as R2Bucket, {
      get: (_target, property) => ({ get, put })[property as "get"],
    });
    const speech = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
    const deps = { bucket, providers: () => [provider("elevenlabs", speech)] };
    const japanese = { term: "上手", normalizedTerm: "上手", language: "ja" };

    const skilled = await pronunciationAudio(
      context(card({ ...japanese, pronunciation: "じょうず" })),
      "card-1",
      deps,
    );
    expect(speech).toHaveBeenLastCalledWith({
      text: "じょうず",
      language: "ja",
      usage: expect.any(Function),
    });
    const expert = await pronunciationAudio(
      context(card({ ...japanese, pronunciation: "うわて", audioKey: skilled.key })),
      "card-1",
      deps,
    );
    expect(speech).toHaveBeenLastCalledWith({
      text: "うわて",
      language: "ja",
      usage: expect.any(Function),
    });
    expect(expert.key).not.toBe(skilled.key);

    await pronunciationAudio(context(card({ ...japanese, pronunciation: "jōzu" })), "card-1", deps);
    expect(speech).toHaveBeenLastCalledWith({
      text: "上手",
      language: "ja",
      usage: expect.any(Function),
    });
  });

  it("keeps saying the term for a language without readings, whatever the pronunciation", async () => {
    const get = vi.fn(async () => null);
    const put = vi.fn(async () => undefined);
    const bucket = new Proxy(Object.create(null) as R2Bucket, {
      get: (_target, property) => ({ get, put })[property as "get"],
    });
    const speech = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
    await pronunciationAudio(context(card({ pronunciation: "ˈjæːæːr" })), "card-1", {
      bucket,
      providers: () => [provider("google-chirp", speech)],
    }).catch(() => undefined);
    expect(speech).toHaveBeenCalledWith({
      text: "jäääär",
      language: "et",
      usage: expect.any(Function),
    });
  });

  it("generates only on first play and reuses R2 afterward", async () => {
    let stored: R2ObjectBody | null = null;
    const get = vi.fn(async () => stored);
    const put = vi.fn(async (key: string, _value: unknown) => {
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
    const storedValue = put.mock.calls[0]?.[1];
    expect(storedValue).toBeInstanceOf(Uint8Array);
    expect([...((storedValue as Uint8Array | undefined) ?? [])]).toEqual([1, 2, 3]);
    expect(providers).toHaveBeenCalledWith("et");
  });

  it("stores Gemini WAV with its format and replaces a remembered Chirp clip", async () => {
    let stored: R2ObjectBody | null = null;
    const old = storedAudio("old-chirp.mp3");
    const get = vi.fn(async (key: string) => (key === old.key ? old : stored));
    const put = vi.fn(async (key: string, _bytes: unknown, _options: R2PutOptions) => {
      stored = storedAudio(key);
    });
    const bucket = new Proxy(Object.create(null) as R2Bucket, {
      get: (_target, property) => ({ get, put })[property as "get"],
    });
    const speech = vi.fn(
      async () =>
        new Response(new Uint8Array([1, 2, 3, 4]), { headers: { "Content-Type": "audio/wav" } }),
    );
    const preferred: SpeechProvider = {
      ...provider("gemini-api", speech),
      extension: "wav",
      contentType: "audio/wav",
    };
    const result = await pronunciationAudio(context(card({ audioKey: old.key })), "card-1", {
      bucket,
      providers: () => [preferred],
    });
    expect(result.key).toMatch(/\.wav$/);
    expect(put.mock.calls[0]?.[2]).toMatchObject({
      httpMetadata: { contentType: "audio/wav" },
      customMetadata: { provider: "gemini-api", voice: "Kore" },
    });
    await pronunciationAudio(context(card({ audioKey: result.key })), "card-1", {
      bucket,
      providers: () => [preferred],
    });
    expect(speech).toHaveBeenCalledTimes(1);
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

  it("tries a later provider when an earlier provider returns oversized audio", async () => {
    let stored: R2ObjectBody | null = null;
    const put = vi.fn(async (key: string) => {
      stored = storedAudio(key);
    });
    const bucket = new Proxy(Object.create(null) as R2Bucket, {
      get: (_target, property) =>
        ({
          get: vi.fn(async () => stored),
          put,
        })[property as "get"],
    });
    const openai = vi.fn(
      async () =>
        new Response(new Uint8Array([1]), {
          headers: { "content-length": "8000001" },
        }),
    );
    const chirp = vi.fn(async () => new Response(new Uint8Array([4, 5, 6])));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await pronunciationAudio(context(card()), "card-1", {
      bucket,
      providers: () => [provider("openai", openai), provider("google-chirp", chirp)],
    });

    expect(openai).toHaveBeenCalledOnce();
    expect(chirp).toHaveBeenCalledOnce();
    expect(put).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(
      JSON.stringify({
        event: "pronunciation_provider_failed",
        provider: "openai",
        language: "et",
        error: "AudioResponseError",
      }),
    );
  });

  it("tries a later provider when an earlier provider returns empty audio", async () => {
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
    const openai = vi.fn(async () => new Response(new Uint8Array()));
    const chirp = vi.fn(async () => new Response(new Uint8Array([4, 5, 6])));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await pronunciationAudio(context(card()), "card-1", {
      bucket,
      providers: () => [provider("openai", openai), provider("google-chirp", chirp)],
    });

    expect(openai).toHaveBeenCalledOnce();
    expect(chirp).toHaveBeenCalledOnce();
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

  it("never generates speech for a term too long to say", async () => {
    const get = vi.fn();
    const providers = vi.fn();
    const bucket = new Proxy(Object.create(null) as R2Bucket, {
      get: (_target, property) => ({ get })[property as "get"],
    });

    await expect(
      pronunciationAudio(context(card({ term: "a".repeat(201) })), "card-1", { bucket, providers }),
    ).rejects.toThrow("terms of up to 200 characters");
    expect(get).not.toHaveBeenCalled();
    expect(providers).not.toHaveBeenCalled();
  });

  it("reuses remembered audio from the preferred provider without generating", async () => {
    const objects = new Map<string, R2ObjectBody>();
    const get = vi.fn(async (key: string) => objects.get(key) ?? null);
    const put = vi.fn(async (key: string) => {
      objects.set(key, storedAudio(key));
    });
    const bucket = new Proxy(Object.create(null) as R2Bucket, {
      get: (_target, property) => ({ get, put })[property as "get"],
    });
    const speech = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
    const providers = () => [provider("google-gemini", speech)];

    const first = await pronunciationAudio(context(card()), "card-1", { bucket, providers });
    get.mockClear();
    const again = await pronunciationAudio(context(card({ audioKey: first.key })), "card-1", {
      bucket,
      providers,
    });

    expect(again.key).toBe(first.key);
    expect(speech).toHaveBeenCalledOnce();
    expect(get).toHaveBeenCalledOnce();
  });

  it("serves a stored clip to a preload and never voices one that is missing", async () => {
    const objects = new Map<string, R2ObjectBody>();
    const put = vi.fn(async (key: string) => {
      objects.set(key, storedAudio(key));
    });
    const bucket = new Proxy(Object.create(null) as R2Bucket, {
      get: (_target, property) =>
        ({ get: vi.fn(async (key: string) => objects.get(key) ?? null), put })[property as "get"],
    });
    const speech = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
    const providers = () => [provider("google-gemini", speech)];

    await expect(
      pronunciationAudio(context(card()), "card-1", { bucket, providers, storedOnly: true }),
    ).rejects.toMatchObject({ code: "not_found" });
    expect(speech).not.toHaveBeenCalled();

    const played = await pronunciationAudio(context(card()), "card-1", { bucket, providers });
    const preloaded = await pronunciationAudio(context(card()), "card-1", {
      bucket,
      providers,
      storedOnly: true,
    });
    expect(preloaded.key).toBe(played.key);
    expect(speech).toHaveBeenCalledOnce();
  });

  it("never voices for a preload when the remembered clip is from a retired provider", async () => {
    const old = storedAudio("cards/card-1/openai.mp3");
    const bucket = new Proxy(Object.create(null) as R2Bucket, {
      get: (_target, property) =>
        ({ get: vi.fn(async (key: string) => (key === old.key ? old : null)), put: vi.fn() })[
          property as "get"
        ],
    });
    const gemini = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));

    await expect(
      pronunciationAudio(context(card({ audioKey: old.key })), "card-1", {
        bucket,
        providers: () => [provider("google-gemini", gemini)],
        storedOnly: true,
      }),
    ).rejects.toMatchObject({ code: "not_found" });
    expect(gemini).not.toHaveBeenCalled();
  });

  it("replaces remembered audio from a provider that is no longer preferred", async () => {
    const old = storedAudio("cards/card-1/openai.mp3");
    const objects = new Map<string, R2ObjectBody>([[old.key, old]]);
    const put = vi.fn(async (key: string) => {
      objects.set(key, storedAudio(key));
    });
    const bucket = new Proxy(Object.create(null) as R2Bucket, {
      get: (_target, property) =>
        ({ get: vi.fn(async (key: string) => objects.get(key) ?? null), put })[property as "get"],
    });
    const gemini = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));

    const audio = await pronunciationAudio(context(card({ audioKey: old.key })), "card-1", {
      bucket,
      providers: () => [provider("google-gemini", gemini)],
    });

    expect(gemini).toHaveBeenCalledOnce();
    expect(audio.key).not.toBe(old.key);
  });

  it("keeps playing a pre-versioned recording when every provider fails", async () => {
    const old = storedAudio("cards/card-1/d5ec3ef391f178010649f5e94ce6b6f5.mp3");
    const bucket = new Proxy(Object.create(null) as R2Bucket, {
      get: (_target, property) =>
        ({ get: vi.fn(async (key: string) => (key === old.key ? old : null)) })[property as "get"],
    });
    const gemini = vi.fn(async () => {
      throw new Error("unavailable");
    });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const audio = await pronunciationAudio(context(card({ audioKey: old.key })), "card-1", {
      bucket,
      providers: () => [provider("google-gemini", gemini)],
    });

    expect(audio.key).toBe(old.key);
    expect(gemini).toHaveBeenCalledOnce();
  });

  it("plays remembered audio when no provider is configured", async () => {
    const stored = storedAudio("cards/card-1/existing.mp3");
    const get = vi.fn(async () => stored);
    const bucket = new Proxy(Object.create(null) as R2Bucket, {
      get: (_target, property) => ({ get })[property as "get"],
    });

    await pronunciationAudio(context(card({ audioKey: stored.key })), "card-1", {
      bucket,
      providers: () => [],
    });

    expect(get).toHaveBeenCalledWith(stored.key);
  });

  it("reports each paid speech attempt with its cost, and nothing for a clip already stored", async () => {
    let stored: R2ObjectBody | null = null;
    const get = vi.fn(async () => stored);
    const put = vi.fn(async (key: string) => {
      stored = storedAudio(key);
    });
    const bucket = new Proxy(Object.create(null) as R2Bucket, {
      get: (_target, property) => ({ get, put })[property as "get"],
    });
    const capture = vi.fn();
    const analytics = { writeDataPoint: vi.fn(), capture };
    const failing = vi.fn(async () => {
      throw Object.assign(new Error("down"), { status: 503 });
    });
    const gemini = vi.fn(async (request: SpeechRequest) => {
      request.usage?.({ inputTokens: 80, outputTokens: 25 });
      return new Response(new Uint8Array([1, 2, 3]));
    });
    const deps = {
      bucket,
      providers: () => [provider("elevenlabs", failing), provider("gemini-api", gemini)],
    };

    await pronunciationAudio({ ...context(card()), analytics }, "card-1", deps);
    await pronunciationAudio({ ...context(card()), analytics }, "card-1", deps);

    expect(capture.mock.calls.map(([event]) => event)).toEqual([
      expect.objectContaining({
        name: "$ai_generation",
        $ai_span_name: "pronunciation",
        $ai_provider: "elevenlabs",
        $ai_model: "eleven_v4",
        characters: 6,
        $ai_is_error: true,
        $ai_http_status: 503,
      }),
      expect.objectContaining({
        $ai_provider: "google",
        $ai_model: "gemini-3.1-flash-tts-preview",
        $ai_input_tokens: 80,
        $ai_output_tokens: 25,
        characters: 6,
        $ai_is_error: false,
        $ai_total_cost_usd: (80 * 1 + 25 * 20) / 1e6,
      }),
    ]);
    expect(capture.mock.calls[0]?.[0]).not.toHaveProperty("$ai_total_cost_usd");
  });
});

function contextBucket() {
  const objects = new Map<
    string,
    { value: string | Uint8Array; etag: string; metadata?: Record<string, string> }
  >();
  let version = 0;
  const get = vi.fn(async (key: string) => {
    const object = objects.get(key);
    if (!object) return null;
    const value =
      typeof object.value === "string" ? object.value : new TextDecoder().decode(object.value);
    return {
      ...storedAudio(key),
      etag: object.etag,
      size: value.length,
      customMetadata: object.metadata,
      body: new Blob([value]).stream(),
      json: async () => JSON.parse(value),
    };
  });
  const put = vi.fn(async (key: string, value: string | Uint8Array, options?: R2PutOptions) => {
    const existing = objects.get(key);
    const condition = options?.onlyIf as R2Conditional | undefined;
    if (condition?.etagDoesNotMatch === "*" && existing) return null;
    if (condition?.etagMatches && condition.etagMatches !== existing?.etag) return null;
    objects.set(key, {
      value,
      etag: String(++version),
      ...(options?.customMetadata ? { metadata: options.customMetadata } : {}),
    });
    return get(key);
  });
  const bucket = new Proxy(Object.create(null) as R2Bucket, {
    get: (_target, property) => ({ get, put })[property as "get"],
  });
  return { bucket, objects, get, put };
}

const japaneseCard = () =>
  card({ term: "橋", pronunciation: "はし", meaning: "bridge", language: "ja" });

function contextGenerator() {
  return {
    model: "gemini-2.5-flash-lite",
    generate: vi.fn(async () => ({
      previousText: "川を渡る",
      inputTokens: 300,
      outputTokens: 400,
    })),
  };
}

describe("Japanese preceding context", () => {
  it("preloads only existing contextual audio without buying context or speech", async () => {
    const { bucket } = contextBucket();
    const japaneseContext = contextGenerator();
    const speech = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
    const deps = { bucket, japaneseContext, providers: () => [provider("elevenlabs", speech)] };
    const row = japaneseCard();
    await expect(
      pronunciationAudio(context(row), row.id, { ...deps, storedOnly: true }),
    ).rejects.toMatchObject({ code: "not_found" });
    expect(japaneseContext.generate).not.toHaveBeenCalled();
    expect(speech).not.toHaveBeenCalled();
    const first = await pronunciationAudio(context(row), row.id, deps);
    const preload = await pronunciationAudio(context({ ...row, audioKey: first.key }), row.id, {
      ...deps,
      storedOnly: true,
    });
    expect(preload.key).toBe(first.key);
    await expect(
      pronunciationAudio(context({ ...row, meaning: "edge" }), row.id, {
        ...deps,
        storedOnly: true,
      }),
    ).rejects.toMatchObject({ code: "not_found" });
    const changedVoice = {
      ...deps,
      providers: () => [{ ...provider("elevenlabs", speech), voice: "Hinata" }],
      storedOnly: true,
    };
    await expect(pronunciationAudio(context(row), row.id, changedVoice)).rejects.toMatchObject({
      code: "not_found",
    });
    expect(japaneseContext.generate).toHaveBeenCalledOnce();
    expect(speech).toHaveBeenCalledOnce();
  });
  it("pays once for context and speech, reuses context across voices, and invalidates on meaning edits", async () => {
    const { bucket } = contextBucket();
    const japaneseContext = contextGenerator();
    const speech = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
    let voice = "Hiroki";
    const deps = {
      bucket,
      japaneseContext,
      providers: () => [{ ...provider("elevenlabs", speech), locale: "ja-JP", voice }],
    };
    const row = japaneseCard();
    const first = await pronunciationAudio(context(row), row.id, deps);
    const replay = await pronunciationAudio(context({ ...row, audioKey: first.key }), row.id, deps);
    expect(replay.key).toBe(first.key);
    expect(japaneseContext.generate).toHaveBeenCalledOnce();
    expect(speech).toHaveBeenCalledOnce();
    expect(speech).toHaveBeenLastCalledWith({
      text: "はし",
      language: "ja",
      previousText: "川を渡る",
      usage: expect.any(Function),
    });
    voice = "Hinata";
    const changedVoice = await pronunciationAudio(
      context({ ...row, audioKey: first.key }),
      row.id,
      deps,
    );
    expect(changedVoice.key).not.toBe(first.key);
    expect(japaneseContext.generate).toHaveBeenCalledOnce();
    expect(speech).toHaveBeenCalledTimes(2);
    const changedMeaning = await pronunciationAudio(
      context({ ...row, meaning: "a bridge over a stream", audioKey: changedVoice.key }),
      row.id,
      deps,
    );
    expect(changedMeaning.key).not.toBe(changedVoice.key);
    expect(japaneseContext.generate).toHaveBeenCalledTimes(2);
  });

  it("keeps recordings and non-Japanese terms outside context generation", async () => {
    const { bucket, put } = contextBucket();
    const japaneseContext = contextGenerator();
    const speech = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
    const deps = { bucket, japaneseContext, providers: () => [provider("elevenlabs", speech)] };
    await put("recorded.mp3", new Uint8Array([1, 2, 3]));
    await pronunciationAudio(
      context({ ...japaneseCard(), audioKey: "recorded.mp3", audioSource: "recorded" }),
      "card-1",
      deps,
    );
    await pronunciationAudio(context(card()), "card-1", deps);
    expect(japaneseContext.generate).not.toHaveBeenCalled();
    expect(speech).toHaveBeenCalledOnce();
    expect(speech).toHaveBeenCalledWith({
      text: "jäääär",
      language: "et",
      usage: expect.any(Function),
    });
  });

  it("backs off after invalid context instead of spending on each press", async () => {
    const { bucket } = contextBucket();
    const japaneseContext = contextGenerator();
    japaneseContext.generate.mockResolvedValue({
      previousText: "とても",
      inputTokens: 300,
      outputTokens: 10,
    });
    const speech = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
    const deps = { bucket, japaneseContext, providers: () => [provider("elevenlabs", speech)] };
    const first = await pronunciationAudio(context(japaneseCard()), "card-1", deps);
    await pronunciationAudio(context({ ...japaneseCard(), audioKey: first.key }), "card-1", deps);
    expect(japaneseContext.generate).toHaveBeenCalledOnce();
    expect(speech).toHaveBeenCalledOnce();
    expect(speech).toHaveBeenCalledWith({
      text: "はし",
      language: "ja",
      usage: expect.any(Function),
    });
  });

  it("serializes first plays across independent callers before either can bill twice", async () => {
    const { bucket } = contextBucket();
    const japaneseContext = contextGenerator();
    let finish!: () => void;
    let started!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const generating = new Promise<void>((resolve) => {
      started = resolve;
    });
    japaneseContext.generate.mockImplementation(async () => {
      started();
      await pending;
      return { previousText: "川を渡る", inputTokens: 300, outputTokens: 400 };
    });
    const speech = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
    const deps = { bucket, japaneseContext, providers: () => [provider("elevenlabs", speech)] };
    const first = pronunciationAudio(context(japaneseCard()), "card-1", deps);
    await generating;
    await expect(pronunciationAudio(context(japaneseCard()), "card-1", deps)).rejects.toThrow(
      "being prepared",
    );
    finish();
    await first;
    expect(japaneseContext.generate).toHaveBeenCalledOnce();
    expect(speech).toHaveBeenCalledOnce();
  });
  it("reuses existing kana-only audio when no useful lead-in is returned", async () => {
    const { bucket } = contextBucket();
    const speech = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
    const row = japaneseCard();
    const baseline = { bucket, providers: () => [provider("elevenlabs", speech)] };
    const first = await pronunciationAudio(context(row), row.id, baseline);
    const generate = vi.fn(async () => ({
      previousText: null,
      inputTokens: 300,
      outputTokens: 400,
    }));
    const replay = await pronunciationAudio(context({ ...row, audioKey: first.key }), row.id, {
      ...baseline,
      japaneseContext: { model: "gemini-2.5-flash-lite", generate },
    });
    expect(replay.key).toBe(first.key);
    expect(speech).toHaveBeenCalledOnce();
    expect(generate).toHaveBeenCalledOnce();
  });
});

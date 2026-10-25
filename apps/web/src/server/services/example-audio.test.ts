import type { Card } from "@lymi/core/schema";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SpeechProvider, SpeechRequest } from "../ai";
import type { Db } from "../db";
import { aiAllowedForOwner } from "./ai-consent";
import type { ServiceContext } from "./context";
import { ServiceError } from "./context";
import { exampleAudio } from "./example-audio";

vi.mock("./ai-consent", () => ({ aiAllowedForOwner: vi.fn(async () => true) }));

afterEach(() => {
  vi.restoreAllMocks();
});

function card(patch: Partial<Card> = {}): Card {
  const now = new Date();
  return {
    id: "card-1",
    userId: "user-1",
    deckId: "deck-1",
    revision: 1,
    term: "食べる",
    normalizedTerm: "食べる",
    meaning: "to eat",
    pronunciation: "たべる",
    example: "毎朝[まいあさ]パンを食[た]べます。",
    exampleTranslation: null,
    exampleTranslationSource: null,
    exampleTranslationOf: null,
    exampleTranslationStatus: null,
    notes: null,
    hook: null,
    hookSource: null,
    hookDraft: null,
    language: "ja",
    tags: [],
    source: null,
    sectionId: null,
    directions: null,
    reviewModeKeys: null,
    imageVersion: null,
    importId: null,
    externalId: null,
    meaningSource: "manual",
    exampleSource: "manual",
    pronunciationSource: "manual",
    notesSource: null,
    enrichmentStatus: null,
    enrichmentFields: null,
    audioKey: null,
    audioSource: null,
    audioApprovedKey: null,
    exampleRecordingKey: null,
    createdBy: "user",
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    ...patch,
  };
}

/** `getCard` reads the card through its deck's membership; `audit` inserts a row. */
function context(row: Card): ServiceContext & { audited: unknown[] } {
  const audited: unknown[] = [];
  const whereSelect = vi.fn(async () => [{ card: row }]);
  const innerJoin = vi.fn(() => ({ where: whereSelect }));
  const from = vi.fn(() => ({ innerJoin }));
  const select = vi.fn(() => ({ from }));
  const insert = vi.fn(() => ({
    values: vi.fn(async (value: unknown) => {
      audited.push(value);
    }),
  }));
  const db = new Proxy(Object.create(null) as Db, {
    get: (_target, property) => ({ select, insert })[property as "select"],
  });
  return { db, userId: row.userId, actor: "user", audited };
}

/** R2 as the service uses it: whole objects, and the conditional writes a lease takes. */
function memoryBucket() {
  const objects = new Map<
    string,
    { bytes: Uint8Array; etag: string; meta: Record<string, string> }
  >();
  let etags = 0;
  const body = (key: string): R2ObjectBody | null => {
    const object = objects.get(key);
    if (!object) return null;
    return {
      key,
      size: object.bytes.byteLength,
      etag: object.etag,
      httpEtag: `"${object.etag}"`,
      customMetadata: object.meta,
      body: new Blob([object.bytes as Uint8Array<ArrayBuffer>]).stream(),
      writeHttpMetadata: () => undefined,
    } as unknown as R2ObjectBody;
  };
  const put = vi.fn(
    async (
      key: string,
      value: Uint8Array | string,
      options?: {
        onlyIf?: { etagMatches?: string; etagDoesNotMatch?: string };
        customMetadata?: Record<string, string>;
      },
    ) => {
      const current = objects.get(key);
      if (options?.onlyIf?.etagDoesNotMatch === "*" && current) return null;
      if (options?.onlyIf?.etagMatches && current?.etag !== options.onlyIf.etagMatches) return null;
      const etag = `e${++etags}`;
      const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
      objects.set(key, { bytes, etag, meta: options?.customMetadata ?? {} });
      return { etag };
    },
  );
  const bucket = new Proxy(Object.create(null) as R2Bucket, {
    get: (_target, property) => ({ get: async (key: string) => body(key), put })[property as "get"],
  });
  const clips = () => [...objects.keys()].filter((key) => !key.endsWith(".lock"));
  return { bucket, put, clips };
}

function provider(
  name: SpeechProvider["provider"],
  speech: (request: SpeechRequest) => Promise<Response>,
): SpeechProvider {
  return {
    provider: name,
    model: `${name}-model`,
    voice: "Kore",
    locale: "ja-JP",
    contentType: "audio/mpeg",
    extension: "mp3",
    speech,
  };
}

const sound = () => new Response(new Uint8Array([1, 2, 3]));
/** An allowance with clips left, which records each one spent. */
const free = () => ({ left: async () => null, spend: vi.fn(async () => undefined) });

describe("example audio", () => {
  it("plays an imported recording as it is, with no provider, allowance or AI consent", async () => {
    const { bucket, put } = memoryBucket();
    const key = "cards/card-1/example-recorded/clip.mp3";
    await bucket.put(key, new Uint8Array([9, 9, 9]));
    put.mockClear();
    const consentChecks = vi.mocked(aiAllowedForOwner).mock.calls.length;
    const speech = vi.fn(async () => sound());
    const allowance = { left: vi.fn(async () => 60), spend: vi.fn(async () => undefined) };

    const played = await exampleAudio(
      context(card({ exampleRecordingKey: key, language: null })),
      "card-1",
      { bucket, providers: () => [provider("google-gemini", speech)] },
      allowance,
    );
    expect("clip" in played && played.clip.key).toBe(key);
    expect(speech).not.toHaveBeenCalled();
    expect(allowance.left).not.toHaveBeenCalled();
    expect(vi.mocked(aiAllowedForOwner).mock.calls).toHaveLength(consentChecks);
    expect(put).not.toHaveBeenCalled();
  });

  it("never stands generated speech in for a missing recording", async () => {
    const { bucket } = memoryBucket();
    const speech = vi.fn(async () => sound());
    await expect(
      exampleAudio(
        context(card({ exampleRecordingKey: "cards/card-1/example-recorded/gone.mp3" })),
        "card-1",
        { bucket, providers: () => [provider("google-gemini", speech)] },
        free(),
      ),
    ).rejects.toMatchObject({ code: "unavailable" });
    expect(speech).not.toHaveBeenCalled();
  });

  it("reads a Japanese example from its readings once, then plays the stored clip", async () => {
    const { bucket, clips } = memoryBucket();
    const speech = vi.fn(async (_request: SpeechRequest) => sound());
    const allowance = free();
    const ctx = context(card());
    const deps = { bucket, providers: () => [provider("google-gemini", speech)] };

    const first = await exampleAudio(ctx, "card-1", deps, allowance);
    const again = await exampleAudio(ctx, "card-1", deps, allowance);

    expect("clip" in first && "clip" in again).toBe(true);
    expect(speech).toHaveBeenCalledTimes(1);
    expect(speech.mock.calls[0]?.[0]).toMatchObject({
      text: "まいあさパンをたべます。",
      language: "ja",
      kind: "example",
    });
    expect(allowance.spend).toHaveBeenCalledTimes(1);
    expect(clips()).toEqual([
      expect.stringMatching(/^cards\/card-1\/example\/v1\/[0-9a-f]{32}\.mp3$/),
    ]);
    expect(ctx.audited).toEqual([
      expect.objectContaining({ action: "generate_audio", entityId: "card-1" }),
    ]);
  });

  it("says a Chinese example's characters, never its pinyin", async () => {
    const { bucket } = memoryBucket();
    const speech = vi.fn(async (_request: SpeechRequest) => sound());
    await exampleAudio(
      context(card({ language: "zh", example: "我[wǒ]去[qù]银行[yínháng]。" })),
      "card-1",
      { bucket, providers: () => [provider("google-gemini", speech)] },
      free(),
    );
    expect(speech.mock.calls[0]?.[0].text).toBe("我去银行。");
  });

  it("makes a new clip for a changed example and never serves the old one for it", async () => {
    const { bucket, clips } = memoryBucket();
    const speech = vi.fn(async (_request: SpeechRequest) => sound());
    const deps = { bucket, providers: () => [provider("google-gemini", speech)] };
    await exampleAudio(context(card()), "card-1", deps, free());
    await exampleAudio(context(card({ example: "パンを食[た]べた。" })), "card-1", deps, free());
    expect(speech.mock.calls.map(([request]) => request.text)).toEqual([
      "まいあさパンをたべます。",
      "パンをたべた。",
    ]);
    expect(clips()).toHaveLength(2);
  });

  it("answers a preload with a stored clip or not found, and never spends", async () => {
    const { bucket } = memoryBucket();
    const speech = vi.fn(async () => sound());
    const allowance = free();
    const deps = { bucket, providers: () => [provider("google-gemini", speech)], storedOnly: true };
    await expect(exampleAudio(context(card()), "card-1", deps, allowance)).rejects.toMatchObject({
      code: "not_found",
    });
    expect(speech).not.toHaveBeenCalled();
    expect(allowance.spend).not.toHaveBeenCalled();
  });

  it("never voices an example whose owner has not allowed AI", async () => {
    const { bucket } = memoryBucket();
    const speech = vi.fn(async () => sound());
    const allowance = free();
    vi.mocked(aiAllowedForOwner).mockResolvedValueOnce(false);
    const deps = { bucket, providers: () => [provider("google-gemini", speech)] };
    await expect(exampleAudio(context(card()), "card-1", deps, allowance)).rejects.toMatchObject({
      code: "not_found",
    });
    expect(vi.mocked(aiAllowedForOwner)).toHaveBeenLastCalledWith(expect.anything(), "user-1");
    expect(speech).not.toHaveBeenCalled();
  });

  it("asks no provider once the learner's new clips for the day are spent", async () => {
    const { bucket, put } = memoryBucket();
    const speech = vi.fn(async () => sound());
    const found = await exampleAudio(
      context(card()),
      "card-1",
      { bucket, providers: () => [provider("google-gemini", speech)] },
      { left: async () => 3600, spend: vi.fn() },
    );
    expect(found).toEqual({ retryAfter: 3600 });
    expect(speech).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });

  it("falls back after a provider's failure, and says so when every one fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { bucket } = memoryBucket();
    const failing = vi.fn(async (): Promise<Response> => {
      throw Object.assign(new Error("down"), { status: 503 });
    });
    const working = vi.fn(async () => sound());
    const fallback = await exampleAudio(
      context(card()),
      "card-1",
      { bucket, providers: () => [provider("elevenlabs", failing), provider("openai", working)] },
      free(),
    );
    expect("clip" in fallback).toBe(true);
    expect(working).toHaveBeenCalledTimes(1);

    const unspent = free();
    const none = exampleAudio(
      context(card({ example: "水[みず]を飲[の]む。" })),
      "card-1",
      { bucket: memoryBucket().bucket, providers: () => [provider("elevenlabs", failing)] },
      unspent,
    );
    await expect(none).rejects.toMatchObject({ code: "unavailable" });
    // Nothing was heard, so nothing is taken from the day's clips.
    expect(unspent.spend).not.toHaveBeenCalled();
  });

  it("is refused for a card with no language, no example or an example too long to say", async () => {
    const { bucket } = memoryBucket();
    const deps = { bucket, providers: () => [provider("google-gemini", async () => sound())] };
    for (const patch of [
      { language: null },
      { example: null },
      { language: "de", example: "Wort ".repeat(120) },
    ]) {
      await expect(
        exampleAudio(context(card(patch)), "card-1", deps, free()),
      ).rejects.toBeInstanceOf(ServiceError);
    }
  });
});

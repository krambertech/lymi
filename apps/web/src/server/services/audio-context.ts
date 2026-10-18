import { kanaReading } from "@lymi/core";
import type { Card } from "@lymi/core/schema";
import { z } from "zod";
import {
  JAPANESE_CONTEXT_POLICY,
  type JapaneseContextInput,
  type JapaneseContextProvider,
  validJapaneseLeadIn,
} from "../ai/japanese-audio-context";
import { ServiceError } from "./context";

export interface AudioContext {
  identity: string;
  previousText: string | null;
}

const ContextRecord = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ready"), previousText: z.string().nullable() }),
  z.object({
    status: z.literal("failed"),
    retryAt: z.number(),
    pendingUntil: z.number().optional(),
  }),
]);

export function japaneseContextInput(card: Card): JapaneseContextInput | null {
  const reading = kanaReading(card);
  if (
    !reading ||
    !card.meaning?.trim() ||
    card.meaning.length > 500 ||
    /[。！？!?\n]/u.test(card.term)
  )
    return null;
  return { term: card.term, reading, meaning: card.meaning };
}

export async function audioFingerprint(value: unknown): Promise<string> {
  const hash = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value))),
  );
  return [...hash]
    .slice(0, 16)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Conditional R2 writes serialize billable misses across Worker isolates, not only one process. */
export async function withAudioLease<T>(
  bucket: R2Bucket,
  key: string,
  run: () => Promise<T>,
): Promise<T> {
  const previous = await bucket.get(key);
  if (previous) {
    await previous.body.cancel();
    if (Number(previous.customMetadata?.expiresAt) > Date.now()) {
      throw new ServiceError(
        "unavailable",
        "Pronunciation audio is being prepared; try again shortly",
      );
    }
  }
  const token = crypto.randomUUID();
  const lock = await bucket.put(key, token, {
    onlyIf: previous ? { etagMatches: previous.etag } : { etagDoesNotMatch: "*" },
    customMetadata: { expiresAt: String(Date.now() + 300_000) },
  });
  if (!lock)
    throw new ServiceError(
      "unavailable",
      "Pronunciation audio is being prepared; try again shortly",
    );
  try {
    return await run();
  } finally {
    try {
      await bucket.put(key, `${token}:done`, {
        onlyIf: { etagMatches: lock.etag },
        customMetadata: { expiresAt: "0" },
      });
    } catch {
      console.warn(JSON.stringify({ event: "pronunciation_lease_release_failed" }));
    }
  }
}

export async function japaneseAudioContext(
  card: Card,
  input: JapaneseContextInput,
  bucket: R2Bucket,
  provider: JapaneseContextProvider,
  cachedOnly = false,
): Promise<AudioContext | undefined> {
  const identity = await audioFingerprint({
    input,
    model: provider.model,
    policy: JAPANESE_CONTEXT_POLICY,
  });
  const key = `cards/${card.id}/context/${identity}.json`;
  const read = async (): Promise<AudioContext | null> => {
    const object = await bucket.get(key);
    if (!object) return null;
    if (object.size > 4096) {
      await object.body.cancel();
      throw new Error("Invalid audio context cache");
    }
    const parsed = ContextRecord.parse(await object.json());
    if (parsed.status === "failed" && (parsed.pendingUntil ?? 0) > Date.now()) {
      throw new ServiceError(
        "unavailable",
        "Pronunciation audio is being prepared; try again shortly",
      );
    }
    if (parsed.status === "failed" && parsed.retryAt <= Date.now()) return null;
    const previousText = parsed.status === "ready" ? parsed.previousText : null;
    if (!validJapaneseLeadIn(previousText, input)) throw new Error("Invalid audio context cache");
    console.info(
      JSON.stringify({
        event: "pronunciation_context_resolved",
        outcome: parsed.status === "ready" ? "cached" : "cooldown",
        model: provider.model,
      }),
    );
    return { identity, previousText };
  };
  const cached = await read();
  if (cached) return cached;
  if (cachedOnly) return undefined;
  return withAudioLease(bucket, `${key}.lock`, async () => {
    const concurrent = await read();
    if (concurrent) return concurrent;
    // Persist the cooldown before billing, so a timeout or failed final write cannot buy it again.
    await bucket.put(
      key,
      JSON.stringify({
        status: "failed",
        retryAt: Date.now() + 86_400_000,
        pendingUntil: Date.now() + 300_000,
      }),
      {
        httpMetadata: { contentType: "application/json" },
      },
    );
    let result: Awaited<ReturnType<JapaneseContextProvider["generate"]>>;
    const started = Date.now();
    try {
      result = await provider.generate(input);
      if (!validJapaneseLeadIn(result.previousText, input))
        throw new Error("Invalid audio context");
    } catch {
      await bucket.put(
        key,
        JSON.stringify({ status: "failed", retryAt: Date.now() + 86_400_000 }),
        { httpMetadata: { contentType: "application/json" } },
      );
      console.warn(
        JSON.stringify({
          event: "pronunciation_context_resolved",
          outcome: "failed",
          model: provider.model,
          latencyMs: Date.now() - started,
        }),
      );
      return { identity, previousText: null };
    }
    await bucket.put(key, JSON.stringify({ status: "ready", previousText: result.previousText }), {
      httpMetadata: { contentType: "application/json" },
    });
    console.info(
      JSON.stringify({
        event: "pronunciation_context_resolved",
        outcome: result.previousText ? "generated" : "unneeded",
        model: provider.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        latencyMs: Date.now() - started,
      }),
    );
    return { identity, previousText: result.previousText };
  });
}

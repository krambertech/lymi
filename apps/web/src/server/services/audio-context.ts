import { kanaReading } from "@lymi/core";
import type { Card } from "@lymi/core/schema";
import { z } from "zod";
import {
  JAPANESE_CONTEXT_POLICY,
  JapaneseContextError,
  type JapaneseContextInput,
  type JapaneseContextProvider,
  type JapaneseContextUsage,
  validJapaneseLeadIn,
} from "../ai/japanese-audio-context";
import { type AnalyticsWriter, textCallReporter } from "./analytics";
import { ServiceError } from "./context";

// About as long as one context call plus one speech call, so a cut-off request blocks a card briefly.
const LEASE_MS = 45_000;
const FAILURE_COOLDOWN_MS = 86_400_000;
// An interrupted call leaves its pending marker behind; that card retries after this instead of a day.
const INTERRUPTED_COOLDOWN_MS = 300_000;

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
    customMetadata: { expiresAt: String(Date.now() + LEASE_MS) },
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
  analytics?: AnalyticsWriter,
): Promise<AudioContext | undefined> {
  const identity = await audioFingerprint({
    input,
    model: provider.model,
    policy: JAPANESE_CONTEXT_POLICY,
  });
  const key = `cards/${card.id}/context/${identity}.json`;
  const log = (outcome: string, detail: Record<string, number> = {}) =>
    console.info(
      JSON.stringify({
        event: "pronunciation_context_resolved",
        outcome,
        model: provider.model,
        ...detail,
      }),
    );
  const record = async (value: z.input<typeof ContextRecord>) =>
    bucket.put(key, JSON.stringify(value), {
      httpMetadata: { contentType: "application/json" },
    });
  const read = async (): Promise<AudioContext | null> => {
    const object = await bucket.get(key);
    if (!object) return null;
    if (object.size > 4096) {
      await object.body.cancel();
      log("invalid_cache");
      return null;
    }
    const parsed = ContextRecord.safeParse(await object.json().catch(() => null));
    // A record a later, stricter policy would refuse is bought again rather than breaking playback.
    if (
      !parsed.success ||
      (parsed.data.status === "ready" && !validJapaneseLeadIn(parsed.data.previousText, input))
    ) {
      log("invalid_cache");
      return null;
    }
    if (parsed.data.status === "failed" && (parsed.data.pendingUntil ?? 0) > Date.now()) {
      throw new ServiceError(
        "unavailable",
        "Pronunciation audio is being prepared; try again shortly",
      );
    }
    if (parsed.data.status === "failed" && parsed.data.retryAt <= Date.now()) return null;
    log(parsed.data.status === "ready" ? "cached" : "cooldown");
    return {
      identity,
      previousText: parsed.data.status === "ready" ? parsed.data.previousText : null,
    };
  };
  const cached = await read();
  if (cached) return cached;
  if (cachedOnly) return undefined;
  return withAudioLease(bucket, `${key}.lock`, async () => {
    const concurrent = await read();
    if (concurrent) return concurrent;
    // Persist a cooldown before billing, so a timeout or failed final write cannot buy it again at once.
    await record({
      status: "failed",
      retryAt: Date.now() + INTERRUPTED_COOLDOWN_MS,
      pendingUntil: Date.now() + LEASE_MS,
    });
    const started = Date.now();
    const report = (usage: JapaneseContextUsage | undefined, error: boolean) =>
      textCallReporter(
        analytics,
        "pronunciation_context",
      )({
        provider: "google",
        model: provider.model,
        inputTokens: usage?.inputTokens ?? 0,
        outputTokens: usage?.outputTokens ?? 0,
        reasoningTokens: usage?.reasoningTokens,
        latencyMs: Date.now() - started,
        error,
        status: usage?.status,
      });
    try {
      const result = await provider.generate(input);
      if (!validJapaneseLeadIn(result.previousText, input))
        throw new JapaneseContextError("rejected", result);
      report(result, false);
      await record({ status: "ready", previousText: result.previousText });
      log(result.previousText ? "generated" : "unneeded", {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        latencyMs: Date.now() - started,
      });
      return { identity, previousText: result.previousText };
    } catch (error) {
      const failure = error instanceof JapaneseContextError ? error : undefined;
      report(failure?.usage, failure?.reason !== "rejected");
      // At temperature 0 a refused reply would come back the same, so it is kept as no context.
      await record(
        failure?.reason === "rejected"
          ? { status: "ready", previousText: null }
          : { status: "failed", retryAt: Date.now() + FAILURE_COOLDOWN_MS },
      );
      console.warn(
        JSON.stringify({
          event: "pronunciation_context_resolved",
          outcome: failure?.reason === "rejected" ? "rejected" : "failed",
          model: provider.model,
          latencyMs: Date.now() - started,
        }),
      );
      return { identity, previousText: null };
    }
  });
}

import type { Card } from "@lymi/core/schema";
import { z } from "zod";
import { LeadInError, type LeadInUsage } from "../ai/lead-in-writer";
import {
  DECISION_MODEL,
  type LeadInDependencies,
  type LeadInInput,
  type LeadInPolicy,
  leadInScore,
} from "../lead-ins";
import { type AnalyticsWriter, textCallReporter, track } from "./analytics";
import { ServiceError } from "./context";

// About as long as one decision, one lead-in and one speech call, so a cut-off request blocks briefly.
const LEASE_MS = 45_000;
const FAILURE_COOLDOWN_MS = 86_400_000;
// An interrupted call leaves its pending marker behind; that card retries after this instead of a day.
const INTERRUPTED_COOLDOWN_MS = 300_000;

export interface SpokenLeadIn {
  identity: string;
  previousText: string | null;
}

/** How a card's lead-in was settled; stored with it and reported once. */
const OUTCOMES = ["unambiguous", "written", "no_fragment", "refused"] as const;
type Outcome = (typeof OUTCOMES)[number];

const LeadInRecord = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ready"),
    previousText: z.string().nullable(),
    outcome: z.enum(OUTCOMES).optional(),
    score: z.number().nullable().optional(),
  }),
  z.object({
    status: z.literal("failed"),
    retryAt: z.number(),
    pendingUntil: z.number().optional(),
  }),
]);

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

/**
 * The words said before a term, decided once per card input: free rules first, then the decision
 * model, and the writer only when the reading alone could name another word.
 */
export async function settleLeadIn(
  card: Card,
  policy: LeadInPolicy,
  input: LeadInInput,
  bucket: R2Bucket,
  deps: LeadInDependencies & { writer: NonNullable<LeadInDependencies["writer"]> },
  cachedOnly = false,
  analytics?: AnalyticsWriter,
): Promise<SpokenLeadIn | undefined> {
  const { writer } = deps;
  const identity = await audioFingerprint({
    input,
    language: policy.language,
    policy: policy.version,
    decision: [DECISION_MODEL, policy.threshold],
    writer: writer.model,
  });
  const key = `cards/${card.id}/lead-in/${identity}.json`;
  const log = (outcome: string, detail: Record<string, number | string> = {}) =>
    console.info(
      JSON.stringify({
        event: "lead_in_resolved",
        outcome,
        language: policy.language,
        model: writer.model,
        ...detail,
      }),
    );
  const record = async (value: z.input<typeof LeadInRecord>) =>
    bucket.put(key, JSON.stringify(value), {
      httpMetadata: { contentType: "application/json" },
    });
  const read = async (): Promise<SpokenLeadIn | null> => {
    const object = await bucket.get(key);
    if (!object) return null;
    if (object.size > 4096) {
      await object.body.cancel();
      log("invalid_cache");
      return null;
    }
    const parsed = LeadInRecord.safeParse(await object.json().catch(() => null));
    // A record a later, stricter policy would refuse is bought again rather than breaking playback.
    if (
      !parsed.success ||
      (parsed.data.status === "ready" && !policy.accepts(parsed.data.previousText, input))
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
    const score = await leadInScore(deps.decide, policy, input);
    const decide = (outcome: Outcome | "failed") =>
      track(analytics, {
        name: "lead_in_decided",
        language: policy.language,
        outcome,
        decided_by: score === null ? "writer" : "model",
        ...(score === null ? {} : { score: Math.round(score * 100) / 100 }),
      });
    const settle = async (outcome: Outcome, previousText: string | null) => {
      await record({ status: "ready", previousText, outcome, score });
      decide(outcome);
      log(outcome, { latencyMs: Date.now() - started });
      return { identity, previousText };
    };
    if (score !== null && score < policy.threshold) return settle("unambiguous", null);

    const written = Date.now();
    const report = (usage: LeadInUsage | undefined, error: boolean) =>
      textCallReporter(
        analytics,
        "lead_in",
      )({
        provider: "google",
        model: writer.model,
        inputTokens: usage?.inputTokens ?? 0,
        outputTokens: usage?.outputTokens ?? 0,
        reasoningTokens: usage?.reasoningTokens,
        latencyMs: Date.now() - written,
        error,
        status: usage?.status,
      });
    let result: Awaited<ReturnType<typeof writer.write>>;
    try {
      result = await writer.write({
        instructions: policy.instructions,
        input: { ...input },
        accepts: (previousText) => policy.accepts(previousText, input),
      });
      if (!policy.accepts(result.previousText, input)) throw new LeadInError("refused", result);
    } catch (error) {
      const failure = error instanceof LeadInError ? error : undefined;
      // A refused reply was billed and kept, so it is not an outage.
      report(failure?.usage, failure?.reason !== "refused");
      // At temperature 0 a refused reply would come back the same, so it is kept as no lead-in.
      if (failure?.reason === "refused") return settle("refused", null);
      await record({ status: "failed", retryAt: Date.now() + FAILURE_COOLDOWN_MS });
      decide("failed");
      console.warn(
        JSON.stringify({
          event: "lead_in_resolved",
          outcome: "failed",
          language: policy.language,
          model: writer.model,
          latencyMs: Date.now() - started,
        }),
      );
      return { identity, previousText: null };
    }
    report(result, false);
    return settle(result.previousText ? "written" : "no_fragment", result.previousText);
  });
}

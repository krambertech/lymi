import type { Fetch } from "./ai/types";

/** Each outside service a request or background job relies on. docs/operations.md names the alerts. */
export type Dependency =
  | "d1"
  | "kv"
  | "r2"
  | "site"
  | "openai_text"
  | "anthropic"
  | "workers_ai"
  | "elevenlabs"
  | "gemini_speech"
  | "google_speech"
  | "openai_speech"
  | "email"
  | "web_push";

/**
 * `rejected` is any other 4xx, which for a fixed request shape is our bug, not the caller's.
 * `failed` covers 5xx and any redirect, because provider calls refuse to follow one.
 */
export type DependencyOutcome =
  | "ok"
  | "gone"
  | "limited"
  | "rejected"
  | "failed"
  | "timeout"
  | "unreachable";

/** `traffic` is a learner's request or a background job; `canary` is the scheduled production check. */
export type DependencySource = "traffic" | "canary";

export type HealthEnv = {
  HEALTH?: AnalyticsEngineDataset | undefined;
  CF_VERSION_METADATA?: { tag?: string } | undefined;
};

export function outcomeOfStatus(status: number): DependencyOutcome {
  if (status >= 200 && status < 300) return "ok";
  if (status === 429) return "limited";
  if (status >= 400 && status < 500) return "rejected";
  return "failed";
}

export function outcomeOfError(error: unknown): DependencyOutcome {
  const name = (error as { name?: unknown } | null)?.name;
  return name === "TimeoutError" || name === "AbortError" ? "timeout" : "unreachable";
}

function write(
  env: HealthEnv,
  kind: "call" | "check",
  point: {
    dependency: Dependency;
    outcome: DependencyOutcome;
    status?: number | undefined;
    durationMs: number;
    source: DependencySource;
  },
): void {
  if (!env.HEALTH) return;
  try {
    env.HEALTH.writeDataPoint({
      indexes: [point.dependency],
      blobs: [
        kind,
        point.outcome,
        point.status ? `${Math.floor(point.status / 100)}xx` : "none",
        point.source,
        env.CF_VERSION_METADATA?.tag || "none",
      ],
      doubles: [point.durationMs],
    });
  } catch {
    // Metrics never change what the caller sees.
  }
}

/** One attempt at an outside service: every retry is its own row. */
export function recordCall(
  env: HealthEnv,
  point: {
    dependency: Dependency;
    outcome: DependencyOutcome;
    status?: number | undefined;
    durationMs: number;
    source?: DependencySource | undefined;
  },
): void {
  write(env, "call", { ...point, source: point.source ?? "traffic" });
}

/** The canary's verdict on one dependency, after its own retry. */
export function recordCheck(
  env: HealthEnv,
  point: { dependency: Dependency; outcome: DependencyOutcome; durationMs: number },
): void {
  write(env, "check", { ...point, source: "canary" });
}

/** A fetch that records each response's status class, or why there was none. */
export function meteredFetch(
  env: HealthEnv,
  dependency: Dependency,
  source: DependencySource = "traffic",
  base: Fetch = fetch,
): Fetch {
  return async (input, init) => {
    const started = Date.now();
    try {
      const response = await base(input, init);
      recordCall(env, {
        dependency,
        outcome: outcomeOfStatus(response.status),
        status: response.status,
        durationMs: Date.now() - started,
        source,
      });
      return response;
    } catch (error) {
      recordCall(env, {
        dependency,
        outcome: outcomeOfError(error),
        durationMs: Date.now() - started,
        source,
      });
      throw error;
    }
  };
}

/** Records a call that is not a fetch, such as a binding, by whether it threw. */
export async function metered<T>(
  env: HealthEnv,
  dependency: Dependency,
  call: () => Promise<T>,
  source: DependencySource = "traffic",
): Promise<T> {
  const started = Date.now();
  try {
    const result = await call();
    recordCall(env, { dependency, outcome: "ok", durationMs: Date.now() - started, source });
    return result;
  } catch (error) {
    recordCall(env, {
      dependency,
      outcome: outcomeOfError(error) === "timeout" ? "timeout" : "failed",
      durationMs: Date.now() - started,
      source,
    });
    throw error;
  }
}

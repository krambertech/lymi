import type { ProductAnalyticsEvent } from "@lymi/core/analytics";
import type { TextObserver } from "../ai";

export type AnalyticsWriter = Pick<AnalyticsEngineDataset, "writeDataPoint"> & {
  capture?: (event: AnalyticsEvent) => void;
  /** Work that only feeds product analytics, run after the response when PostHog is on. */
  later?: (work: () => Promise<void>) => void;
};

export type AnalyticsEvent = ProductAnalyticsEvent;

/** Only fixed action labels and counts reach Analytics Engine. */
export function track(dataset: AnalyticsWriter | undefined, event: AnalyticsEvent): void {
  if (!dataset) return;
  try {
    dataset.capture?.(event);
  } catch {
    // Analytics never decides whether a product write succeeds.
  }
  const detail =
    event.name === "card_added"
      ? event.source
      : event.name === "review_graded"
        ? event.mode
        : event.name === "import_started" || event.name === "import_finished"
          ? `${event.adapter}:${event.outcome}`
          : event.name === "enrichment_finished"
            ? event.outcome
            : event.name === "onboarding_finished"
              ? event.kind
              : "";
  const value =
    event.name === "card_added" || event.name === "enrichment_finished"
      ? event.count
      : event.name === "review_graded"
        ? event.grade
        : 1;
  try {
    dataset.writeDataPoint({ indexes: [event.name], blobs: [detail], doubles: [value] });
  } catch {
    // Metrics never decide whether a product write succeeds.
  }
}

type AiSpan = Extract<AnalyticsEvent, { name: "$ai_generation" }>["$ai_span_name"];

/** Reports each model call's tokens and time as PostHog's LLM analytics expects, never its text. */
export function textCallReporter(dataset: AnalyticsWriter | undefined, span: AiSpan): TextObserver {
  return (call) =>
    track(dataset, {
      name: "$ai_generation",
      $ai_trace_id: crypto.randomUUID(),
      $ai_session_id: null,
      $ai_span_name: span,
      $ai_provider: call.provider,
      $ai_model: call.model,
      $ai_input_tokens: call.inputTokens,
      $ai_output_tokens: call.outputTokens,
      ...(call.reasoningTokens !== undefined ? { $ai_reasoning_tokens: call.reasoningTokens } : {}),
      ...(call.cachedTokens !== undefined
        ? { $ai_cache_read_input_tokens: call.cachedTokens }
        : {}),
      $ai_latency: call.latencyMs / 1000,
      $ai_is_error: call.error,
      ...(call.status !== undefined ? { $ai_http_status: call.status } : {}),
    });
}

export function recordRequest(
  dataset: AnalyticsWriter | undefined,
  point: {
    route: string;
    method: string;
    status: number;
    durationMs: number;
    actor: "anon" | "public" | "user" | "api" | "mcp";
  },
): void {
  if (!dataset) return;
  const method = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].includes(point.method)
    ? point.method
    : "OTHER";
  try {
    dataset.writeDataPoint({
      indexes: [point.actor],
      blobs: [point.route, method, `${Math.floor(point.status / 100)}xx`],
      doubles: [point.durationMs],
    });
  } catch {
    // Metrics never change an HTTP response.
  }
}

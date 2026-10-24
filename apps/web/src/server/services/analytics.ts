import { type ProductAnalyticsEvent, speechCallCost, textCallCost } from "@lymi/core/analytics";
import type { SpeechCall, TextObserver } from "../ai";

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
              : event.name === "account_deleted"
                ? `${event.client}:${event.confirmed_with}`
                : event.name === "export_started"
                  ? `${event.format}:${event.scope}`
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
  return (call) => {
    const cost = textCallCost(call.model, {
      input: call.inputTokens,
      cached: call.cachedTokens,
      output: call.outputTokens,
    });
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
      ...(cost
        ? {
            $ai_input_cost_usd: cost.input,
            $ai_output_cost_usd: cost.output,
            $ai_total_cost_usd: cost.input + cost.output,
          }
        : {}),
    });
  };
}

const SPEECH_VENDORS = {
  "gemini-api": "google",
  "google-gemini": "google",
  "google-chirp": "google",
  openai: "openai",
  elevenlabs: "elevenlabs",
} as const satisfies Record<SpeechCall["provider"], string>;

/** Reports a speech call in the same LLM analytics shape, priced by what its vendor bills. */
export function trackSpeechCall(
  dataset: AnalyticsWriter | undefined,
  call: SpeechCall,
  span: "pronunciation" | "example_audio" = "pronunciation",
): void {
  // A failed call is not billed, except a Gemini reply whose audio was then refused.
  const cost =
    call.error && call.outputTokens === undefined ? undefined : speechCallCost(call.model, call);
  const tokens = (value: number | undefined) =>
    value === undefined ? undefined : Math.round(value);
  const output = tokens(call.outputTokens);
  const input = tokens(call.inputTokens);
  track(dataset, {
    name: "$ai_generation",
    $ai_trace_id: crypto.randomUUID(),
    $ai_session_id: null,
    $ai_span_name: span,
    $ai_provider: SPEECH_VENDORS[call.provider],
    $ai_model: call.model,
    ...(input !== undefined ? { $ai_input_tokens: input } : {}),
    ...(output !== undefined ? { $ai_output_tokens: output } : {}),
    characters: call.characters,
    $ai_latency: call.latencyMs / 1000,
    $ai_is_error: call.error,
    ...(call.status !== undefined ? { $ai_http_status: call.status } : {}),
    ...(cost
      ? {
          $ai_input_cost_usd: cost.input,
          $ai_output_cost_usd: cost.output,
          $ai_total_cost_usd: cost.input + cost.output,
        }
      : {}),
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
    /** The phone's platform and version, such as `ios 1.2.0`, or `none` without `x-lymi-client`. */
    client: string;
  },
): void {
  if (!dataset) return;
  const method = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].includes(point.method)
    ? point.method
    : "OTHER";
  try {
    dataset.writeDataPoint({
      indexes: [point.actor],
      blobs: [point.route, method, `${Math.floor(point.status / 100)}xx`, point.client],
      doubles: [point.durationMs],
    });
  } catch {
    // Metrics never change an HTTP response.
  }
}

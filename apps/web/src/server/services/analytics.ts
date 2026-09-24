import type { ReviewModeKey } from "@lymi/core";

export type AnalyticsWriter = Pick<AnalyticsEngineDataset, "writeDataPoint">;

export type AnalyticsEvent =
  | { name: "signed_up" | "signed_in" | "deck_joined" | "mcp_tool" }
  | { name: "card_added"; count: number; source: "manual" | "api" | "mcp" | "import" }
  | { name: "review_graded"; mode: ReviewModeKey; grade: number }
  | {
      name: "import_started" | "import_finished";
      adapter: "anki" | "mochi" | "lymi" | "unknown";
      outcome: "started" | "done" | "failed";
    }
  | { name: "enrichment_finished"; outcome: "enriched" | "empty" | "failed"; count: number };

/** Only fixed action labels and counts reach Analytics Engine. */
export function track(dataset: AnalyticsWriter | undefined, event: AnalyticsEvent): void {
  if (!dataset) return;
  const detail =
    event.name === "card_added"
      ? event.source
      : event.name === "review_graded"
        ? event.mode
        : event.name === "import_started" || event.name === "import_finished"
          ? `${event.adapter}:${event.outcome}`
          : event.name === "enrichment_finished"
            ? event.outcome
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

export function recordRequest(
  dataset: AnalyticsWriter | undefined,
  point: {
    route: string;
    method: string;
    status: number;
    durationMs: number;
    actor: "anon" | "user" | "api" | "mcp";
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

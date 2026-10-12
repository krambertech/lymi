import type { ActivityEntry } from "./api";

// What an Activity row means, shared by the web and the phone; each app turns it into its own
// words and marks. Every kind, actor and status here is an open list (ADR 0032), so each
// classification has an "unknown" answer that the apps word neutrally.

/**
 * One write can reach the screen as two entries: a group cut in half by the end of a page, or
 * two decks written in one call, whose entries interleave. They are joined by their group key
 * rather than by being neighbours, so a write is one row and no two rows share a key.
 */
export function mergeActivity(entries: ActivityEntry[]): ActivityEntry[] {
  const byGroup = new Map<string, ActivityEntry>();
  for (const entry of entries) {
    const held = byGroup.get(entry.group);
    if (!held) {
      byGroup.set(entry.group, entry);
      continue;
    }
    byGroup.set(entry.group, {
      ...held,
      count: held.count + entry.count,
      cards: [...held.cards, ...entry.cards],
    });
  }
  return [...byGroup.values()];
}

const WHOLE_KINDS = [
  "import",
  "export",
  "member_joined",
  "member_left",
  "member_removed",
  "invitation_sent",
  "invitation_cancelled",
  "link_on",
  "link_off",
] as const;
const VERBS = ["added", "enriched", "edited", "archived", "restored"] as const;

/** The mark a row carries: the verb of a card, deck, series or section write, or the event itself. */
export type ActivityMark = (typeof WHOLE_KINDS)[number] | (typeof VERBS)[number];

export function activityMark(kind: string): ActivityMark {
  const whole = WHOLE_KINDS.find((k) => k === kind);
  if (whole) return whole;
  const verb = kind.slice(kind.indexOf("_") + 1);
  return VERBS.find((v) => v === verb) ?? "edited";
}

/** Who wrote: a named app or key says its own name; otherwise the kind of caller. */
export type ActivityCaller =
  | { kind: "app"; name: string }
  | { kind: "user" | "api" | "mcp" | "ai" | "lymi" };

export function activityCaller(entry: ActivityEntry): ActivityCaller {
  if (entry.app) return { kind: "app", name: entry.app };
  const actor = entry.actor as string;
  if (actor === "user" || actor === "api" || actor === "mcp" || actor === "ai") {
    return { kind: actor };
  }
  return { kind: "lymi" };
}

/**
 * Who the line under a row names, if anyone. The people rows name the person in the sentence,
 * and a file the learner moved is theirs by being there, so neither repeats it.
 */
export function namesCaller(entry: ActivityEntry): boolean {
  const kind = entry.kind as string;
  const named = kind.startsWith("member_") && kind !== "member_removed";
  const file = entry.import ?? entry.export;
  return !named && !(file && entry.actor === "user");
}

/** Where an import stands, as its chip says it. Done says nothing, because its count does. */
export type ImportStage =
  | "archived"
  | "uploading"
  | "reading"
  | "ready"
  | "importing"
  | "stopped"
  | "cancelled"
  | "done"
  | "unknown";

export function importStage(item: NonNullable<ActivityEntry["import"]>): ImportStage {
  if (item.archivedAt) return "archived";
  switch (item.status as string) {
    case "uploading":
      return "uploading";
    case "inspecting":
      return "reading";
    case "ready":
      return "ready";
    case "importing":
      return "importing";
    case "failed":
      return "stopped";
    case "cancelled":
      return "cancelled";
    case "done":
      return "done";
    default:
      return "unknown";
  }
}

/** Whether an import's row can say it brought cards in: done, or stopped after writing some. */
export function importOutcome(
  item: NonNullable<ActivityEntry["import"]>,
): "imported" | "importing" | "unknown" {
  const status = item.status as string;
  if (status === "done" || (status === "failed" && (item.counts?.added ?? 0) > 0)) {
    return "imported";
  }
  return importStage({ ...item, archivedAt: null }) === "unknown" ? "unknown" : "importing";
}

/** Where an export stands, as its chip says it. Done says nothing: its count and file do. */
export type ExportStage = "writing" | "stopped" | "deleted" | "done" | "unknown";

export function exportStage(item: NonNullable<ActivityEntry["export"]>): ExportStage {
  switch (item.status as string) {
    case "exporting":
      return "writing";
    case "failed":
      return "stopped";
    case "expired":
      return "deleted";
    case "done":
      return "done";
    default:
      return "unknown";
  }
}

/**
 * What an export's row may claim. A file was written only when it is done or has since been
 * deleted; one still writing or stopped was never finished, and a stage this release does not
 * know claims neither.
 */
export function exportOutcome(
  item: NonNullable<ActivityEntry["export"]>,
): "exported" | "exporting" | "unknown" {
  const stage = exportStage(item);
  if (stage === "done" || stage === "deleted") return "exported";
  if (stage === "writing" || stage === "stopped") return "exporting";
  return "unknown";
}

/** The file format an export was written in, when this release knows it. */
export function exportFormat(item: NonNullable<ActivityEntry["export"]>): "lymi" | "anki" | null {
  const format = item.format as string;
  return format === "lymi" || format === "anki" ? format : null;
}

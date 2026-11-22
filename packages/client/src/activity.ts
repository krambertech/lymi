import type { ActivityEntry } from "./api";

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

export type ActivityMark = (typeof WHOLE_KINDS)[number] | (typeof VERBS)[number];

export function activityMark(kind: string): ActivityMark {
  const whole = WHOLE_KINDS.find((k) => k === kind);
  if (whole) return whole;
  const verb = kind.slice(kind.indexOf("_") + 1);
  return VERBS.find((v) => v === verb) ?? "edited";
}

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

export function namesCaller(entry: ActivityEntry): boolean {
  const kind = entry.kind as string;
  const named = kind.startsWith("member_") && kind !== "member_removed";
  const file = entry.import ?? entry.export;
  return !named && !(file && entry.actor === "user");
}

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

export function importOutcome(
  item: NonNullable<ActivityEntry["import"]>,
): "imported" | "importing" | "unknown" {
  const status = item.status as string;
  if (status === "done" || (status === "failed" && (item.counts?.added ?? 0) > 0)) {
    return "imported";
  }
  return importStage({ ...item, archivedAt: null }) === "unknown" ? "unknown" : "importing";
}

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

export function exportOutcome(
  item: NonNullable<ActivityEntry["export"]>,
): "exported" | "exporting" | "unknown" {
  const stage = exportStage(item);
  if (stage === "done" || stage === "deleted") return "exported";
  if (stage === "writing" || stage === "stopped") return "exporting";
  return "unknown";
}

export function exportFormat(item: NonNullable<ActivityEntry["export"]>): "lymi" | "anki" | null {
  const format = item.format as string;
  return format === "lymi" || format === "anki" ? format : null;
}

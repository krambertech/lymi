import type { AnalyticsProperties } from "@lymi/core/analytics";

// iOS's own entry points open the app by link, so a signed-out learner's is held through sign-in
// (`src/auth/held-link.ts`); `?from=` names the entry point. The controls and intents build the
// same links in `targets/controls/_shared/Intents.swift`.

export type EntryOpened = AnalyticsProperties<"entry_opened">;
export type Entry = EntryOpened["entry"];
export type Place = EntryOpened["place"];

const ROUTES: Record<Place, string> = { add: "/capture", review: "/review", search: "/search" };
const ENTRIES: readonly string[] = [
  "control",
  "shortcut",
  "quick_action",
  "widget",
] satisfies Entry[];

export function entryLink(place: Place, entry: Entry): string {
  return `lymi:/${ROUTES[place]}?from=${entry}`;
}

/** The entry point a screen was opened from, read from its route and its `from`. */
export function entryOf(pathname: string, from: unknown): EntryOpened | undefined {
  if (typeof from !== "string" || !ENTRIES.includes(from)) return undefined;
  const place = (Object.keys(ROUTES) as Place[]).find((p) => ROUTES[p] === pathname);
  return place && { entry: from as Entry, place };
}

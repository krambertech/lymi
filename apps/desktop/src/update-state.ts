import type { MacUpdate } from "@lymi/client/desktop";

/** What Squirrel's `autoUpdater` reports, by its event names. */
export type UpdateEvent =
  | "checking-for-update"
  | "update-not-available"
  | "update-available"
  | "update-downloaded"
  | "error";

/**
 * The app's own update after each `autoUpdater` event. A failed check or download leaves it
 * unknown, so This Mac stops saying it is downloading; a downloaded update stays ready, since
 * Squirrel installs it at the next quit whatever a later check says.
 */
export function updateAfter(
  state: MacUpdate | undefined,
  event: UpdateEvent,
): MacUpdate | undefined {
  if (state === "ready") return state;
  switch (event) {
    case "checking-for-update":
      return "checking";
    case "update-not-available":
      return "current";
    case "update-available":
      return "downloading";
    case "update-downloaded":
      return "ready";
    case "error":
      return undefined;
  }
}

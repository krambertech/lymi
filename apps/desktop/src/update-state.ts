import type { MacUpdate } from "@lymi/client/desktop";

export type UpdateEvent =
  | "checking-for-update"
  | "update-not-available"
  | "update-available"
  | "update-downloaded"
  | "error";

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

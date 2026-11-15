/**
 * Where a card sheet's form stands. A save in flight holds the sheet: closing it then would offer
 * Undo on work that is still being written, and an Undo could write it twice.
 */
export type SheetPhase = { status: "editing" } | { status: "saving" } | { status: "closed" };

export type SheetEvent =
  | { type: "open" }
  | { type: "save" }
  /** The save came back with the form still wanted: a failure, a skip or Create more. */
  | { type: "settle" }
  /** A dismissal, or the save closing the sheet once its card is in. */
  | { type: "close"; saved?: boolean };

export function sheetPhase(state: SheetPhase, event: SheetEvent): SheetPhase {
  switch (event.type) {
    case "open":
      return state.status === "closed" ? { status: "editing" } : state;
    case "save":
      return state.status === "editing" ? { status: "saving" } : state;
    case "settle":
      return state.status === "saving" ? { status: "editing" } : state;
    case "close":
      if (state.status === "saving") return event.saved ? { status: "closed" } : state;
      return { status: "closed" };
  }
}

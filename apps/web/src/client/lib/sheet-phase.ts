/**
 * Where a card sheet's form stands. The card write holds the sheet: closing it then would offer
 * Undo on work that is still being written, and an Undo could write it twice. The write gives up
 * on its own, so the hold always ends. The picture step after it has no such limit, so once the
 * card is in the sheet can close again, and with nothing to undo.
 */
export type SheetPhase =
  | { status: "editing" }
  | { status: "saving" }
  /** The card is in; its picture is still on the way. */
  | { status: "finishing" }
  | { status: "closed" };

export type SheetEvent =
  | { type: "open" }
  | { type: "save" }
  /** The card write came back; what follows it cannot write the card twice. */
  | { type: "written" }
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
    case "written":
      return state.status === "saving" ? { status: "finishing" } : state;
    case "settle":
      return state.status === "saving" || state.status === "finishing"
        ? { status: "editing" }
        : state;
    case "close":
      if (state.status === "saving") return event.saved ? { status: "closed" } : state;
      return { status: "closed" };
  }
}

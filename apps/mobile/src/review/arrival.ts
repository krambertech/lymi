/**
 * How the card on screen got there. Only Undo brings one back in place, revealed and still; every
 * other move puts a card on screen that slides in afresh.
 */
export type Arrival = { kind: "fresh" } | { kind: "returned" };

export type ArrivalEvent =
  | { type: "undo" }
  | { type: "moved"; by: "grade" | "kept" | "archive" | "restore" | "offer" };

export const FRESH: Arrival = { kind: "fresh" };

export function arrival(state: Arrival, event: ArrivalEvent): Arrival {
  switch (event.type) {
    case "undo":
      return { kind: "returned" };
    case "moved":
      return state.kind === "fresh" ? state : FRESH;
  }
}

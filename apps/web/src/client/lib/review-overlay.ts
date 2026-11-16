import type { Card } from "./api";

/**
 * What the review route opens over the card, one at a time, so the key handler checks one value
 * and an overlay added here is covered without touching it. The add sheet, the card's place and
 * the hint editor are held elsewhere, and the route folds them in beside this.
 */
export type ReviewOverlay =
  | { kind: "none" }
  | { kind: "menu" }
  | { kind: "edit"; card: Card }
  | { kind: "report" };

export type ReviewOverlayEvent =
  | { type: "open"; overlay: Exclude<ReviewOverlay, { kind: "none" }> }
  /** Closes the named overlay; one that has already given way to another stays. */
  | { type: "close"; kind: Exclude<ReviewOverlay["kind"], "none"> };

export const NO_OVERLAY: ReviewOverlay = { kind: "none" };

export function reviewOverlay(state: ReviewOverlay, event: ReviewOverlayEvent): ReviewOverlay {
  switch (event.type) {
    case "open":
      return event.overlay;
    case "close":
      return state.kind === event.kind ? NO_OVERLAY : state;
  }
}

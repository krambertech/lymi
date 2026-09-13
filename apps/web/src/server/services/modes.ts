import type { Directions, ReviewMode, ReviewModeKey } from "@lymi/core";
import {
  directionsFromModes,
  modeKey,
  modeOf,
  modeOfStateDirection,
  modesFromDirections,
} from "@lymi/core";
import type { Card } from "@lymi/core/schema";
import { ServiceError } from "./context";

/**
 * Review modes on the server, ADR 0014. During the expand phase the legacy `directions` columns
 * store a deck's and a card's modes, and `card_states.direction` stays the identity a grade finds.
 */

/** A state or review's mode, including rows an older Worker wrote without one. */
export function stateMode(row: { mode: ReviewModeKey | null; direction: string }): ReviewModeKey {
  return row.mode ?? modeOfStateDirection(row.direction);
}

/** A state or review row as the API shows it: its mode beside the legacy direction. */
export function presentModeRow<T extends { mode: ReviewModeKey | null; direction: string }>(
  row: T,
): Omit<T, "mode"> & { mode: ReviewMode } {
  return { ...row, mode: modeOf(stateMode(row)) };
}

/** How a deck asks the cards that follow it. */
export function deckModes(directions: Directions): ReviewMode[] {
  return modesFromDirections(directions).map(modeOf);
}

/** A card as the API shows it: its own modes, or null when it follows its deck. */
export function withModes<T extends Pick<Card, "directions">>(card: T) {
  return { ...card, reviewModes: card.directions ? deckModes(card.directions) : null };
}

export interface ModeInput {
  directions?: Directions | null | undefined;
  reviewModes?: ReviewMode[] | null | undefined;
}

/**
 * The legacy column a write stores, or undefined when it does not touch modes. `reviewModes`
 * and `directions` are two spellings of one setting, so sending both must agree.
 */
export function resolveDirections(input: ModeInput): Directions | null | undefined {
  const { directions, reviewModes } = input;
  if (reviewModes === undefined) return directions;
  const resolved = reviewModes === null ? null : directionsFromModes(reviewModes.map(modeKey));
  if (directions !== undefined && directions !== resolved) {
    throw new ServiceError("invalid", "directions and reviewModes disagree; send reviewModes only");
  }
  return resolved;
}

import type { Direction, Directions, ReviewMode, ReviewModeKey } from "./types";

/**
 * One conversion between the API's cue-target objects, the persisted mode keys and the legacy
 * directions. While the expand-and-contract migration runs, `card_states.direction` and
 * `reviews.direction` stay the identity and `mode` is written beside them. ADR 0014.
 */

export function modeKey(mode: ReviewMode): ReviewModeKey {
  return `${mode.cue}_to_${mode.target}` as ReviewModeKey;
}

export function modeOf(key: ReviewModeKey): ReviewMode {
  const [cue, target] = key.split("_to_");
  return { cue, target } as ReviewMode;
}

export function modesFromDirections(directions: Directions): ReviewModeKey[] {
  if (directions === "both") return ["term_to_meaning", "meaning_to_term"];
  return [directions === "recognition" ? "term_to_meaning" : "meaning_to_term"];
}

/** The legacy value for a mode list. */
export function directionsFromModes(keys: readonly ReviewModeKey[]): Directions {
  const recognition = keys.includes("term_to_meaning");
  const production = keys.includes("meaning_to_term");
  if (recognition && production) return "both";
  return production ? "production" : "recognition";
}

/** The value `card_states.direction` and `reviews.direction` hold for a mode. */
export function stateDirection(key: ReviewModeKey): Direction {
  return key === "meaning_to_term" ? "production" : "recognition";
}

/** The inverse of `stateDirection`, for rows written before `mode` existed. */
export function modeOfStateDirection(direction: string): ReviewModeKey {
  return direction === "production" ? "meaning_to_term" : "term_to_meaning";
}

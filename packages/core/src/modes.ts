import type { Direction, Directions, ReviewMode, ReviewModeKey } from "./types";

/**
 * One conversion between the API's cue-target objects, the persisted mode keys and the legacy
 * directions. While the expand-and-contract migration runs, the legacy `directions` columns stay
 * authoritative for text modes, because an older Worker writes only them; a card's `review_modes`
 * adds its order and picture modes. ADR 0014.
 */

export const TEXT_MODES = ["term_to_meaning", "meaning_to_term"] as const;
export const IMAGE_MODES = ["image_to_term", "image_to_meaning"] as const;
export type ImageModeKey = (typeof IMAGE_MODES)[number];

export function modeKey(mode: ReviewMode): ReviewModeKey {
  return `${mode.cue}_to_${mode.target}` as ReviewModeKey;
}

export function modeOf(key: ReviewModeKey): ReviewMode {
  const [cue, target] = key.split("_to_");
  return { cue, target } as ReviewMode;
}

export function isImageMode(key: string): key is ImageModeKey {
  return (IMAGE_MODES as readonly string[]).includes(key);
}

export function modesFromDirections(directions: Directions): ReviewModeKey[] {
  if (directions === "both") return ["term_to_meaning", "meaning_to_term"];
  return [directions === "recognition" ? "term_to_meaning" : "meaning_to_term"];
}

/** The text mode with the same target, which a card without a described picture is asked in. */
export function fallbackMode(key: ImageModeKey): ReviewModeKey {
  return key === "image_to_term" ? "meaning_to_term" : "term_to_meaning";
}

/** A list with no text mode of its own: its text modes stand in only for cards without a picture. */
export function isPictureOnly(keys: readonly ReviewModeKey[] | null): boolean {
  return !!keys && keys.length > 0 && keys.every(isImageMode);
}

/** The legacy value for a mode list. A picture-only list stores the fallbacks of its modes. */
export function directionsFromModes(keys: readonly ReviewModeKey[]): Directions {
  const own = keys.filter((key) => !isImageMode(key));
  const text = own.length > 0 ? own : keys.filter(isImageMode).map(fallbackMode);
  const recognition = text.includes("term_to_meaning");
  const production = text.includes("meaning_to_term");
  if (recognition && production) return "both";
  return production ? "production" : "recognition";
}

/**
 * The modes in force for a card with its own list: the text modes its legacy column says, in the
 * stored order, plus the stored picture modes, so a list an older Worker left stale heals on read.
 * A picture-only list stays as stored; its fallbacks are not modes of their own.
 */
export function effectiveModes(
  directions: Directions,
  stored: readonly ReviewModeKey[] | null,
): ReviewModeKey[] {
  if (isPictureOnly(stored)) return [...(stored as ReviewModeKey[])];
  const text = modesFromDirections(directions);
  if (!stored) return text;
  const modes = stored.filter((key) => isImageMode(key) || text.includes(key));
  for (const key of text) if (!modes.includes(key)) modes.push(key);
  return modes;
}

/**
 * The value `card_states.direction` and `reviews.direction` hold for a mode. Text modes keep
 * their legacy name so older rows and the legacy unique index still identify them; a picture
 * mode has no legacy name and stores its key.
 */
export function stateDirection(key: ReviewModeKey): string {
  if (key === "term_to_meaning") return "recognition";
  if (key === "meaning_to_term") return "production";
  return key;
}

/** The inverse of `stateDirection`, for rows written before `mode` existed. */
export function modeOfStateDirection(direction: string): ReviewModeKey {
  if (direction === "recognition") return "term_to_meaning";
  if (direction === "production") return "meaning_to_term";
  return direction as ReviewModeKey;
}

/** The legacy direction of a text mode, or null for a picture mode. */
export function legacyDirection(key: ReviewModeKey): Direction | null {
  if (key === "term_to_meaning") return "recognition";
  if (key === "meaning_to_term") return "production";
  return null;
}

import type { Direction, Directions, ReviewMode, ReviewModeKey } from "./types";

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

export function fallbackMode(key: ImageModeKey): ReviewModeKey {
  return key === "image_to_term" ? "meaning_to_term" : "term_to_meaning";
}

export function isPictureOnly(keys: readonly ReviewModeKey[] | null): boolean {
  return !!keys && keys.length > 0 && keys.every(isImageMode);
}

export function directionsFromModes(keys: readonly ReviewModeKey[]): Directions {
  const own = keys.filter((key) => !isImageMode(key));
  const text = own.length > 0 ? own : keys.filter(isImageMode).map(fallbackMode);
  const recognition = text.includes("term_to_meaning");
  const production = text.includes("meaning_to_term");
  if (recognition && production) return "both";
  return production ? "production" : "recognition";
}

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

export function introductionOrder(
  card: { directions: Directions | null; reviewModeKeys: readonly ReviewModeKey[] | null },
  deckDirections: Directions,
): ReviewModeKey[] {
  if (card.directions && card.reviewModeKeys) {
    return effectiveModes(card.directions, card.reviewModeKeys);
  }
  const directions = card.directions ?? deckDirections;
  if (directions === "both") return ["meaning_to_term", "term_to_meaning"];
  return [directions === "recognition" ? "term_to_meaning" : "meaning_to_term"];
}

export function askedModes(
  directions: Directions,
  stored: readonly ReviewModeKey[] | null,
  hasPicture: boolean,
): ReviewModeKey[] {
  const modes = effectiveModes(directions, stored);
  if (hasPicture) return modes;
  const text = modes.filter((key) => !isImageMode(key));
  return text.length > 0 ? text : modesFromDirections(directions);
}

export function stateDirection(key: ReviewModeKey): string {
  if (key === "term_to_meaning") return "recognition";
  if (key === "meaning_to_term") return "production";
  return key;
}

export function modeOfStateDirection(direction: string): ReviewModeKey {
  if (direction === "recognition") return "term_to_meaning";
  if (direction === "production") return "meaning_to_term";
  return direction as ReviewModeKey;
}

export function legacyDirection(key: ReviewModeKey): Direction | null {
  if (key === "term_to_meaning") return "recognition";
  if (key === "meaning_to_term") return "production";
  return null;
}

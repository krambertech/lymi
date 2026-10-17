// When review shows how to reveal a card, shared by the web and the phone. motion.md "Review".

/** Days with a review after which the account has shown it knows the card is the button. */
export const HINTED_REVIEW_DAYS = 3;
const FIRST_CARDS_MS = 1_000;
const IDLE_MS = 60_000;

/**
 * How long an unrevealed card waits before showing the hint, or null for none. Only a newer
 * account is hinted: soon on its first cards on this device, otherwise once the card sits idle.
 * An unknown history shows nothing, so a long-time learner never sees it flash in.
 */
export function revealHintDelayMs(
  reviewedDays: number | undefined,
  firstCards: boolean,
): number | null {
  if (reviewedDays === undefined || reviewedDays >= HINTED_REVIEW_DAYS) return null;
  return firstCards ? FIRST_CARDS_MS : IDLE_MS;
}

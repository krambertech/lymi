import type { MessageDescriptor } from "@lingui/core";
import { msg, plural } from "@lingui/core/macro";

/**
 * The wait a metered credential endpoint reports. `retryAfter` is the seconds this Worker
 * puts on its own 429 body; anything else is a failure the learner cannot time.
 */
export function minutesUntilRetry(error: unknown): number | null {
  const seconds = (error as { retryAfter?: unknown } | null)?.retryAfter;
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) return null;
  return Math.max(1, Math.ceil(seconds / 60));
}

export function tooManyAttempts(minutes: number | null): MessageDescriptor {
  if (minutes === null) return msg`Too many attempts. Try again later.`;
  return msg`Too many attempts. Try again in ${plural(minutes, { one: "# minute", other: "# minutes" })}.`;
}

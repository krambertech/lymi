import { localDate } from "@lymi/core";

/** Calendar arithmetic on learner-local dates. Everything stored is UTC; a day is a zone's date. */

const DAY_MS = 86_400_000;

/**
 * Resolves an instant to its local YYYY-MM-DD through the one implementation in core, so a
 * grade's review day and the draw's day window can never disagree about the date.
 */
export function dateFormatter(zone: string): LocalDateFormatter {
  return { format: (instant) => localDate(instant, zone) };
}

export interface LocalDateFormatter {
  format: (instant: Date) => string;
}

/** Calendar arithmetic on a YYYY-MM-DD, which no timezone can shift. */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + n)).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`, both local dates. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

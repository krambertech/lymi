/** Calendar arithmetic on learner-local dates. Everything stored is UTC; a day is a zone's date. */

const DAY_MS = 86_400_000;

/** Resolves an instant to its local calendar date. Falls back to UTC for an unknown zone. */
export function dateFormatter(zone: string): Intl.DateTimeFormat {
  try {
    // en-CA formats as YYYY-MM-DD, which is the shape every caller here wants.
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }
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

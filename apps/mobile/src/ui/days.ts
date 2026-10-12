const NARROW = new Intl.DateTimeFormat(undefined, { weekday: "narrow", timeZone: "UTC" });

/** Calendar arithmetic on a review-local YYYY-MM-DD, which no timezone can shift. */
export function addDays(date: string, days: number): string {
  const [y = 0, m = 1, d = 1] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** The narrow weekday of each review-local YYYY-MM-DD, so it is the account's day, not the phone's; an unknown date is blank. */
export function weekLetters(dates: readonly string[]): string[] {
  return dates.map((date) => (date ? NARROW.format(new Date(`${date}T00:00:00Z`)) : ""));
}

/** The seven days ending `today`, oldest first; blank while today is unknown. */
export function lastSevenDays(today: string | undefined): string[] {
  return Array.from({ length: 7 }, (_, i) => (today ? addDays(today, i - 6) : ""));
}

/** This phone's own calendar date, for when no learner's review day is known. */
export function deviceDate(now = new Date()): string {
  return addDays(`${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`, 0);
}

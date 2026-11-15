/** Calendar arithmetic on a review-local YYYY-MM-DD, which no timezone can shift. */
export function addDays(date: string, days: number): string {
  const [y = 0, m = 1, d = 1] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** A review-local YYYY-MM moved by whole months. */
function addMonths(month: string, months: number): string {
  const [y = 0, m = 1] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + months, 1)).toISOString().slice(0, 7);
}

/** Each month from `first` to `last`, oldest first; only `last` when `first` is not before it. */
export function monthsFrom(first: string, last: string): string[] {
  const months = [last];
  while ((months[0] ?? first) > first) months.unshift(addMonths(months[0] ?? first, -1));
  return months;
}

/** A YYYY-MM as its Monday-first weeks of dates, with `null` in the slots outside the month. */
export function monthWeeks(month: string): (string | null)[][] {
  const [y = 0, m = 1] = month.split("-").map(Number);
  const first = `${month}-01`;
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const length = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length }, (_, n) => addDays(first, n)),
  ];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

/** The narrow weekday of each review-local YYYY-MM-DD in the app's language, so it is the account's day, not the phone's; an unknown date is blank. */
export function weekLetters(dates: readonly string[], locale?: string): string[] {
  const narrow = new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" });
  return dates.map((date) => (date ? narrow.format(new Date(`${date}T00:00:00Z`)) : ""));
}

/** The seven days ending `today`, oldest first; blank while today is unknown. */
export function lastSevenDays(today: string | undefined): string[] {
  return Array.from({ length: 7 }, (_, i) => (today ? addDays(today, i - 6) : ""));
}

/** This phone's own calendar date, for when no learner's review day is known. */
export function deviceDate(now = new Date()): string {
  return addDays(`${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`, 0);
}

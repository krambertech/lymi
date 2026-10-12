import { dayWindow } from "@lymi/core";

// When the daily reminder fires, worked out on the phone so it holds without a connection. #510.

/** Days scheduled ahead, so a learner who stays away still hears from Lymi for a week. */
export const DAYS_AHEAD = 7;

export interface ReminderInput {
  /** The reminder's local time, `HH:MM`, on the phone's own clock. */
  time: string;
  now: Date;
  /** The learner's review zone, which decides which review day a reminder falls on. */
  zone: string;
  /** Cards still due today, as Today shows them. */
  left: number;
  /** Today already counts: the goal is met or nothing was left to review. */
  dayDone: boolean;
  /** Cards that fall due on each review day, by date; see `forecastFrom`. */
  forecast?: ReadonlyMap<string, number> | undefined;
  /** Until when the learner put today's reminder off, from its In an hour action. */
  snoozedUntil?: Date | undefined;
}

export interface PlannedReminder {
  at: Date;
  due: number;
}

function atTime(day: Date, time: string, offset: number): Date {
  const [hour = 19, minute = 0] = time.split(":").map(Number);
  const at = new Date(day);
  at.setDate(at.getDate() + offset);
  at.setHours(hour, minute, 0, 0);
  return at;
}

/** Calendar arithmetic on a local YYYY-MM-DD, which no timezone can shift. */
function addDays(date: string, days: number): string {
  const [y = 0, m = 1, d = 1] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * One reminder a day at the phone's own time, while something is due and the review day it falls
 * on is still open. Each reminder counts by that review day, which can differ from the phone's
 * date when the review zone does: what is left today, plus what falls due by then, since a learner
 * who does not open the app reviews none of it. The next launch plans again from the real numbers.
 */
export function planReminders({
  time,
  now,
  zone,
  left,
  dayDone,
  forecast,
  snoozedUntil,
}: ReminderInput): PlannedReminder[] {
  const today = dayWindow(now, zone).date;
  const planned: PlannedReminder[] = [];
  const snoozed = snoozedUntil && snoozedUntil > now ? snoozedUntil : undefined;
  // One more phone day than the week, so a zone running behind the phone still fills it.
  for (let offset = 0; offset <= DAYS_AHEAD; offset++) {
    const candidate = atTime(now, time, offset);
    const date = dayWindow(candidate, zone).date;
    if (date < today) continue;
    if (date === today) {
      if (dayDone || left < 1) continue;
      const at = snoozed ?? candidate;
      if (at > now) planned.push({ at, due: left });
      continue;
    }
    let due = left;
    // Without a forecast, later days know only what today leaves behind.
    for (let d = addDays(today, 1); d <= date; d = addDays(d, 1)) due += forecast?.get(d) ?? 0;
    if (due > 0) planned.push({ at: candidate, due });
    if (planned.length === DAYS_AHEAD) break;
  }
  return planned;
}

/**
 * Insights' forecast by review date, or nothing when it does not start on the learner's `today`:
 * a forecast fetched on an earlier day still counts work since done, so the plan falls back to
 * what today leaves rather than remind about it.
 */
export function forecastFrom(
  buckets: readonly { date: string; count: number }[] | undefined,
  today: string | undefined,
): Map<string, number> | undefined {
  if (!buckets || !today || buckets[0]?.date !== today) return undefined;
  return new Map(buckets.map((b) => [b.date, b.count]));
}

/**
 * What the server has of today's grades: those it took in and those taken back. Tomorrow's
 * forecast moves whenever this does, including an Undo that leaves none, while a grade still
 * queued offline changes nothing until it lands.
 */
export function gradeRevision(
  grades: readonly {
    cardId: string;
    reviewedAt: string;
    sentAt?: number | undefined;
    undone?: boolean | undefined;
  }[],
): string {
  return grades
    .filter((g) => g.sentAt !== undefined || g.undone)
    .map((g) => `${g.cardId}@${g.reviewedAt}${g.undone ? "-" : "+"}`)
    .join(" ");
}

/** Picks one of `count` lines by the day, so the wording changes from one day to the next. */
export function lineFor(at: Date, count: number): number {
  const day = Math.floor(
    Date.UTC(at.getFullYear(), at.getMonth(), at.getDate()) / (24 * 60 * 60 * 1000),
  );
  return day % count;
}

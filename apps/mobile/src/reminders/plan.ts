// When the daily reminder fires, worked out on the phone so it holds without a connection. #510.

/** Days scheduled ahead, so a learner who stays away still hears from Lymi for a week. */
export const DAYS_AHEAD = 7;

export interface ReminderInput {
  /** The reminder's local time, `HH:MM`. */
  time: string;
  now: Date;
  /** Cards today's draw still holds. */
  left: number;
  /** Today already counts: the goal is met or nothing was left to review. */
  dayDone: boolean;
  /** Cards that fall due on each day from today, as Insights forecasts them; today's first. */
  forecast?: readonly number[] | undefined;
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

/**
 * One reminder a day while something is due and the day is still open. Later days count what is
 * left today plus what falls due by then, since a learner who does not open the app reviews none
 * of it; the next launch plans again from the real numbers.
 */
export function planReminders({
  time,
  now,
  left,
  dayDone,
  forecast,
  snoozedUntil,
}: ReminderInput): PlannedReminder[] {
  const planned: PlannedReminder[] = [];
  let due = left;
  for (let offset = 0; offset < DAYS_AHEAD; offset++) {
    if (offset > 0) {
      // Without a forecast, later days know only what today leaves behind.
      due += forecast?.[offset] ?? 0;
    }
    if (due < 1) continue;
    if (offset === 0) {
      if (dayDone) continue;
      const at = snoozedUntil && snoozedUntil > now ? snoozedUntil : atTime(now, time, 0);
      if (at > now) planned.push({ at, due });
      continue;
    }
    planned.push({ at: atTime(now, time, offset), due });
  }
  return planned;
}

/** Picks one of `count` lines by the day, so the wording changes from one day to the next. */
export function lineFor(at: Date, count: number): number {
  const day = Math.floor(
    Date.UTC(at.getFullYear(), at.getMonth(), at.getDate()) / (24 * 60 * 60 * 1000),
  );
  return day % count;
}

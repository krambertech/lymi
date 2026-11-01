import { z } from "zod";
import { type StreakDay, summariseStreak } from "./streak";

/** Which of the day's messages a reminder carried, for the analytics and nothing the learner sees. */
export const ReminderMessage = z.enum(["ready", "to_goal", "after_rest", "next_cards"]);
export type ReminderMessage = z.infer<typeof ReminderMessage>;

/** Days without opening Lymi after which reminders stop until the learner returns. */
export const QUIET_AFTER_DAYS = 7;

const previousDay = (date: string) => {
  const [y = 1970, m = 1, d = 1] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
};

export interface ReminderDay {
  /** The review day the reminder falls on. */
  date: string;
  /** Every day that had an attempt or a nothing-due confirmation, oldest first. */
  days: readonly StreakDay[];
  /** Cards the learner can review on that day. */
  due: number;
  /** The goal the day will be measured against, when it has no row yet. */
  goal: number;
}

export interface Reminder {
  message: ReminderMessage;
  /** The number the message names. */
  count: number;
}

/**
 * The one reminder a day, chosen by how the day went, or null when it should stay silent. A phone
 * asks about days still to come, which it reads as days the learner stays away. docs/review.md.
 */
export function reminderFor({ date, days, due, goal }: ReminderDay): Reminder | null {
  const day = days.find((d) => d.date === date);
  const attempts = day?.attempts ?? 0;
  const dayGoal = day?.goal ?? goal;
  if (due < 1 || day?.satisfied || attempts >= dayGoal) return null;
  // Fewer cards than the goal asks for still finish the day, so the smaller number is the true one.
  if (attempts > 0) return { message: "to_goal", count: Math.min(dayGoal - attempts, due) };

  const yesterday = previousDay(date);
  // An ended run has no rest day behind it, so a streak that ended is never mentioned.
  if (summariseStreak([...days], date).restDays.includes(yesterday)) {
    return { message: "after_rest", count: due };
  }
  // Nothing graded on a first review is due the next day, so only "next" is true then.
  if (days.find((d) => d.attempts > 0)?.date === yesterday) {
    return { message: "next_cards", count: due };
  }
  return { message: "ready", count: due };
}

/** Whether the learner has stayed away long enough that reminders stop. */
export function remindersQuiet(lastOpened: Date, now: Date): boolean {
  return now.getTime() - lastOpened.getTime() >= QUIET_AFTER_DAYS * 24 * 60 * 60 * 1000;
}

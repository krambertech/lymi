import type { Rating, ReminderTime } from "@lymi/core";

const DAY = 86_400_000;

export function comesBackIn(rating: Rating, next: string | Date, dayEnd: Date): number {
  if (rating === 1) return 0;
  return Math.max(1, Math.floor((new Date(next).getTime() - dayEnd.getTime()) / DAY) + 1);
}

export interface NextCards {
  days: number;
  count: number;
  date: string;
}

export function nextCards(
  forecast: readonly { date: string; count: number }[] | undefined,
  goal: number,
): NextCards | undefined {
  if (!forecast) return undefined;
  const tomorrow = forecast[1];
  const waiting = (forecast[0]?.count ?? 0) + (tomorrow?.count ?? 0);
  if (tomorrow && waiting > 0)
    return { days: 1, count: Math.min(waiting, goal), date: tomorrow.date };
  const days = forecast.findIndex((day, i) => i > 1 && day.count > 0);
  const day = forecast[days];
  return day ? { days, count: Math.min(day.count, goal), date: day.date } : undefined;
}

export type DayPart = "morning" | "lunch" | "evening";

const pad = (n: number) => String(n).padStart(2, "0");

export function reminderChoices(now: Date): {
  part: DayPart;
  times: Record<DayPart, ReminderTime>;
} {
  const hour = now.getHours();
  if (hour < 6 || hour >= 23)
    return { part: "evening", times: { morning: "08:00", lunch: "12:30", evening: "19:00" } };
  const part: DayPart = hour < 11 ? "morning" : hour < 16 ? "lunch" : "evening";
  const here = `${pad(hour)}:${pad(Math.floor(now.getMinutes() / 15) * 15)}` as ReminderTime;
  return {
    part,
    times: { morning: "08:00", lunch: "12:30", evening: "19:00", [part]: here },
  };
}

import type { StreakSummary } from "../components/streak";

/** Until the first review, Today is the first-run guide. False while the streak is unread. */
export function isGuiding(streak: StreakSummary | undefined): boolean {
  return !!streak && streak.reviewedDays === 0 && streak.today.attempts === 0;
}

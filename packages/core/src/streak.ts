/**
 * The streak, derived from review counts per day. The array is one count per day, oldest
 * first, today last, as `GET /api/review/history` returns it.
 *
 * Today counts once it has a review and is otherwise skipped, so an unreviewed morning shows
 * yesterday's streak instead of zero. A day is broken only after it ends.
 */
export function streakLength(days: number[]): number {
  let i = days.length - 1;
  if (days[i] === 0) i -= 1; // today is still open
  let run = 0;
  for (; i >= 0 && (days[i] ?? 0) > 0; i -= 1) run += 1;
  return run;
}

/** The longest run of reviewed days anywhere in the window. */
export function bestStreak(days: number[]): number {
  let best = 0;
  let run = 0;
  for (const n of days) {
    run = n > 0 ? run + 1 : 0;
    if (run > best) best = run;
  }
  return best;
}

/** How many of the last `n` days had a review. Reads under the seven lights. */
export function daysReviewed(days: number[], n = 7): number {
  return days.slice(-n).filter((c) => c > 0).length;
}

import type { StoredGrade } from "@lymi/client/grades";
import type { DrawData } from "@lymi/client/review-draw";

/** How long after a grade was sent a fetched draw must hold it; before that the read may have started first. */
const SENT_SETTLES = 60_000;

/**
 * This device's grades less any the server accepted and has since dropped, as a reset does: a draw
 * read well after the send that lacks the grade is the truth, or the phone would count it forever.
 * The read's own `fetchedAt` dates it, not the cache's update time, which a card write moves while
 * the log stays the old read's.
 */
export function withoutDropped(
  grades: readonly StoredGrade[],
  data: (DrawData & { fetchedAt: number }) | undefined,
): readonly StoredGrade[] {
  if (!data) return grades;
  const { fetchedAt } = data;
  const held = new Set(data.log.map((e) => `${e.cardId}|${new Date(e.at).getTime()}`));
  const kept = grades.filter(
    (g) =>
      g.sentAt === undefined ||
      g.undone ||
      fetchedAt - g.sentAt < SENT_SETTLES ||
      held.has(`${g.cardId}|${new Date(g.reviewedAt).getTime()}`),
  );
  return kept.length === grades.length ? grades : kept;
}

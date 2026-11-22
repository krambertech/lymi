import type { StoredGrade } from "./grades";
import type { DrawData } from "./review-draw";

const SENT_SETTLES = 60_000;

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

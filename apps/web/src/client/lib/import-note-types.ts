/** Note types that together hold this share of the notes are asked about one by one. */
const ASKED_SHARE = 0.95;

/**
 * Splits a file's note types into the ones the learner checks card by card and a tail of rare
 * ones, biggest first. A collection with fifteen note types, most holding a handful of notes,
 * should not ask fifteen questions. A tail of one is not worth folding away.
 */
export function splitNoteTypes<T extends { notes: number }>(types: readonly T[]) {
  const ordered = [...types].sort((a, b) => b.notes - a.notes);
  const total = ordered.reduce((sum, type) => sum + type.notes, 0);
  let covered = 0;
  let cut = 0;
  while (cut < ordered.length && (cut === 0 || covered < total * ASKED_SHARE)) {
    covered += ordered[cut]?.notes ?? 0;
    cut++;
  }
  if (ordered.length - cut < 2) return { asked: ordered, rest: [] as T[] };
  return { asked: ordered.slice(0, cut), rest: ordered.slice(cut) };
}

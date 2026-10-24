const LONGEST = 120;

/** What a copy of the selection gives the panel as a term: one short line, or nothing. */
export function termFromCopy(text: string): string | null {
  const trimmed = text.trim();
  // A paragraph is not a term; the learner still has the panel to type one.
  if (!trimmed || trimmed.includes("\n")) return null;
  const term = trimmed.replace(/\s+/g, " ");
  return term.length <= LONGEST ? term : null;
}

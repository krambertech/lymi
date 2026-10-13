/**
 * A text setting's draft as its sheet opens. A clean draft, one that matches what was last saved,
 * takes the deck's current value, which another device may have changed since; an edit not yet
 * saved stays as typed. `saved` is the dedupe baseline the commit compares against.
 */
export function openDraft(
  draft: string,
  saved: string | null,
  current: string | null,
): { draft: string; saved: string | null } {
  const clean = (draft.trim() || null) === saved;
  return clean ? { draft: current ?? "", saved: current } : { draft, saved };
}

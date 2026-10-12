import type { Series } from "@lymi/client/api";

/** How Undo puts a moved deck back. */
export type MoveBack =
  | { kind: "order"; series: Series; deckIds: string[] }
  | { kind: "move"; seriesId: string | null };

/**
 * Undo of a deck's move, as the web's: back into its old series in the place it left, by setting
 * that series' order as it was; or, for a deck that had no series, out of the one it joined.
 * `series` is the list as it stood before the move. Undefined while that list has not loaded, so
 * the move waits rather than lose the place; a loaded list without the old series, which has gone,
 * has no place to keep, so the deck moves back by id.
 */
export function moveBack(
  from: string | null,
  series: readonly Series[] | undefined,
): MoveBack | undefined {
  if (!from) return { kind: "move", seriesId: null };
  if (!series) return undefined;
  const old = series.find((s) => s.id === from);
  return old
    ? { kind: "order", series: old, deckIds: [...old.deckIds] }
    : { kind: "move", seriesId: from };
}

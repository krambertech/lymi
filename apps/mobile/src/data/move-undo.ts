import type { Series } from "@lymi/client/api";

/** How Undo puts a moved deck back. */
export type MoveBack =
  | { kind: "order"; series: Series; deckIds: string[] }
  | { kind: "move"; seriesId: string | null };

/**
 * Undo of a deck's move, as the web's: back into its old series in the place it left, by setting
 * that series' order as it was; or, for a deck that had no series, out of the one it joined.
 * `series` is the list as it stood before the move.
 */
export function moveBack(from: string | null, series: readonly Series[] | undefined): MoveBack {
  const old = from ? series?.find((s) => s.id === from) : undefined;
  return old
    ? { kind: "order", series: old, deckIds: [...old.deckIds] }
    : { kind: "move", seriesId: from };
}

import type { Section } from "@lymi/client/api";
import { type DeckFilters, type DeckRow, filterRows } from "@lymi/client/deck-list";
import { drawQuery } from "@lymi/client/queries";
import { drawableLeft } from "@lymi/client/review-day";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useDrawState } from "../data/queries";

const NO_IDS: readonly string[] = [];

/** The ids of the cards a deck's filters keep, which a filtered review draws from. */
export function filteredIds(
  rows: DeckRow[],
  filters: DeckFilters,
  sections: readonly Section[],
): string[] {
  return filterRows(rows, filters, "", Date.now(), sections).map((r) => r.card.id);
}

/**
 * How many of these cards the review would draw now, as Review counts a deck's: due, returning or
 * new to the draw, less what this device has graded since. Undefined until the draw arrives.
 */
export function useFilteredDue(deckId: string, ids: readonly string[] | null): number | undefined {
  const scope = useMemo(() => ({ deck: deckId, cards: ids ?? NO_IDS }), [deckId, ids]);
  const draw = useQuery({ ...drawQuery(scope), enabled: !!ids && ids.length > 0 });
  const { state } = useDrawState(scope, draw.data, 0, draw.dataUpdatedAt || undefined);
  if (ids && ids.length === 0) return 0;
  return draw.data && state ? drawableLeft(draw.data, state, deckId) : undefined;
}

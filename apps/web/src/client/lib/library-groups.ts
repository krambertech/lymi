/** The fields grouping reads, so Library, Today and the rail can pass whatever deck shape they hold. */
interface GroupableDeck {
  id: string;
  seriesId: string | null;
}

interface GroupableSeries {
  id: string;
  deckIds: string[];
}

export interface DeckGroups<D, S> {
  /** Decks without a series, in Library order: every joined deck lands here. */
  loose: D[];
  series: { series: S; decks: D[] }[];
}

/**
 * Decks as Library shows them: the ones without a series first, then each series with its decks
 * in the series' order. A deck whose series the list does not hold yet stays loose, so a stale
 * series list never hides a deck.
 */
export function groupDecks<D extends GroupableDeck, S extends GroupableSeries>(
  decks: readonly D[],
  series: readonly S[] | undefined,
): DeckGroups<D, S> {
  const byId = new Map(decks.map((deck) => [deck.id, deck]));
  const known = new Set((series ?? []).map((s) => s.id));
  const placed = new Set<string>();
  const groups = (series ?? []).map((s) => ({
    series: s,
    decks: s.deckIds.flatMap((id) => {
      const deck = byId.get(id);
      if (!deck || deck.seriesId !== s.id || placed.has(id)) return [];
      placed.add(id);
      return [deck];
    }),
  }));
  // A deck the series list has not caught up with goes last in its series rather than loose.
  for (const deck of decks) {
    if (placed.has(deck.id) || !deck.seriesId || !known.has(deck.seriesId)) continue;
    groups.find((g) => g.series.id === deck.seriesId)?.decks.push(deck);
    placed.add(deck.id);
  }
  return { loose: decks.filter((deck) => !placed.has(deck.id)), series: groups };
}

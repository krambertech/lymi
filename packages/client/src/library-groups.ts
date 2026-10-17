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

const SERIES_PREFIX = /^\s*[·•:|/\-–—]\s*(\S.*)$/u;

/**
 * A deck's name as its series shows it: "Eesti A1 · Words" in Eesti A1 reads "Words". Only a name
 * that repeats the series' name and then a separator loses it, so "Eesti A1 Words" stays whole.
 */
export function nameInSeries(name: string, seriesName: string): string {
  const prefix = seriesName.trim();
  if (!prefix || name.length <= prefix.length) return name;
  if (name.slice(0, prefix.length).toLocaleLowerCase() !== prefix.toLocaleLowerCase()) return name;
  return name.slice(prefix.length).match(SERIES_PREFIX)?.[1] ?? name;
}

/**
 * What a series form shows. A route with an id renames that series; without one it makes a new one.
 * The mode comes from the route, never from whether the list has arrived, so a cold rename waits
 * for its series rather than starting a blank create.
 */
export type SeriesForm<S> =
  | { mode: "create" }
  | { mode: "loading" }
  | { mode: "missing" }
  | { mode: "rename"; series: S };

export function seriesForm<S extends GroupableSeries>(
  id: string | undefined,
  series: readonly S[] | undefined,
): SeriesForm<S> {
  if (!id) return { mode: "create" };
  if (!series) return { mode: "loading" };
  const found = series.find((s) => s.id === id);
  return found ? { mode: "rename", series: found } : { mode: "missing" };
}

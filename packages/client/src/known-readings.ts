import { type KnownReadings, knownReadings } from "@lymi/core";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { useCallback, useSyncExternalStore } from "react";
import type { DeckSummary } from "./api";
import { type DeckRow, rowState } from "./deck-list";
import { decksQuery } from "./queries";

const NONE: KnownReadings = new Set();

/** One deck's pairs, kept while its cached rows are the same rows. */
const perDeck = new WeakMap<readonly DeckRow[], KnownReadings>();
const latest = new WeakMap<QueryClient, { lists: readonly DeckRow[][]; known: KnownReadings }>();

function deckPairs(rows: readonly DeckRow[]): KnownReadings {
  let pairs = perDeck.get(rows);
  if (!pairs) {
    pairs = knownReadings(rows.map((row) => ({ ...row.card, known: rowState(row) === "known" })));
    perDeck.set(rows, pairs);
  }
  return pairs;
}

/**
 * The learner's Known pairs across every deck they study, shared decks included, read from the
 * deck card lists the cache already holds, so it costs no request and works offline. A deck whose
 * cards are not cached yet adds nothing until they are. The set is the same object until a list changes.
 */
export function cachedKnownReadings(qc: QueryClient): KnownReadings {
  const decks = qc.getQueryData<DeckSummary[]>(decksQuery.queryKey);
  const studied = decks && new Set(decks.map((deck) => deck.id));
  const lists = qc
    .getQueryCache()
    .findAll({ queryKey: ["decks"] })
    .filter(
      ({ queryKey: [, id, part], state }) =>
        part === "cards" &&
        typeof id === "string" &&
        (!studied || studied.has(id)) &&
        Array.isArray(state.data),
    )
    .map(({ state }) => state.data as DeckRow[]);
  const last = latest.get(qc);
  if (last && last.lists.length === lists.length && last.lists.every((l, i) => l === lists[i])) {
    return last.known;
  }
  const known = new Set<string>();
  for (const rows of lists) for (const pair of deckPairs(rows)) known.add(pair);
  const result = known.size ? known : NONE;
  latest.set(qc, { lists, known: result });
  return result;
}

/** `cachedKnownReadings`, kept current as the deck lists in the cache change. */
export function useKnownReadings(): KnownReadings {
  const qc = useQueryClient();
  const subscribe = useCallback(
    (listener: () => void) => qc.getQueryCache().subscribe(listener),
    [qc],
  );
  const snapshot = useCallback(() => cachedKnownReadings(qc), [qc]);
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

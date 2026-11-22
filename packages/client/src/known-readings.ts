import { exampleReadings, type KnownReadings, modeKey, readingPairs } from "@lymi/core";
import { notifyManager, type QueryClient, useQueryClient } from "@tanstack/react-query";
import { useCallback, useSyncExternalStore } from "react";
import type { DeckSummary } from "./api";
import { type DeckRow, rowState } from "./deck-list";
import { gradeStore, type StoredGrade } from "./grades";
import { deckCardsQuery, decksQuery } from "./queries";

export interface KnownReadingsState {
  known: KnownReadings;
  complete: boolean;
}

type Entry = { row: DeckRow; pairs: string[] };

const perDeck = new WeakMap<readonly DeckRow[], Entry[]>();
const latest = new WeakMap<
  QueryClient,
  {
    lists: readonly (readonly DeckRow[])[];
    grades: readonly StoredGrade[];
    complete: boolean;
    state: KnownReadingsState;
  }
>();

function entries(rows: readonly DeckRow[]): Entry[] {
  let found = perDeck.get(rows);
  if (!found) {
    found = rows.flatMap((row) => {
      const pairs = readingPairs(row.card);
      return pairs.length ? [{ row, pairs }] : [];
    });
    perDeck.set(rows, found);
  }
  return found;
}

const gradeKey = (cardId: string, mode: string) => `${cardId} ${mode}`;

function knownAfter(row: DeckRow, graded: ReadonlyMap<string, StoredGrade>): boolean {
  const mode = row.state ? modeKey(row.state.mode) : null;
  const grade = mode
    ? graded.get(gradeKey(row.card.id, mode))
    : graded.get(gradeKey(row.card.id, "any"));
  const lastReview = row.state?.lastReview ? new Date(row.state.lastReview).getTime() : 0;
  if (!grade || new Date(grade.reviewedAt).getTime() <= lastReview)
    return rowState(row) === "known";
  if (grade.rating === 1) return false;
  return grade.stateAfter === undefined ? rowState(row) === "known" : grade.stateAfter === 2;
}

const same = (a: KnownReadings, b: KnownReadings) =>
  a.size === b.size && [...a].every((pair) => b.has(pair));

export function cachedKnownReadings(qc: QueryClient): KnownReadingsState {
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
  const complete =
    !!decks &&
    decks.every((deck) => Array.isArray(qc.getQueryData(deckCardsQuery(deck.id).queryKey)));
  const grades = gradeStore.snapshot();
  const last = latest.get(qc);
  if (
    last &&
    last.grades === grades &&
    last.complete === complete &&
    last.lists.length === lists.length &&
    last.lists.every((list, i) => list === lists[i])
  ) {
    return last.state;
  }
  const graded = new Map<string, StoredGrade>();
  for (const grade of grades) {
    if (grade.undone) continue;
    for (const key of [
      gradeKey(grade.cardId, modeKey(grade.mode)),
      gradeKey(grade.cardId, "any"),
    ]) {
      const before = graded.get(key);
      if (!before || before.reviewedAt <= grade.reviewedAt) graded.set(key, grade);
    }
  }
  const known = new Set<string>();
  for (const rows of lists) {
    for (const { row, pairs } of entries(rows)) {
      if (knownAfter(row, graded)) for (const pair of pairs) known.add(pair);
    }
  }
  const state =
    last && last.state.complete === complete && same(last.state.known, known)
      ? last.state
      : { known, complete };
  latest.set(qc, { lists, grades, complete, state });
  return state;
}

export function useKnownReadings(): KnownReadings {
  const qc = useQueryClient();
  const subscribe = useCallback(
    (listener: () => void) => {
      const cache = qc.getQueryCache().subscribe(notifyManager.batchCalls(listener));
      const grades = gradeStore.subscribe(listener);
      return () => {
        cache();
        grades();
      };
    },
    [qc],
  );
  const snapshot = useCallback(() => cachedKnownReadings(qc).known, [qc]);
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function readingsFadedField(
  qc: QueryClient,
  card: { example?: string | null | undefined; language?: string | null | undefined },
): { readingsFaded?: number } {
  const { known, complete } = cachedKnownReadings(qc);
  const counts = exampleReadings(card.example, card.language, known);
  return complete && counts.readings ? { readingsFaded: counts.known } : {};
}

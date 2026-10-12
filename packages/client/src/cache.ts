import {
  type DehydratedState,
  defaultShouldDehydrateQuery,
  onlineManager,
  type Query,
  type QueryClient,
} from "@tanstack/react-query";
import { deckCardsQuery, drawQuery, sectionsQuery } from "./queries";

/** Which queries the kept cache holds: no Blob, which JSON loses, and no read with `meta.persist: false`, which a query only ever filled by setQueryData lacks. */
export function shouldPersistQuery(query: Query): boolean {
  return defaultShouldDehydrateQuery(query) && keepable(query);
}

const keepable = (query: Query) =>
  query.meta?.persist !== false &&
  !(typeof Blob !== "undefined" && query.state.data instanceof Blob);

/**
 * What a client that sends every offline write through the outboxes keeps: every read that has
 * data, including one whose last refresh failed, so a failed refresh never replaces the last good
 * copy on disk; and no mutation, because a paused one restored after a quit has no function to run
 * and would only hold its variables. Pair it with `asLastGood` when writing.
 */
export const outboxDehydrateOptions = {
  shouldDehydrateQuery: (query: Query) => query.state.data !== undefined && keepable(query),
  shouldDehydrateMutation: () => false,
};

/** Writes a read whose last refresh failed as the success it last was, so a kept copy never opens as an error. */
export function asLastGood(state: DehydratedState): DehydratedState {
  return {
    ...state,
    queries: state.queries.map((query) =>
      query.state.status === "error" && query.state.data !== undefined
        ? {
            ...query,
            state: {
              ...query.state,
              status: "success",
              error: null,
              fetchFailureCount: 0,
              fetchFailureReason: null,
            },
          }
        : query,
    ),
  };
}

/**
 * Fetches, while online, what every deck's screen and review need and the cache does not hold
 * yet, so a deck first opened offline still has its cards. One at a time, so it never competes
 * with what the learner is doing.
 */
export async function warmCache(qc: QueryClient, deckIds: readonly string[], signal?: AbortSignal) {
  const fetch = <T extends { queryKey: readonly unknown[] }>(
    query: T,
    run: () => Promise<void>,
  ) => ({ key: query.queryKey, run });
  const wanted = [
    fetch(drawQuery({}), () => qc.prefetchQuery(drawQuery({}))),
    ...deckIds.flatMap((deck) => [
      fetch(deckCardsQuery(deck), () => qc.prefetchQuery(deckCardsQuery(deck))),
      fetch(sectionsQuery(deck), () => qc.prefetchQuery(sectionsQuery(deck))),
      fetch(drawQuery({ deck }), () => qc.prefetchQuery(drawQuery({ deck }))),
    ]),
  ];
  for (const { key, run } of wanted) {
    if (signal?.aborted || !online()) return;
    if (qc.getQueryData(key) !== undefined) continue;
    await run();
  }
}

/**
 * Warms one pass at a time. A pass stops when the connection goes, so calling `run` again on
 * reconnect or return picks up whatever is still missing; a call during a pass runs once more after it.
 */
export function cacheWarmer(qc: QueryClient) {
  let ids: readonly string[] = [];
  let active: AbortController | null = null;
  let again = false;
  let pass: Promise<void> = Promise.resolve();
  const start = () => {
    const controller = new AbortController();
    active = controller;
    pass = warmCache(qc, ids, controller.signal).finally(() => {
      if (active !== controller) return;
      active = null;
      if (again) {
        again = false;
        start();
      }
    });
  };
  return {
    /** Starts a pass, with new deck ids if given; resolves when the current pass ends. */
    run(deckIds?: readonly string[]): Promise<void> {
      if (deckIds) ids = deckIds;
      if (active) again = true;
      else start();
      return pass;
    },
    stop() {
      active?.abort();
      active = null;
      again = false;
    },
  };
}

// The phone has no `navigator.onLine`, so Query's own connection state stands in for it there.
const online = () =>
  onlineManager.isOnline() && !(typeof navigator !== "undefined" && navigator.onLine === false);

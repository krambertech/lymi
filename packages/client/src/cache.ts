import {
  type DehydratedState,
  defaultShouldDehydrateQuery,
  onlineManager,
  type Query,
  type QueryClient,
} from "@tanstack/react-query";
import { deckCardsQuery, drawQuery, sectionsQuery } from "./queries";

export function shouldPersistQuery(query: Query): boolean {
  return defaultShouldDehydrateQuery(query) && keepable(query);
}

const keepable = (query: Query) =>
  query.meta?.persist !== false &&
  !(typeof Blob !== "undefined" && query.state.data instanceof Blob);

export const outboxDehydrateOptions = {
  shouldDehydrateQuery: (query: Query) => query.state.data !== undefined && keepable(query),
  shouldDehydrateMutation: () => false,
};

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

export async function warmCache(
  qc: QueryClient,
  deckIds: readonly string[],
  signal?: AbortSignal,
  seriesIds: readonly string[] = [],
) {
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
    ...seriesIds.map((series) =>
      fetch(drawQuery({ series }), () => qc.prefetchQuery(drawQuery({ series }))),
    ),
  ];
  for (const { key, run } of wanted) {
    if (signal?.aborted || !online()) return;
    if (qc.getQueryData(key) !== undefined) continue;
    await run();
  }
}

export function cacheWarmer(qc: QueryClient) {
  let ids: readonly string[] = [];
  let series: readonly string[] = [];
  let active: AbortController | null = null;
  let again = false;
  let pass: Promise<void> = Promise.resolve();
  const start = () => {
    const controller = new AbortController();
    active = controller;
    pass = warmCache(qc, ids, controller.signal, series).finally(() => {
      if (active !== controller) return;
      active = null;
      if (again) {
        again = false;
        start();
      }
    });
  };
  return {
    run(deckIds?: readonly string[], seriesIds?: readonly string[]): Promise<void> {
      if (deckIds) ids = deckIds;
      if (seriesIds) series = seriesIds;
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

export const online = () =>
  onlineManager.isOnline() && !(typeof navigator !== "undefined" && navigator.onLine === false);

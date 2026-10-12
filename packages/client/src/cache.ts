import {
  defaultShouldDehydrateQuery,
  onlineManager,
  type Query,
  type QueryClient,
} from "@tanstack/react-query";
import { deckCardsQuery, drawQuery, sectionsQuery } from "./queries";

/** Which queries the kept cache holds: no Blob, which JSON loses, and no read with `meta.persist: false`, which a query only ever filled by setQueryData lacks. */
export function shouldPersistQuery(query: Query): boolean {
  return (
    defaultShouldDehydrateQuery(query) &&
    query.meta?.persist !== false &&
    !(typeof Blob !== "undefined" && query.state.data instanceof Blob)
  );
}

/**
 * What a client that sends every offline write through the outboxes keeps: no mutation, because a
 * paused one restored after a quit has no function to run and would only hold its variables.
 */
export const outboxDehydrateOptions = {
  shouldDehydrateQuery: shouldPersistQuery,
  shouldDehydrateMutation: () => false,
};

/**
 * Fetches, while online, what every deck's screen and review need and the cache does not hold
 * yet, so a deck first opened offline still has its cards. One at a time, so it never competes
 * with what the learner is doing.
 */
export async function warmCache(qc: QueryClient, deckIds: readonly string[]) {
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
    if (!online()) return;
    if (qc.getQueryData(key) !== undefined) continue;
    await run();
  }
}

// The phone has no `navigator.onLine`, so Query's own connection state stands in for it there.
const online = () =>
  onlineManager.isOnline() && !(typeof navigator !== "undefined" && navigator.onLine === false);

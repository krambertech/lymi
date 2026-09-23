import type { QueryClient } from "@tanstack/react-query";
import { deckCardsQuery, drawQuery, sectionsQuery } from "./queries";

/**
 * Fetches, while online, what every deck's screen and review need and the cache does not hold
 * yet, so a deck first opened offline still has its cards. One at a time, so it never competes
 * with what the learner is doing.
 */
export async function warmCache(qc: QueryClient, deckIds: readonly string[]) {
  const fetch = <T extends { queryKey: readonly unknown[] }>(
    query: T,
    run: () => Promise<void>,
  ) => ({
    key: query.queryKey,
    run,
  });
  const wanted = [
    fetch(drawQuery({}), () => qc.prefetchQuery(drawQuery({}))),
    ...deckIds.flatMap((deck) => [
      fetch(deckCardsQuery(deck), () => qc.prefetchQuery(deckCardsQuery(deck))),
      fetch(sectionsQuery(deck), () => qc.prefetchQuery(sectionsQuery(deck))),
      fetch(drawQuery({ deck }), () => qc.prefetchQuery(drawQuery({ deck }))),
    ]),
  ];
  for (const { key, run } of wanted) {
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    if (qc.getQueryData(key) !== undefined) continue;
    await run();
  }
}

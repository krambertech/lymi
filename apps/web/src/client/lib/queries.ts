import type { Round } from "@lymi/core";
import { infiniteQueryOptions, keepPreviousData, queryOptions } from "@tanstack/react-query";
import { api, type ReviewScope, scopeKey } from "./api";
import { flushOutbox } from "./grades";

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: api.me,
  retry: false,
  staleTime: 5 * 60_000,
});
export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: api.settings,
  staleTime: 5 * 60_000,
});
// Counts change with every review, so the persisted copy is only a placeholder until the refetch lands.
export const decksQuery = queryOptions({
  queryKey: ["decks"],
  queryFn: api.decks,
  staleTime: 0,
  refetchOnWindowFocus: true,
});
/** How long a card may say it is working before the screen stops waiting on it. */
const ENRICHMENT_PATIENCE = 10 * 60_000;

export const deckCardsQuery = (deckId: string) =>
  queryOptions({
    queryKey: ["decks", deckId, "cards"],
    queryFn: () => api.deckCards(deckId),
    staleTime: 0,
    // While the AI is filling a card, keep asking so its shimmer resolves without a reload.
    // A run settles itself, so a card still working long after its add is a server that stopped
    // answering rather than one still thinking: stop asking rather than poll for ever.
    refetchInterval: (query) =>
      query.state.data?.some(
        (row) =>
          row.card.enrichmentStatus === "working" &&
          Date.now() - new Date(row.card.updatedAt).getTime() < ENRICHMENT_PATIENCE,
      )
        ? 2000
        : false,
  });
// Under the deck's key, so every review that refreshes the decks refreshes where the learner is.
export const sectionsQuery = (deckId: string) =>
  queryOptions({
    queryKey: ["decks", deckId, "sections"],
    queryFn: () => api.sections(deckId),
    staleTime: 0,
  });
export const archivedSectionsQuery = (deckId: string) =>
  queryOptions({
    queryKey: ["decks", deckId, "sections", "archived"],
    queryFn: () => api.archivedSections(deckId),
    staleTime: 0,
  });
// Series counts move with every review, like the decks they add up from.
export const seriesQuery = queryOptions({
  queryKey: ["series"],
  queryFn: api.series,
  staleTime: 0,
  refetchOnWindowFocus: true,
});
export const archivedDecksQuery = queryOptions({
  queryKey: ["decks", "archived"],
  queryFn: api.archivedDecks,
  staleTime: 0,
});
export const archivedCardsQuery = queryOptions({
  queryKey: ["cards", "archived"],
  queryFn: api.archivedCards,
  staleTime: 0,
});
/** Join links are capabilities, so neither query is written to the persisted cache. */
export const joinLinkQuery = (deckId: string) =>
  queryOptions({
    queryKey: ["decks", deckId, "join-link"],
    queryFn: () => api.joinLink(deckId),
    staleTime: 0,
    meta: { persist: false },
  });
export const joinPreviewQuery = (token: string) =>
  queryOptions({
    queryKey: ["join", token],
    queryFn: () => api.joinPreview(token),
    staleTime: 0,
    retry: false,
    meta: { persist: false },
  });
export const addPreviewQuery = (slug: string) =>
  queryOptions({
    queryKey: ["add", slug],
    queryFn: () => api.addPreview(slug),
    staleTime: 0,
    retry: false,
    meta: { persist: false },
  });
/**
 * The catalogue changes when Lymi publishes, not when the learner reviews. Neither read is
 * persisted: a deck nobody has added is nothing to review offline, and the cache they would
 * share is the one offline reviews depend on.
 */
export const exploreQuery = queryOptions({
  queryKey: ["explore"],
  queryFn: api.explore,
  staleTime: 5 * 60_000,
  meta: { persist: false },
});
export const exploreDeckQuery = (slug: string) =>
  queryOptions({
    queryKey: ["explore", slug],
    queryFn: () => api.exploreDeck(slug),
    staleTime: 5 * 60_000,
    retry: false,
    meta: { persist: false },
  });
export const cardHistoryQuery = (cardId: string) =>
  queryOptions({
    queryKey: ["cards", cardId, "history"],
    queryFn: () => api.cardHistory(cardId),
    staleTime: 0,
  });
export const queueQuery = (scope: ReviewScope, round?: Round) =>
  queryOptions({
    queryKey: ["queue", scopeKey(scope), round ?? "order"],
    // The server chooses a round's cards, so grades still on their way land first.
    queryFn: async () => {
      await flushOutbox();
      return api.queue(scope, round);
    },
    staleTime: 0,
    // A review keeps its initial order; a new mount still fetches a freshly shuffled queue.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
/** What the review draws from, stamped with when the request began so an empty draw can be confirmed. */
export const drawQuery = (scope: ReviewScope) =>
  queryOptions({
    queryKey: ["queue", scopeKey(scope), "draw"],
    queryFn: async () => {
      const fetchedAt = Date.now();
      return { ...(await api.draw(scope)), fetchedAt };
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
/** How many cards each Today round holds. A review invalidates it with the decks. */
export const roundsQuery = queryOptions({
  queryKey: ["rounds"],
  queryFn: async () => {
    await flushOutbox();
    return api.rounds();
  },
  staleTime: 0,
});
/** The flame in the chrome and the panel behind it. A review invalidates it on the way out. */
export const streakQuery = queryOptions({
  queryKey: ["streak"],
  queryFn: api.streak,
  staleTime: 60_000,
});
// Every figure here moves with a review, and nothing else invalidates this key on the way
// in, so the persisted copy is a placeholder until the refetch lands rather than fresh data.
// `placeholderData` keeps the previous period on screen while the next one loads, so
// changing the switch does not blank the four plates that did not change.
export const insightsQuery = (period: 30 | 90 | 0) =>
  queryOptions({
    queryKey: ["insights", period],
    queryFn: () => api.insights(period),
    staleTime: 0,
    refetchOnMount: "always",
    placeholderData: keepPreviousData,
  });
export const keysQuery = queryOptions({ queryKey: ["keys"], queryFn: api.keys, staleTime: 0 });
export const connectedAppsQuery = queryOptions({
  queryKey: ["connected-apps"],
  queryFn: api.connectedApps,
  staleTime: 0,
});

/** Statuses the server is still working through, so a screen keeps asking. */
const WORKING = new Set(["inspecting", "importing"]);

/** Activity, newest first, a page at a time. */
export const activityQuery = infiniteQueryOptions({
  queryKey: ["activity"],
  queryFn: ({ pageParam }) => api.activity(pageParam),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (last) => last.nextCursor ?? undefined,
  staleTime: 0,
  refetchOnWindowFocus: true,
  // A file on its way finishes without the learner reloading, as it does on its own screen. A
  // refetch reads every page that is loaded, so this only runs while there is one: a learner
  // reading back through the log is not worth re-reading it every three seconds.
  refetchInterval: (query) => {
    const pages = query.state.data?.pages;
    if (!pages || pages.length !== 1) return false;
    const working = pages[0]?.entries.some(
      (entry) => WORKING.has(entry.import?.status ?? "") || entry.export?.status === "exporting",
    );
    return working ? 3000 : false;
  },
  // What an app wrote is the learner's own, and Activity has no reason to open offline.
  meta: { persist: false },
});

/** One export, polled while the server writes its file. */
export const exportQuery = (id: string) =>
  queryOptions({
    queryKey: ["exports", id],
    queryFn: () => api.export(id),
    staleTime: 0,
    refetchInterval: (query) => (query.state.data?.status === "exporting" ? 1500 : false),
    meta: { persist: false },
  });

/** One import, polled while the server reads or writes it. */
export const importQuery = (id: string) =>
  queryOptions({
    queryKey: ["imports", id],
    queryFn: () => api.import(id),
    staleTime: 0,
    refetchInterval: (query) => (WORKING.has(query.state.data?.status ?? "") ? 1500 : false),
    // A file name and a preview are the learner's own, and there is no reason to keep them offline.
    meta: { persist: false },
  });

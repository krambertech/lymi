import type { JoinOut, JoinPreviewOut } from "@lymi/core";
import type { ExploreDeckOut, ExploreOut } from "@lymi/core/catalog";
import { request } from "./request";

/** The chosen edition as a query string, or nothing at all for the deck's own words. */
function edition(meaningLanguage: string | undefined): string {
  return meaningLanguage ? `?${new URLSearchParams({ meaningLanguage })}` : "";
}

export const exploreApi = {
  addPreview: (slug: string) => request<JoinPreviewOut>(`/api/add/${encodeURIComponent(slug)}`),
  /** Holds the published deck in a short-lived cookie so the sign-in that follows adds it. */
  holdPublishedDeck: (slug: string, meaningLanguage?: string) =>
    request<{ ok: true }>(
      `/api/add/${encodeURIComponent(slug)}/sign-in${edition(meaningLanguage)}`,
      {
        method: "POST",
      },
    ),
  /** The edition is pinned on the membership; changing the app language never moves it. */
  addPublishedDeck: (slug: string, meaningLanguage?: string) =>
    request<JoinOut>(`/api/add/${encodeURIComponent(slug)}${edition(meaningLanguage)}`, {
      method: "POST",
    }),
  /** Explore: the catalogue in the learner's meaning language, and what they already have. */
  explore: () => request<ExploreOut>("/api/explore"),
  exploreDeck: (slug: string) =>
    request<ExploreDeckOut>(`/api/explore/${encodeURIComponent(slug)}`),
};

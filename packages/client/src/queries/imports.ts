import type { ImportChoicesInput } from "@lymi/core";
import { type FetchStatus, onlineManager, queryOptions } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { api, errorMessage, RequestTimeout } from "../api";

/** Statuses the server is still working through, so a screen keeps asking. */
export const WORKING = new Set(["inspecting", "importing"]);

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

/** What the import brings under the learner's choices, recounted on each change with the last count kept meanwhile. */
export const importPreviewQuery = (id: string, choices: ImportChoicesInput) =>
  queryOptions({
    queryKey: ["imports", id, "preview", JSON.stringify(choices)],
    queryFn: ({ signal }) => api.previewImport(id, choices, signal),
    staleTime: 60_000,
    // A second attempt after the deadline would double the wait before Try again shows.
    retry: (failures, error) => failures < 1 && !(error instanceof RequestTimeout),
    placeholderData: (previous) => previous,
    meta: { persist: false },
  });

interface PreviewQuery {
  isPending: boolean;
  isPlaceholderData: boolean;
  isError: boolean;
  error: unknown;
  fetchStatus: FetchStatus;
}

/** What the preview step shows for the learner's current choices, by the rule in `previewState`. */
export function usePreviewState(query: PreviewQuery) {
  const online = useSyncExternalStore(onlineManager.subscribe, isOnline, isOnline);
  return previewState(query, online);
}

const isOnline = () => onlineManager.isOnline();

/**
 * A retry paused for focus is still on its way, so it waits rather than reading as no term. One
 * paused for a lost connection has no end in sight, so it reads as unreachable, with Try again.
 */
export function previewState(
  query: PreviewQuery,
  online: boolean,
): { waiting: boolean; error: string | undefined } {
  const unanswered = query.isPending || query.isPlaceholderData;
  const offline = !online && query.fetchStatus === "paused" && unanswered;
  return {
    waiting: !offline && (query.isPending || query.fetchStatus !== "idle"),
    error: query.isError || offline ? errorMessage(query.error) : undefined,
  };
}

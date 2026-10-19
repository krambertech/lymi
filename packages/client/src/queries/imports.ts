import type { ImportChoicesInput } from "@lymi/core";
import { type FetchStatus, queryOptions } from "@tanstack/react-query";
import { api } from "../api";

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
    retry: 1,
    placeholderData: (previous) => previous,
    meta: { persist: false },
  });

/** A retry paused for focus or a connection is not fetching, but it has not answered either. */
export function previewWaiting(query: { isPending: boolean; fetchStatus: FetchStatus }): boolean {
  return query.isPending || query.fetchStatus !== "idle";
}

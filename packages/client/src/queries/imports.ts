import type { ImportChoicesInput } from "@lymi/core";
import { type FetchStatus, onlineManager, queryOptions } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { api, errorMessage, RequestTimeout } from "../api";

export const WORKING = new Set(["inspecting", "importing"]);

export const importQuery = (id: string) =>
  queryOptions({
    queryKey: ["imports", id],
    queryFn: () => api.import(id),
    staleTime: 0,
    refetchInterval: (query) => (WORKING.has(query.state.data?.status ?? "") ? 1500 : false),
    meta: { persist: false },
  });

export const importPreviewQuery = (id: string, choices: ImportChoicesInput) =>
  queryOptions({
    queryKey: ["imports", id, "preview", JSON.stringify(choices)],
    queryFn: ({ signal }) => api.previewImport(id, choices, signal),
    staleTime: 60_000,
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

export function usePreviewState(query: PreviewQuery) {
  const online = useSyncExternalStore(onlineManager.subscribe, isOnline, isOnline);
  return previewState(query, online);
}

const isOnline = () => onlineManager.isOnline();

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

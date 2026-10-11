import { queryOptions } from "@tanstack/react-query";
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

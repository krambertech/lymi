import { infiniteQueryOptions } from "@tanstack/react-query";
import { api } from "../api";
import { WORKING } from "./imports";

const activityOf = (app?: string) =>
  infiniteQueryOptions({
    queryKey: app ? ["activity", "app", app] : ["activity"],
    queryFn: ({ pageParam }) => api.activity(pageParam, app),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      const pages = query.state.data?.pages;
      if (!pages || pages.length !== 1) return false;
      const working = pages[0]?.entries.some(
        (entry) => WORKING.has(entry.import?.status ?? "") || entry.export?.status === "exporting",
      );
      return working ? 3000 : false;
    },
    meta: { persist: false },
  });

export const activityQuery = activityOf();

export const appActivityQuery = (app: string) => activityOf(app);

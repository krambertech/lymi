import { infiniteQueryOptions } from "@tanstack/react-query";
import { api } from "../api";
import { WORKING } from "./imports";

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

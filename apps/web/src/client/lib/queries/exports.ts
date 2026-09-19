import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";

/** One export, polled while the server writes its file. */
export const exportQuery = (id: string) =>
  queryOptions({
    queryKey: ["exports", id],
    queryFn: () => api.export(id),
    staleTime: 0,
    refetchInterval: (query) => (query.state.data?.status === "exporting" ? 1500 : false),
    meta: { persist: false },
  });

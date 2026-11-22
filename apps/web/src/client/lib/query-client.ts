import { failedWriteCache } from "@lymi/client/failed-writes";
import { QueryClient } from "@tanstack/react-query";
import { toast } from "../components/ui/toast";

export const queryClient = new QueryClient({
  mutationCache: failedWriteCache((title) =>
    toast.add({ id: "failed-write", type: "error", title }),
  ),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60 * 24 * 7,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: { networkMode: "always" },
  },
});

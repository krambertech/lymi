import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";

/** A Flip link is a capability, so its card stays out of the persisted cache. */
export const flipQuery = (token: string) =>
  queryOptions({
    queryKey: ["email", "flip", token],
    queryFn: () => api.flip(token),
    staleTime: 0,
    retry: false,
    meta: { persist: false },
  });

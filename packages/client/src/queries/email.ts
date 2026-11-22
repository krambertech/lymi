import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";

export const flipQuery = (token: string) =>
  queryOptions({
    queryKey: ["email", "flip", token],
    queryFn: () => api.flip(token),
    staleTime: 0,
    retry: false,
    meta: { persist: false },
  });

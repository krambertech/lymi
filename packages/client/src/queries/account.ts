import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: api.me,
  retry: false,
  staleTime: 5 * 60_000,
});

/** Which photo shows: its version names the image to fetch. Always fresh, as the web reads it. */
export const avatarQuery = queryOptions({
  queryKey: ["avatar"],
  queryFn: api.avatar,
  staleTime: 0,
});

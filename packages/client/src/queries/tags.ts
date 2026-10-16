import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";

// Any saved card can add a tag, so a form that opens asks again.
export const tagsQuery = queryOptions({
  queryKey: ["tags"],
  queryFn: api.tags,
  staleTime: 0,
});

import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";

export const keysQuery = queryOptions({ queryKey: ["keys"], queryFn: api.keys, staleTime: 0 });

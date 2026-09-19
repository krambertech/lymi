import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";

export const connectedAppsQuery = queryOptions({
  queryKey: ["connected-apps"],
  queryFn: api.connectedApps,
  staleTime: 0,
});

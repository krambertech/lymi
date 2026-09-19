import type { Scope } from "@lymi/core";
import { request } from "./request";

/** An MCP client the learner let in on the consent screen. */
export type ConnectedApp = {
  id: string;
  clientId: string;
  name: string | null;
  scope: Scope;
  createdAt: string;
  updatedAt: string;
};

export const connectedAppsApi = {
  connectedApps: () => request<ConnectedApp[]>("/api/connected-apps"),
  disconnect: (id: string) =>
    request<{ ok: true }>(`/api/connected-apps/${id}`, { method: "DELETE" }),
};

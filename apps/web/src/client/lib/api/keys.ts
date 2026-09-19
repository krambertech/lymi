import type { ApiKeyInput, Scope } from "@lymi/core";
import { request } from "./request";

export type ApiKeySummary = {
  id: string;
  name: string | null;
  start: string | null;
  scope: Scope;
  lastRequest: string | null;
  createdAt: string;
};
/** Only the create response carries the plain key. */
export type ApiKeyCreated = ApiKeySummary & { key: string };

export const keysApi = {
  keys: () => request<ApiKeySummary[]>("/api/keys"),
  createKey: (body: ApiKeyInput) =>
    request<ApiKeyCreated>("/api/keys", { method: "POST", body: JSON.stringify(body) }),
  revokeKey: (id: string) => request<{ ok: true }>(`/api/keys/${id}`, { method: "DELETE" }),
};

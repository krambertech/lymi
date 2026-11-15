import type { FlipOut } from "@lymi/core";
import { request } from "./request";

export const emailApi = {
  flip: (token: string) => request<FlipOut>(`/api/email/flip/${encodeURIComponent(token)}`),
  unsubscribe: (token: string) =>
    request<{ ok: true }>(`/api/email/unsubscribe/${encodeURIComponent(token)}`, {
      method: "POST",
    }),
};

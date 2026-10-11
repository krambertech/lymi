import type { PushEndpointInput, PushSubscriptionInput, ReminderTime } from "@lymi/core";
import { request } from "./request";

export type PushSubscriptionStatus = {
  enabled: boolean;
  reminderTime: ReminderTime | null;
  timezone: string | null;
};

export const pushApi = {
  pushConfig: () => request<{ publicKey: string }>("/api/push/config"),
  pushStatus: (body: PushEndpointInput) =>
    request<PushSubscriptionStatus>("/api/push/status", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  savePushSubscription: (body: PushSubscriptionInput) =>
    request<PushSubscriptionStatus>("/api/push/subscription", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  removePushSubscription: (body: PushEndpointInput) =>
    request<{ ok: true }>("/api/push/subscription", {
      method: "DELETE",
      body: JSON.stringify(body),
    }),
};

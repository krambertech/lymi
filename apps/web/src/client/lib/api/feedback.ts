import type { FeedbackInput } from "@lymi/core";
import { request } from "./request";

export const feedbackApi = {
  sendFeedback: (body: FeedbackInput) =>
    request<{ ok: true }>("/api/feedback", { method: "POST", body: JSON.stringify(body) }),
};

import type { ReviewPlatform } from "@lymi/client/review-flow";
import { randomUUID } from "expo-crypto";
import { AppState } from "react-native";
import { captureEvent } from "../telemetry/posthog";

export const PHONE: ReviewPlatform = {
  track(event) {
    if (event.name === "review_session_finished") captureEvent(event.name, event);
    if (event.name === "review_session_abandoned") captureEvent(event.name, event);
  },
  newId: randomUUID,
  onForeground(back) {
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") back();
    });
    return () => listener.remove();
  },
};

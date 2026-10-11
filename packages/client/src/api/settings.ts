import type { AppLanguage, LearningKind, OnboardingInput, SettingsPatch } from "@lymi/core";
import { deviceTimezone, request } from "./request";

export type Settings = {
  userId: string;
  appLanguage: AppLanguage | null;
  meaningLanguage: string;
  dailyGoal: number;
  dailyGoalChosenAt: string | null;
  reviewTimezone: string | null;
  reviewTimezoneMode: "automatic" | "manual";
  onboardedAt: string | null;
  learningKind: LearningKind | null;
  learningLanguage: string | null;
  createdAt: string;
  updatedAt: string;
};

export const settingsApi = {
  settings: () => request<Settings>("/api/settings"),
  updateSettings: (body: SettingsPatch) =>
    request<Settings>("/api/settings", { method: "PATCH", body: JSON.stringify(body) }),
  finishOnboarding: (body: OnboardingInput) =>
    request<Settings>("/api/settings/onboarding", { method: "PUT", body: JSON.stringify(body) }),
  reportTimezone: () =>
    request<Settings>("/api/settings/timezone/device", {
      method: "PUT",
      body: JSON.stringify({ timezone: deviceTimezone() }),
    }),
};

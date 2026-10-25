import type {
  AiConsentInput,
  AnalyticsConsentInput,
  AppLanguage,
  LearningKind,
  OnboardingInput,
  SettingsPatch,
} from "@lymi/core";
import { deviceTimezone, request } from "./request";

export type Settings = {
  userId: string;
  analyticsConsent: boolean | null;
  analyticsConsentUpdatedAt: string | null;
  /** Null until answered; the phone sends nothing to AI until it is true. */
  aiConsent?: boolean | null | undefined;
  aiConsentUpdatedAt?: string | null | undefined;
  /** Null means yes; only false stops session replay. */
  sessionReplay?: boolean | null | undefined;
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
  updateAnalyticsConsent: (body: AnalyticsConsentInput) =>
    request<Settings>("/api/settings/analytics-consent", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  updateAiConsent: (body: AiConsentInput) =>
    request<Settings>("/api/settings/ai-consent", { method: "PUT", body: JSON.stringify(body) }),
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

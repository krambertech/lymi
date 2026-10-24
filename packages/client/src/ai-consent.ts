import { type AI_CONSENT_PLACES, AI_CONSENT_REQUIRED, AI_CONSENT_VERSION } from "@lymi/core";
import type { QueryClient } from "@tanstack/react-query";
import { ApiError, api, type Settings } from "./api";
import { settingsQuery } from "./queries";

export type AiConsentPlace = (typeof AI_CONSENT_PLACES)[number];

/** The learner's answer, or null until they give one, including from a cache older than the field. */
export function aiChoice(settings: Pick<Settings, "aiConsent"> | undefined): boolean | null {
  return settings?.aiConsent ?? null;
}

/** The server refused an AI request because the learner has not allowed AI. */
export function refusedForAiConsent(error: unknown): boolean {
  return error instanceof ApiError && error.code === AI_CONSENT_REQUIRED;
}

/** Saves the answer and puts the account's settings in the cache, so every screen follows at once. */
export async function saveAiChoice(
  qc: QueryClient,
  allowed: boolean,
  place: AiConsentPlace,
): Promise<Settings> {
  const settings = await api.updateAiConsent({
    allowed,
    version: AI_CONSENT_VERSION,
    updated_at: Date.now(),
    place,
  });
  qc.setQueryData(settingsQuery.queryKey, settings);
  return settings;
}

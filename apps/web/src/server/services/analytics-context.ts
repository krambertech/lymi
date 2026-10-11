import {
  type AnalyticsConsent,
  AnalyticsLocale,
  INTERNAL_ACCOUNT_IDS,
  readConsent,
} from "@lymi/core/analytics";
import type { Db } from "../db";
import { getSettings } from "./settings";

export async function analyticsContext(
  db: Db,
  userId: string,
  browserChoice?: AnalyticsConsent | null,
  language?: string,
) {
  const settings = await getSettings({ db, userId, actor: "user" });
  const savedAt = settings.analyticsConsentUpdatedAt?.getTime() ?? 0;
  return {
    allowed:
      settings.analyticsConsent === true &&
      savedAt + 180 * 24 * 60 * 60 * 1000 > Date.now() &&
      (browserChoice === undefined || browserChoice?.allowed === true),
    ...(INTERNAL_ACCOUNT_IDS.has(userId) ? { is_internal: true as const } : {}),
    ui_locale: AnalyticsLocale.catch("en").parse(
      settings.appLanguage ?? language?.split(/[-,;]/)[0],
    ),
  };
}
export function analyticsContextFor(db: Db, userId: string, headers?: Headers) {
  const choice = headers ? readConsent(headers.get("cookie") ?? "") : undefined;
  return () => analyticsContext(db, userId, choice, headers?.get("accept-language") ?? undefined);
}

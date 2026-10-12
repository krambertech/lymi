import { CLIENT_HEADER, parseClientHeader } from "@lymi/core";
import { AnalyticsLocale, INTERNAL_ACCOUNT_IDS } from "@lymi/core/analytics";
import type { Db } from "../db";
import { getSettings } from "./settings";

/** Product analytics follow the account: on unless the learner turned them off in Settings. */
export async function analyticsContext(db: Db, userId: string, language?: string, client?: string) {
  const settings = await getSettings({ db, userId, actor: "user" });
  const phone = parseClientHeader(client);
  return {
    allowed: settings.analyticsConsent !== false,
    ...(INTERNAL_ACCOUNT_IDS.has(userId) ? { is_internal: true as const } : {}),
    ui_locale: AnalyticsLocale.catch("en").parse(
      settings.appLanguage ?? language?.split(/[-,;]/)[0],
    ),
    ...(phone ? { phone } : {}),
  };
}
export function analyticsContextFor(db: Db, userId: string, headers?: Headers) {
  return () =>
    analyticsContext(
      db,
      userId,
      headers?.get("accept-language") ?? undefined,
      headers?.get(CLIENT_HEADER) ?? undefined,
    );
}

import type { I18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";

/** When a key last made a request, as its row and its app's page say it. */
export function lastUsed(i18n: I18n, iso: string | null): string {
  if (!iso) return i18n._(msg`never used`);
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60_000);
  if (m < 1) return i18n._(msg`used just now`);
  if (m < 60) return i18n._(msg`used ${m} min ago`);
  const h = Math.round(m / 60);
  if (h < 24) return i18n._(msg`used ${h} h ago`);
  const d = Math.round(h / 24);
  if (d < 14) return i18n._(msg`used ${d} d ago`);
  const date = shortDate(i18n, iso);
  return i18n._(msg`used ${date}`);
}

export function shortDate(i18n: I18n, iso: string): string {
  return i18n.date(new Date(iso), { day: "numeric", month: "short" });
}

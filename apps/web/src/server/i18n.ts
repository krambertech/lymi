import type { I18n } from "@lingui/core";
import { messages as en } from "../locales/en.po";
import { messages as ru } from "../locales/ru.po";
import { messages as uk } from "../locales/uk.po";

const catalogs = { en, uk, ru } as const;
const instances = new Map<string, I18n>();

/**
 * A per-locale I18n for Worker-side copy such as push reminders. Unknown locales read English.
 * @lingui/core reaches @messageformat/parser, which is CommonJS; the static graph of the Worker
 * entry must stay ESM for the test runner, so the import is deferred like web-push.
 */
export async function serverI18n(locale: string): Promise<I18n> {
  const key = (locale in catalogs ? locale : "en") as keyof typeof catalogs;
  let i18n = instances.get(key);
  if (!i18n) {
    const { setupI18n } = await import("@lingui/core");
    i18n = setupI18n({ locale: key, messages: { [key]: catalogs[key] } });
    instances.set(key, i18n);
  }
  return i18n;
}

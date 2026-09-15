import { type I18n, i18n } from "@lingui/core";
import { AppLanguage, interval } from "@lymi/core";
import { messages as en } from "../../locales/en.po";
import { messages as ru } from "../../locales/ru.po";
import { messages as uk } from "../../locales/uk.po";

const KEY = "lymi-language";
const catalogs: Record<AppLanguage, typeof en> = { en, uk, ru };

export function isAppLanguage(value: unknown): value is AppLanguage {
  return AppLanguage.safeParse(value).success;
}

/** The first browser language with a catalog, or English. */
export function pickLocale(languages: readonly string[] = navigator.languages): AppLanguage {
  for (const tag of languages) {
    const base = tag.toLowerCase().split("-")[0];
    if (isAppLanguage(base)) return base;
  }
  return "en";
}

/** The last language the learner chose on this browser, written the moment it was chosen. */
export function readStoredLanguage(): AppLanguage | null {
  try {
    const value = localStorage.getItem(KEY);
    return isAppLanguage(value) ? value : null;
  } catch {
    return null;
  }
}

/** Sign-out clears it so one account's language never carries into another on a shared browser. */
export function clearStoredLanguage() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

/** Switch the interface to a language, remember it, and tell assistive technology. */
export function activate(locale: AppLanguage) {
  if (i18n.locale !== locale || !i18n.messages) i18n.load(locale, catalogs[locale]);
  i18n.activate(locale);
  document.documentElement.lang = locale;
  try {
    localStorage.setItem(KEY, locale);
  } catch {}
}

/**
 * The bare shell (sign-in, consent) has no learner yet, so it follows the browser and ignores
 * a value left by a previous session. Everything else starts from the stored choice and lets
 * the settings query correct it once it lands.
 */
export function bootstrapLanguage(pathname: string) {
  const stored = isBareShell(pathname) ? null : readStoredLanguage();
  const locale = stored ?? pickLocale();
  i18n.load(locale, catalogs[locale]);
  i18n.activate(locale);
  document.documentElement.lang = locale;
}

export function isBareShell(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname === "/consent" ||
    pathname.startsWith("/join/") ||
    pathname.startsWith("/add/") ||
    pathname.startsWith("/design")
  );
}

/** "2 d" in English, "2 дн." in Ukrainian: the browser's own narrow unit for the active locale. */
export function intervalLabel(i18n: I18n, from: Date, to: Date): string {
  const { value, unit } = interval(from, to);
  return i18n.number(value, { style: "unit", unit, unitDisplay: "narrow" });
}

import { type I18n, setupI18n } from "@lingui/core";
import { messages as en } from "../locales/en.po";
import { messages as ru } from "../locales/ru.po";
import { messages as uk } from "../locales/uk.po";
import { type Locale, locales } from "./routes";

const catalogs = { en, uk, ru } as const;

/** One I18n per island render, activated for the page locale Astro resolved. */
export function pageI18n(locale: string | undefined): I18n {
  const key: Locale = (locales as readonly string[]).includes(locale ?? "")
    ? (locale as Locale)
    : "en";
  return setupI18n({ locale: key, messages: { [key]: catalogs[key] } });
}

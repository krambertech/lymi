// Hermes has no Intl.PluralRules, which Lingui's plurals need; only the three app languages load.
import "@formatjs/intl-pluralrules/polyfill.js";
import "@formatjs/intl-pluralrules/locale-data/en.js";
import "@formatjs/intl-pluralrules/locale-data/uk.js";
import "@formatjs/intl-pluralrules/locale-data/ru.js";
import { i18n } from "@lingui/core";
import { AppLanguage } from "@lymi/core";
import { getLocales } from "expo-localization";
import { createMMKV } from "react-native-mmkv";
import { messages as en } from "../locales/en.po";
import { messages as ru } from "../locales/ru.po";
import { messages as uk } from "../locales/uk.po";

const catalogs: Record<AppLanguage, typeof en> = { en, uk, ru };
const kept = createMMKV({ id: "lymi-language" });
const KEY = "language";

export function isAppLanguage(value: unknown): value is AppLanguage {
  return AppLanguage.safeParse(value).success;
}

/** The first of the phone's preferred languages with a catalog, or English. */
export function deviceLanguage(): AppLanguage {
  for (const { languageCode } of getLocales()) {
    if (isAppLanguage(languageCode)) return languageCode;
  }
  return "en";
}

/** Switches the interface to a language and remembers it, so the next launch opens in it. */
export function activate(locale: AppLanguage) {
  if (i18n.locale !== locale) i18n.load(locale, catalogs[locale]);
  i18n.activate(locale);
  kept.set(KEY, locale);
}

/** Sign-out forgets it, so one account's language never carries into the next. */
export function forgetLanguage() {
  kept.remove(KEY);
}

// Before anything renders: the last language the learner had here, else the phone's own.
const stored = kept.getString(KEY);
const first = isAppLanguage(stored) ? stored : deviceLanguage();
i18n.load(first, catalogs[first]);
i18n.activate(first);

export { i18n };

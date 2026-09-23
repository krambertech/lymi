import { i18n as globalI18n } from "@lingui/core";

/** One display-name lookup per interface language; the locale can change while the app runs. */
const names = new Map<string, Intl.DisplayNames | null>();

/** "it" reads as Italian. Falls back to the tag where the browser has no name for it. */
export function languageName(tag: string, locale: string = globalI18n.locale): string {
  if (!names.has(locale)) {
    try {
      names.set(locale, new Intl.DisplayNames([locale], { type: "language" }));
    } catch {
      names.set(locale, null);
    }
  }
  try {
    return names.get(locale)?.of(tag) ?? tag;
  } catch {
    return tag;
  }
}

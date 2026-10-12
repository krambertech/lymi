import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { LANGUAGE_TAGS } from "@lymi/core";

// Hermes has no Intl.DisplayNames, so the phone's catalog names core's offered languages.
const NAMES: Record<(typeof LANGUAGE_TAGS)[number], MessageDescriptor> = {
  ar: msg({ message: "Arabic", context: "language" }),
  bg: msg({ message: "Bulgarian", context: "language" }),
  cs: msg({ message: "Czech", context: "language" }),
  da: msg({ message: "Danish", context: "language" }),
  de: msg({ message: "German", context: "language" }),
  el: msg({ message: "Greek", context: "language" }),
  en: msg({ message: "English", context: "language" }),
  es: msg({ message: "Spanish", context: "language" }),
  et: msg({ message: "Estonian", context: "language" }),
  fa: msg({ message: "Persian", context: "language" }),
  fi: msg({ message: "Finnish", context: "language" }),
  fr: msg({ message: "French", context: "language" }),
  he: msg({ message: "Hebrew", context: "language" }),
  hi: msg({ message: "Hindi", context: "language" }),
  hr: msg({ message: "Croatian", context: "language" }),
  hu: msg({ message: "Hungarian", context: "language" }),
  id: msg({ message: "Indonesian", context: "language" }),
  it: msg({ message: "Italian", context: "language" }),
  ja: msg({ message: "Japanese", context: "language" }),
  ko: msg({ message: "Korean", context: "language" }),
  lt: msg({ message: "Lithuanian", context: "language" }),
  lv: msg({ message: "Latvian", context: "language" }),
  nl: msg({ message: "Dutch", context: "language" }),
  no: msg({ message: "Norwegian", context: "language" }),
  pl: msg({ message: "Polish", context: "language" }),
  pt: msg({ message: "Portuguese", context: "language" }),
  "pt-BR": msg({ message: "Brazilian Portuguese", context: "language" }),
  ro: msg({ message: "Romanian", context: "language" }),
  ru: msg({ message: "Russian", context: "language" }),
  sk: msg({ message: "Slovak", context: "language" }),
  sl: msg({ message: "Slovenian", context: "language" }),
  sr: msg({ message: "Serbian", context: "language" }),
  sv: msg({ message: "Swedish", context: "language" }),
  th: msg({ message: "Thai", context: "language" }),
  tr: msg({ message: "Turkish", context: "language" }),
  uk: msg({ message: "Ukrainian", context: "language" }),
  vi: msg({ message: "Vietnamese", context: "language" }),
  zh: msg({ message: "Chinese", context: "language" }),
};

/** A language's name in the interface language, or its tag when it is one the learner typed in. */
export function languageName(tag: string, i18n: I18n): string {
  const name = NAMES[tag as keyof typeof NAMES];
  return name ? i18n._(name) : tag;
}

import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import type { LANGUAGE_TAGS } from "@lymi/core";
import { i18n } from "../i18n";

// Hermes has no Intl.DisplayNames, so the phone names languages itself: in English for addresses, and
// through the catalogue for the learner.
const NAMES: Record<(typeof LANGUAGE_TAGS)[number] | "ka", string> = {
  ar: "Arabic",
  bg: "Bulgarian",
  cs: "Czech",
  da: "Danish",
  de: "German",
  el: "Greek",
  en: "English",
  es: "Spanish",
  et: "Estonian",
  fa: "Persian",
  fil: "Filipino",
  fi: "Finnish",
  fr: "French",
  he: "Hebrew",
  hi: "Hindi",
  hr: "Croatian",
  hu: "Hungarian",
  hy: "Armenian",
  id: "Indonesian",
  is: "Icelandic",
  it: "Italian",
  ka: "Georgian",
  ja: "Japanese",
  ko: "Korean",
  lt: "Lithuanian",
  lv: "Latvian",
  nl: "Dutch",
  nn: "Norwegian Nynorsk",
  no: "Norwegian",
  pl: "Polish",
  pt: "Portuguese",
  "pt-BR": "Brazilian Portuguese",
  ro: "Romanian",
  ru: "Russian",
  sk: "Slovak",
  sl: "Slovenian",
  sr: "Serbian",
  sv: "Swedish",
  ta: "Tamil",
  th: "Thai",
  tr: "Turkish",
  uk: "Ukrainian",
  vi: "Vietnamese",
  zh: "Chinese",
};

const LOCAL: Record<keyof typeof NAMES, MessageDescriptor> = {
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
  fil: msg({ message: "Filipino", context: "language" }),
  fi: msg({ message: "Finnish", context: "language" }),
  fr: msg({ message: "French", context: "language" }),
  he: msg({ message: "Hebrew", context: "language" }),
  hi: msg({ message: "Hindi", context: "language" }),
  hr: msg({ message: "Croatian", context: "language" }),
  hu: msg({ message: "Hungarian", context: "language" }),
  hy: msg({ message: "Armenian", context: "language" }),
  id: msg({ message: "Indonesian", context: "language" }),
  is: msg({ message: "Icelandic", context: "language" }),
  it: msg({ message: "Italian", context: "language" }),
  ja: msg({ message: "Japanese", context: "language" }),
  ka: msg({ message: "Georgian", context: "language" }),
  ko: msg({ message: "Korean", context: "language" }),
  lt: msg({ message: "Lithuanian", context: "language" }),
  lv: msg({ message: "Latvian", context: "language" }),
  nl: msg({ message: "Dutch", context: "language" }),
  nn: msg({ message: "Norwegian Nynorsk", context: "language" }),
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
  ta: msg({ message: "Tamil", context: "language" }),
  th: msg({ message: "Thai", context: "language" }),
  tr: msg({ message: "Turkish", context: "language" }),
  uk: msg({ message: "Ukrainian", context: "language" }),
  vi: msg({ message: "Vietnamese", context: "language" }),
  zh: msg({ message: "Chinese", context: "language" }),
};

/** A language's name in the app's language, or its tag when it is one the learner typed in. */
export function languageName(tag: string): string {
  const name = LOCAL[tag as keyof typeof LOCAL];
  return name ? i18n._(name) : tag;
}

/** A language's English name, as lymi.app's addresses spell it. */
export function englishLanguageName(tag: string): string {
  return NAMES[tag as keyof typeof NAMES] ?? tag;
}

/**
 * The one place that compares language codes: shared code asks these functions what a card's
 * language does, and never checks a tag itself. docs/proposals/supported-languages.md.
 */
import { japanese } from "./japanese";
import type { LanguageSupport, ReadingEngine, Script, SpeechInput, SupportedTag } from "./types";

export * from "./names";
export type { LanguageSupport, ReadingEngine, Script, SpeechInput, SupportedTag } from "./types";

/** Each record keeps its literal type, so a registry elsewhere can follow what a record turns on. */
export const SUPPORTED_LANGUAGES = {
  ja: japanese,
} as const satisfies Record<SupportedTag, LanguageSupport>;

/** A language with a row of data and no engine. */
interface LanguageConfig {
  /** The pronunciation holds a Reading, and the card form calls the field so. */
  pronunciation: "reading";
  /** The cue shows the pronunciation as a line until the card is Known. */
  cueLine: boolean;
}

/** Chinese keeps its pinyin line here until its record lands. */
const CONFIGURED: Readonly<Record<string, LanguageConfig>> = {
  zh: { pronunciation: "reading", cueLine: true },
};

/** "ja" and "ja-JP" are one language: the primary subtag in lower case, "" for no language. */
export function languageKey(language: string | null | undefined): string {
  return language?.split("-")[0]?.toLowerCase() ?? "";
}

/** The supported language a tag names by its primary subtag, or null; Chinese will need the full tag, for its script and to leave Cantonese out. */
export function languageSupport(language: string | null | undefined): LanguageSupport | null {
  const key = languageKey(language);
  return Object.hasOwn(SUPPORTED_LANGUAGES, key) ? SUPPORTED_LANGUAGES[key as SupportedTag] : null;
}

function languageConfig(language: string | null | undefined): LanguageConfig | null {
  const key = languageKey(language);
  return Object.hasOwn(CONFIGURED, key) ? (CONFIGURED[key] as LanguageConfig) : null;
}

/** How Lymi draws readings over this language's terms and examples, or null when it draws none. */
export function readingEngine(language: string | null | undefined): ReadingEngine | null {
  return languageSupport(language)?.engine ?? null;
}

/** Whether Lymi draws readings over this language's terms and examples. */
export function drawsReadings(language: string | null | undefined): boolean {
  return readingEngine(language) !== null;
}

/** The script whose face draws this language's text, or null when Onest draws it. */
export function languageScript(language: string | null | undefined): Script | null {
  return languageSupport(language)?.script ?? null;
}

/** The fields a generated clip is made from besides the term and language, so a change to one makes a new clip. */
export function speechInputs(language: string | null | undefined): readonly SpeechInput[] {
  const speech = languageSupport(language)?.speech;
  if (!speech) return [];
  return [
    ...(speech.saysReading || speech.leadIn ? (["pronunciation"] as const) : []),
    ...(speech.leadIn ? (["meaning"] as const) : []),
  ];
}

/** Languages whose pronunciation is a reading of a script that does not show it, so the field is called Reading. */
export function writtenWithReading(language: string | null | undefined): boolean {
  return (languageSupport(language) ?? languageConfig(language))?.pronunciation === "reading";
}

/**
 * Whether a term cue shows the card's pronunciation as a line before the reveal: Chinese keeps its
 * pinyin until the card is Known; Japanese draws furigana instead, and other readings wait.
 */
export function cueKeepsReading(language: string | null | undefined, known: boolean): boolean {
  return !known && !!languageConfig(language)?.cueLine;
}

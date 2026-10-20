/**
 * The one place that compares language codes: shared code asks these functions what a card's
 * language does, and never checks a tag itself. docs/proposals/supported-languages.md.
 */
import type { LanguageOut } from "../responses/languages";
import { chinese } from "./chinese";
import { japanese } from "./japanese";
import { EXAMPLE_NOTATION } from "./notation";
import type {
  LanguageFormat,
  LanguageSupport,
  ReadingEngine,
  RecordTag,
  Script,
  SpeechInput,
  SupportedTag,
} from "./types";

export * from "./names";
export { EXAMPLE_NOTATION, type ExampleNotation } from "./notation";
export type {
  DuplicateRule,
  LanguageFormat,
  LanguageSupport,
  ReadingEngine,
  RecordTag,
  Script,
  SpeechInput,
  SupportedTag,
} from "./types";

/** Each record keeps its literal type, so a registry elsewhere can follow what a record turns on. */
export const SUPPORTED_LANGUAGES = {
  ja: japanese,
} as const satisfies Record<SupportedTag, LanguageSupport>;

/** Every record, including one whose language has not yet joined SupportedTag. */
export const LANGUAGE_RECORDS = {
  ...SUPPORTED_LANGUAGES,
  zh: chinese,
} as const satisfies Record<RecordTag, LanguageSupport>;

/** A language with a row of data and no engine. docs/proposals/supported-languages.md, Tiers. */
interface LanguageConfig {
  /** What the card form calls the field. */
  pronunciation: "pronunciation";
  /** ISO 15924 codes of the scripts its terms are written in. */
  scripts: readonly string[];
  format: LanguageFormat;
}

const CONFIGURED: Readonly<Record<string, LanguageConfig>> = {
  ko: {
    pronunciation: "pronunciation",
    scripts: ["Kore"],
    format: {
      name: "Korean",
      pronunciation: "How the term is said, in Hangul, only where that differs from its spelling.",
      empty: "the term is said as written",
      never: "Not romanization or IPA.",
      sample: { term: "학교", pronunciation: "학꾜" },
      duplicates: "term",
    },
  },
};

/** "ja" and "ja-JP" are one language: the primary subtag in lower case, "" for no language. */
export function languageKey(language: string | null | undefined): string {
  return language?.split("-")[0]?.toLowerCase() ?? "";
}

/** A tag's subtags in lower case, so zh_Hant_TW and zh-hant-tw read the same. */
function subtags(language: string | null | undefined): string[] {
  return (language ?? "").trim().toLowerCase().split(/[-_]/);
}

/**
 * The record a full tag names, or null: by its primary subtag, unless an extended language subtag
 * names another language, so zh-yue, Cantonese, never draws pinyin.
 */
export function languageSupport(language: string | null | undefined): LanguageSupport | null {
  const [primary = "", second = ""] = subtags(language);
  if (!Object.hasOwn(LANGUAGE_RECORDS, primary)) return null;
  const record: LanguageSupport = LANGUAGE_RECORDS[primary as RecordTag];
  const other = /^[a-z]{3}$/.test(second) && !record.extlangs?.includes(second);
  return other ? null : record;
}

/** The record for a tag that has joined SupportedTag, for a registry keyed by it, or null. */
export function supportedLanguage(
  language: string | null | undefined,
): (typeof SUPPORTED_LANGUAGES)[SupportedTag] | null {
  const tag = languageSupport(language)?.tag;
  return tag !== undefined && Object.hasOwn(SUPPORTED_LANGUAGES, tag)
    ? SUPPORTED_LANGUAGES[tag as SupportedTag]
    : null;
}

/** How Lymi draws readings over this language's terms and examples, or null when it draws none. */
export function readingEngine(language: string | null | undefined): ReadingEngine | null {
  return languageSupport(language)?.engine ?? null;
}

/** Whether Lymi draws readings over this language's terms and examples. */
export function drawsReadings(language: string | null | undefined): boolean {
  return readingEngine(language) !== null;
}

/** Whether this language's examples carry inline readings Lymi parses, so the AI may add them. */
export function examplesCarryReadings(language: string | null | undefined): boolean {
  const engine = readingEngine(language);
  return engine !== null && EXAMPLE_NOTATION[engine] !== null;
}

/** The script whose face draws this language's text, or null when Onest draws it. */
export function languageScript(language: string | null | undefined): Script | null {
  const support = languageSupport(language);
  return support ? (support.script?.(subtags(language)) ?? support.scripts[0]) : null;
}

/** The published voice locale this tag's script speaks with, where it differs from its language's default. */
export function speechLocale(language: string | null | undefined): string | null {
  const script = languageScript(language);
  return (script && languageSupport(language)?.speech.locales?.[script]) ?? null;
}

/** Whether speech, and the phone's screen reader, says the Reading in place of the term. */
export function saysReading(language: string | null | undefined): boolean {
  return !!languageSupport(language)?.speech.saysReading;
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
  return languageSupport(language)?.pronunciation === "reading";
}

/** What the pronunciation holds, saying its empty case as a client sends it or as the model writes it. */
function describePronunciation(format: LanguageFormat, empty: "omit" | "null"): string {
  const when =
    format.empty && `${empty === "null" ? "Null" : "Leave it out"} when ${format.empty}.`;
  return [format.pronunciation, when, format.never].filter(Boolean).join(" ");
}

type FormatRow = {
  pronunciation: LanguageOut["pronunciation"]["label"];
  scripts: readonly string[];
  format: LanguageFormat;
};

function formatOut(tag: string, row: FormatRow, engine: ReadingEngine | null): LanguageOut {
  const notation = engine ? EXAMPLE_NOTATION[engine] : null;
  return {
    tag,
    name: row.format.name,
    scripts: [...row.scripts],
    pronunciation: {
      label: row.pronunciation,
      format: describePronunciation(row.format, "omit"),
      sample: row.format.sample,
    },
    example: notation
      ? { format: notation.format, pattern: notation.pattern.source, sample: notation.sample }
      : null,
    duplicates: row.format.duplicates,
  };
}

/** Every language Lymi writes in its own format, records first. */
export const LANGUAGE_FORMATS: readonly LanguageOut[] = [
  ...Object.values(LANGUAGE_RECORDS).map((record) => formatOut(record.tag, record, record.engine)),
  ...Object.entries(CONFIGURED).map(([tag, row]) => formatOut(tag, row, null)),
];

/** The row a tag's format comes from, found the way every other function here finds a language. */
function formatSource(
  language: string | null | undefined,
): { tag: string; row: FormatRow; engine: ReadingEngine | null } | null {
  const record = languageSupport(language);
  if (record) return { tag: record.tag, row: record, engine: record.engine };
  const key = languageKey(language);
  const row = Object.hasOwn(CONFIGURED, key) ? CONFIGURED[key] : undefined;
  return row ? { tag: key, row, engine: null } : null;
}

/** How this language's cards are written, or null for a language with no format of its own. */
export function languageFormat(language: string | null | undefined): LanguageOut | null {
  const source = formatSource(language);
  return source ? formatOut(source.tag, source.row, source.engine) : null;
}

/** The pronunciation format as the enrichment model reads it, where an empty field is null. */
export function pronunciationGuide(language: string | null | undefined): string | null {
  const format = formatSource(language)?.row.format;
  return format ? describePronunciation(format, "null") : null;
}

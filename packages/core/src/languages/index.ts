/**
 * The one place that compares language codes: shared code asks these functions what a card's
 * language does, and never checks a tag itself. docs/proposals/supported-languages.md.
 */
import type { LanguageOut } from "../responses/languages";
import { chinese } from "./chinese";
import { CONFIGURED, CONFIGURED_TAGS, type LanguageConfig } from "./configured";
import { japanese } from "./japanese";
import { EXAMPLE_NOTATION } from "./notation";
import { russian } from "./russian";
import type {
  LanguageFormat,
  LanguageSupport,
  ReadingEngine,
  RecordTag,
  Script,
  SpeechInput,
  StressRules,
  SupportedTag,
} from "./types";

export { CONFIGURED as CONFIGURED_LANGUAGES, type LanguageConfig } from "./configured";
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
  StressRules,
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
  ru: russian,
} as const satisfies Record<RecordTag, LanguageSupport>;

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

/** Engines that draw a reading over the script, so a term keeps a reading's room above it. */
const OVER_SCRIPT: Record<ReadingEngine, boolean> = { furigana: true, pinyin: true, stress: false };

/** Whether Lymi draws readings over this language's terms and examples, rather than marks in place. */
export function drawsReadings(language: string | null | undefined): boolean {
  const engine = readingEngine(language);
  return engine !== null && OVER_SCRIPT[engine];
}

/** Where this language's stress marks may stand, or null when it draws none in place. */
export function stressRules(language: string | null | undefined): StressRules | null {
  const support = languageSupport(language);
  return (support?.engine === "stress" && support.stress) || null;
}

/**
 * Whether this language's examples carry inline readings Lymi parses, so the AI may add them:
 * furigana's today. Pinyin joins when Chinese examples draw it (docs/proposals/chinese.md, slice 4).
 */
export function examplesCarryReadings(language: string | null | undefined): boolean {
  const engine = readingEngine(language);
  return engine !== null && EXAMPLE_NOTATION[engine] !== null;
}

/** The script whose face draws this language's text, or null when Onest draws it. */
export function languageScript(language: string | null | undefined): Script | null {
  const support = languageSupport(language);
  return support ? (support.script?.(subtags(language)) ?? support.scripts[0] ?? null) : null;
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
  ...Object.entries(CONFIGURED).flatMap(([tag, { format, ...row }]) =>
    format ? [formatOut(tag, { ...row, format }, null)] : [],
  ),
];

/** The row a tag's format comes from, found the way every other function here finds a language. */
function formatSource(
  language: string | null | undefined,
): { tag: string; row: FormatRow; engine: ReadingEngine | null } | null {
  const record = languageSupport(language);
  if (record) return { tag: record.tag, row: record, engine: record.engine };
  const tag = configuredTag(language);
  const row = tag ? CONFIGURED[tag] : undefined;
  return tag && row?.format ? { tag, row: { ...row, format: row.format }, engine: null } : null;
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

/** A configured language's own tag, found from any of its tags, so `tl` is Filipino's `fil` and `pt-BR` is `pt-br`. */
function configuredTag(language: string | null | undefined): string | null {
  if (languageSupport(language)) return null;
  // A row for a region, such as pt-br, wins over its language's own.
  const [primary = "", ...rest] = subtags(language);
  const region = rest.find((part) => /^[a-z]{2}$/.test(part));
  return (
    (region && CONFIGURED_TAGS.get(`${primary}-${region}`)) ||
    (CONFIGURED_TAGS.get(primary) ?? null)
  );
}

/** A configured language's row, found from any of its tags, or null. */
export function configuredLanguage(language: string | null | undefined): LanguageConfig | null {
  const tag = configuredTag(language);
  return tag ? (CONFIGURED[tag] ?? null) : null;
}

/**
 * What the card form calls the pronunciation: Reading for a script that does not show its sound,
 * Stress where it holds the term with its stress marked, else Pronunciation.
 */
export function pronunciationName(
  language: string | null | undefined,
): "reading" | "stress" | "pronunciation" {
  return languageSupport(language)?.pronunciation ?? "pronunciation";
}

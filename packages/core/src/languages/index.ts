import type { LanguageOut } from "../responses/languages";
import { cantonese } from "./cantonese";
import { chinese } from "./chinese";
import { CONFIGURED, CONFIGURED_TAGS, type LanguageConfig } from "./configured";
import { japanese } from "./japanese";
import { EXAMPLE_NOTATION } from "./notation";
import { russian } from "./russian";
import { tamil } from "./tamil";
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
import { ukrainian } from "./ukrainian";

export {
  CONFIGURED as CONFIGURED_LANGUAGES,
  type ConfiguredTag,
  type LanguageConfig,
} from "./configured";
export { type TextDirection, textDirection } from "./direction";
export * from "./names";
export { EXAMPLE_NOTATION, type ExampleNotation } from "./notation";
export { fitsLanguage } from "./scripts";
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
export { READING_ENGINES } from "./types";

export const SUPPORTED_LANGUAGES = {
  ja: japanese,
  zh: chinese,
  uk: ukrainian,
  ru: russian,
} as const satisfies Record<SupportedTag, LanguageSupport>;

export const LANGUAGE_RECORDS = {
  ...SUPPORTED_LANGUAGES,
  ta: tamil,
  yue: cantonese,
} as const satisfies Record<RecordTag, LanguageSupport>;

export function languageKey(language: string | null | undefined): string {
  return language?.split("-")[0]?.toLowerCase() ?? "";
}

function subtags(language: string | null | undefined): string[] {
  return (language ?? "").trim().toLowerCase().split(/[-_]/);
}

const hasRecord = (tag: string): tag is RecordTag => Object.hasOwn(LANGUAGE_RECORDS, tag);

export function languageSupport(language: string | null | undefined): LanguageSupport | null {
  const [primary = "", second = ""] = subtags(language);
  if (!hasRecord(primary)) return null;
  const record: LanguageSupport = LANGUAGE_RECORDS[primary];
  if (!/^[a-z]{3}$/.test(second) || record.extlangs?.includes(second)) return record;
  return hasRecord(second) ? LANGUAGE_RECORDS[second] : null;
}

export function supportedLanguage(
  language: string | null | undefined,
): (typeof SUPPORTED_LANGUAGES)[SupportedTag] | null {
  const tag = languageSupport(language)?.tag;
  return tag !== undefined && Object.hasOwn(SUPPORTED_LANGUAGES, tag)
    ? SUPPORTED_LANGUAGES[tag as SupportedTag]
    : null;
}

export function readingEngine(language: string | null | undefined): ReadingEngine | null {
  return languageSupport(language)?.engine ?? null;
}

const OVER_SCRIPT: Record<ReadingEngine, boolean> = {
  furigana: true,
  pinyin: true,
  jyutping: true,
  stress: false,
  indic: true,
};

export function drawsReadings(language: string | null | undefined): boolean {
  const engine = readingEngine(language);
  return engine !== null && OVER_SCRIPT[engine];
}

export function stressRules(language: string | null | undefined): StressRules | null {
  const support = languageSupport(language);
  return (support?.engine === "stress" && support.stress) || null;
}

export function examplesCarryReadings(language: string | null | undefined): boolean {
  const engine = readingEngine(language);
  return engine === "stress" || (engine !== null && EXAMPLE_NOTATION[engine] !== null);
}

export function languageScript(language: string | null | undefined): Script | null {
  const support = languageSupport(language);
  return support ? (support.script?.(subtags(language)) ?? support.scripts[0] ?? null) : null;
}

export function speechLocale(language: string | null | undefined): string | null {
  const script = languageScript(language);
  return (script && languageSupport(language)?.speech.locales?.[script]) ?? null;
}

export function speechContext(language: string | null | undefined): string | null {
  return (
    languageSupport(language)?.speech.context ?? configuredLanguage(language)?.speechContext ?? null
  );
}

export function saysReading(language: string | null | undefined): boolean {
  return !!languageSupport(language)?.speech.saysReading;
}

export function speechInputs(language: string | null | undefined): readonly SpeechInput[] {
  const speech = languageSupport(language)?.speech;
  if (!speech) return [];
  return [
    ...(speech.saysReading || speech.leadIn ? (["pronunciation"] as const) : []),
    ...(speech.leadIn ? (["meaning"] as const) : []),
  ];
}

function describePronunciation(format: LanguageFormat, empty: "omit" | "null"): string {
  const when =
    format.empty && `${empty === "null" ? "Null" : "Leave it out"} when ${format.empty}.`;
  return [format.pronunciation, when, format.never].filter(Boolean).join(" ");
}

type FormatRow = {
  pronunciation: LanguageOut["pronunciation"]["label"];
  scripts: readonly string[];
  written?: readonly string[];
  format: LanguageFormat;
};

function formatOut(tag: string, row: FormatRow, engine: ReadingEngine | null): LanguageOut {
  const notation = engine ? EXAMPLE_NOTATION[engine] : null;
  return {
    tag,
    name: row.format.name,
    scripts: [...(row.written ?? row.scripts)],
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

export const LANGUAGE_FORMATS: readonly LanguageOut[] = [
  ...Object.values(LANGUAGE_RECORDS).map((record) => formatOut(record.tag, record, record.engine)),
  ...Object.entries(CONFIGURED).flatMap(([tag, { format, ...row }]) =>
    format ? [formatOut(tag, { ...row, format }, null)] : [],
  ),
];

function formatSource(
  language: string | null | undefined,
): { tag: string; row: FormatRow; engine: ReadingEngine | null } | null {
  const record = languageSupport(language);
  if (record) return { tag: record.tag, row: record, engine: record.engine };
  const tag = configuredTag(language);
  const row = tag ? CONFIGURED[tag] : undefined;
  return tag && row?.format ? { tag, row: { ...row, format: row.format }, engine: null } : null;
}

export function languageFormat(language: string | null | undefined): LanguageOut | null {
  const source = formatSource(language);
  return source ? formatOut(source.tag, source.row, source.engine) : null;
}

export function pronunciationGuide(language: string | null | undefined): string | null {
  const format = formatSource(language)?.row.format;
  return format ? describePronunciation(format, "null") : null;
}

function configuredTag(language: string | null | undefined): string | null {
  if (languageSupport(language)) return null;
  const [primary = "", ...rest] = subtags(language);
  const region = rest.find((part) => /^[a-z]{2}$/.test(part));
  return (
    (region && CONFIGURED_TAGS.get(`${primary}-${region}`)) ||
    (CONFIGURED_TAGS.get(primary) ?? null)
  );
}

export function configuredLanguage(language: string | null | undefined): LanguageConfig | null {
  const tag = configuredTag(language);
  return tag ? (CONFIGURED[tag] ?? null) : null;
}

export function pronunciationName(
  language: string | null | undefined,
): "reading" | "stress" | "pronunciation" {
  return languageSupport(language)?.pronunciation ?? "pronunciation";
}

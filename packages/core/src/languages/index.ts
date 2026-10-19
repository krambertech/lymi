/**
 * The one place that compares language codes: shared code asks these functions what a card's
 * language does, and never checks a tag itself. docs/proposals/supported-languages.md.
 */
import type { LanguageOut } from "../responses/languages";
import { japanese } from "./japanese";
import { EXAMPLE_NOTATION } from "./notation";
import type {
  LanguageFormat,
  LanguageSupport,
  ReadingEngine,
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
  Script,
  SpeechInput,
  SupportedTag,
} from "./types";

/** Each record keeps its literal type, so a registry elsewhere can follow what a record turns on. */
export const SUPPORTED_LANGUAGES = {
  ja: japanese,
} as const satisfies Record<SupportedTag, LanguageSupport>;

/** A language with a row of data and no engine. */
interface LanguageConfig {
  /** What the card form calls the field: a Reading for a script that does not show its sound. */
  pronunciation: "reading" | "pronunciation";
  /** The cue shows the pronunciation as a line until the card is Known. */
  cueLine: boolean;
  /** ISO 15924 code of the script its terms are written in. */
  script: string;
  format: LanguageFormat;
}

/** Chinese keeps its pinyin line here until its record lands. */
const CONFIGURED: Readonly<Record<string, LanguageConfig>> = {
  zh: {
    pronunciation: "reading",
    cueLine: true,
    script: "Hani",
    format: {
      name: "Chinese",
      pronunciation: "Pinyin with tone marks, not IPA.",
      sample: { term: "学习", pronunciation: "xuéxí" },
      duplicates: "term",
    },
  },
  ko: {
    pronunciation: "pronunciation",
    cueLine: false,
    script: "Kore",
    format: {
      name: "Korean",
      pronunciation:
        "How the term is said, in Hangul, only where that differs from its spelling. Null when the term is said as written. Not romanization or IPA.",
      sample: { term: "학교", pronunciation: "학꾜" },
      duplicates: "term",
    },
  },
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

function formatOut(
  tag: string,
  row: {
    pronunciation: LanguageOut["pronunciation"]["label"];
    script: string;
    format: LanguageFormat;
  },
  engine: ReadingEngine | null,
): LanguageOut {
  const notation = engine ? EXAMPLE_NOTATION[engine] : null;
  return {
    tag,
    name: row.format.name,
    script: row.script,
    pronunciation: {
      label: row.pronunciation,
      format: row.format.pronunciation,
      sample: row.format.sample,
    },
    example: notation
      ? { format: notation.format, pattern: notation.pattern.source, sample: notation.sample }
      : null,
    duplicates: row.format.duplicates,
  };
}

/** Every language Lymi writes in its own format, supported ones first. */
export const LANGUAGE_FORMATS: readonly LanguageOut[] = [
  ...Object.values(SUPPORTED_LANGUAGES).map((record) =>
    formatOut(record.tag, record, record.engine),
  ),
  ...Object.entries(CONFIGURED).map(([tag, row]) => formatOut(tag, row, null)),
];

/** How this language's cards are written, or null for a language with no format of its own. */
export function languageFormat(language: string | null | undefined): LanguageOut | null {
  const key = languageKey(language);
  return LANGUAGE_FORMATS.find((format) => format.tag === key) ?? null;
}

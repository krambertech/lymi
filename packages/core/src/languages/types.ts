export type SupportedTag = "ja" | "zh" | "uk" | "ru";

export type RecordTag = SupportedTag | "ta" | "yue";

export type Script = "Jpan" | "Hans" | "Hant" | "Taml";

export const READING_ENGINES = ["furigana", "pinyin", "jyutping", "stress", "indic"] as const;
export type ReadingEngine = (typeof READING_ENGINES)[number];

export interface StressRules {
  vowels: string;
  restores?: Readonly<Record<string, string>>;
  apostrophes?: boolean;
}

export type DuplicateRule = "term" | "term-and-reading";

export interface LanguageFormat {
  name: string;
  pronunciation: string;
  empty: string | null;
  never: string | null;
  sample: { term: string; pronunciation: string };
  duplicates: DuplicateRule;
}

interface MarksInPlace {
  engine: "stress";
  stress: StressRules;
  pronunciation: "stress";
}

interface OverTheScript {
  engine: Exclude<ReadingEngine, "stress">;
  stress?: never;
  pronunciation: "reading";
}

interface LanguageRecord {
  tag: RecordTag;
  scripts: readonly Script[];
  written?: readonly string[];
  script?: (subtags: readonly string[]) => Script;
  extlangs?: readonly string[];
  format: LanguageFormat;
  speech: {
    saysReading: boolean;
    leadIn: boolean;
    context?: string;
    locales?: Partial<Record<Script, string>>;
  };
}

export type LanguageSupport = LanguageRecord & (MarksInPlace | OverTheScript);

export type SpeechInput = "pronunciation" | "meaning";

/** A tag Lymi treats in full. A tag joins only in the last delivery slice for its language. */
export type SupportedTag = "ja" | "zh";

/**
 * A tag with a record in the index: each supported tag, and one whose language is still landing.
 * Registries keyed by SupportedTag, such as prompts and pages, leave it out until it joins.
 */
export type RecordTag = SupportedTag | "ru" | "ta" | "yue";

/** ISO 15924 scripts whose faces Lymi names, because Onest has none of their letters. */
export type Script = "Jpan" | "Hans" | "Hant" | "Taml";

/**
 * How a reading is drawn: furigana puts kana over kanji, and pinyin and Jyutping one syllable over
 * each Han character, all aligned at display; stress draws the term with its marks in place; indic
 * works each word's reading out from its spelling and draws it over the whole word.
 */
export type ReadingEngine = "furigana" | "pinyin" | "jyutping" | "stress" | "indic";

/** Where a stress mark may stand, for the marks-in-place engine. */
export interface StressRules {
  /** The lower-case vowels an acute may stand on. */
  vowels: string;
  /**
   * Letters whose dots are themselves a mark, each with the letter natives write in its place, so
   * a pronunciation may restore ё where the term writes е. Such a letter is always stressed and
   * takes no acute.
   */
  restores?: Readonly<Record<string, string>>;
}

/** What makes two cards of a language the same card: the term alone, or the term and a differing Reading. */
export type DuplicateRule = "term" | "term-and-reading";

/**
 * How a language's cards are written, as `GET /api/languages`, the MCP server, the docs and the
 * enrichment guide all say it, so none of them can drift from another.
 */
export interface LanguageFormat {
  /** The language's English name. */
  name: string;
  /** What the pronunciation field holds, in words a client and the model both follow. */
  pronunciation: string;
  /** When the field stays empty, as a clause after "when", or null when every term has one. */
  empty: string | null;
  /** A last sentence on what the field never holds, or null. */
  never: string | null;
  /** A term and the pronunciation that goes with it. */
  sample: { term: string; pronunciation: string };
  duplicates: DuplicateRule;
}

/** What a supported language does differently, chosen from the card's language tag alone. */
export interface LanguageSupport {
  tag: RecordTag;
  /**
   * The scripts whose faces it is drawn in; the first unless `script` picks another from the full
   * tag. None when Onest draws its letters.
   */
  scripts: readonly Script[];
  /** The ISO 15924 scripts its terms are written in, published where `scripts` names no face for them. */
  written?: readonly string[];
  /** The script a full tag names, from its lower-case subtags. */
  script?: (subtags: readonly string[]) => Script;
  /**
   * Extended language subtags that are still this language, such as Mandarin's zh-cmn. Any other
   * three-letter second subtag names another language, such as Cantonese's zh-yue or Hakka's zh-hak,
   * which takes that language's record when it has one.
   */
  extlangs?: readonly string[];
  engine: ReadingEngine;
  /** Where the stress engine lets a mark stand. */
  stress?: StressRules;
  /** What the pronunciation holds, which the card form names the field after: a Reading, or the term with its stress marked. */
  pronunciation: "reading" | "stress";
  format: LanguageFormat;
  speech: {
    /** Generated speech says the card's Reading in place of the term, so 上手 is said as the card reads it. */
    saysReading: boolean;
    /** A lead-in written from the reading and meaning may go before the term. docs/lead-ins.md. */
    leadIn: boolean;
    /** The published voice locale for a script where it differs from the language's default. */
    locales?: Partial<Record<Script, string>>;
  };
}

/** A card field a generated clip is made from, besides its term and language. */
export type SpeechInput = "pronunciation" | "meaning";

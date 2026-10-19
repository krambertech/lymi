/** A tag Lymi treats in full. A tag joins only in the last delivery slice for its language. */
export type SupportedTag = "ja";

/**
 * A tag with a record in the index: each supported tag, and one whose language is still landing.
 * Registries keyed by SupportedTag, such as prompts and pages, leave it out until it joins.
 */
export type RecordTag = SupportedTag | "zh";

/** ISO 15924 scripts whose faces Lymi names, because Onest has none of their letters. */
export type Script = "Jpan" | "Hans" | "Hant";

/** How a reading is drawn: furigana puts kana over kanji, pinyin one syllable over each hanzi; both align at display. */
export type ReadingEngine = "furigana" | "pinyin";

/** What a supported language does differently, chosen from the card's language tag alone. */
export interface LanguageSupport {
  tag: RecordTag;
  /** The scripts it is written in; the first unless `script` picks another from the full tag. */
  scripts: readonly [Script, ...Script[]];
  /** The script a full tag names, from its lower-case subtags. */
  script?: (subtags: readonly string[]) => Script;
  /** Second subtags naming another language the record leaves out, such as Cantonese's zh-yue. */
  excludes?: readonly string[];
  engine: ReadingEngine;
  /** The pronunciation holds a Reading, and the card form calls the field so. */
  pronunciation: "reading";
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

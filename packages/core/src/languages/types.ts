/** A tag Lymi treats in full. A tag joins only in the last delivery slice for its language. */
export type SupportedTag = "ja";

/** ISO 15924 scripts whose faces Lymi names, because Onest has none of their letters. */
export type Script = "Jpan";

/** How a reading is drawn: furigana puts kana over kanji, aligned at display. */
export type ReadingEngine = "furigana";

/** What a supported language does differently, chosen from the card's language tag alone. */
export interface LanguageSupport {
  tag: SupportedTag;
  script: Script;
  engine: ReadingEngine;
  /** The pronunciation holds a Reading, and the card form calls the field so. */
  pronunciation: "reading";
  speech: {
    /** Generated speech says the card's Reading in place of the term, so 上手 is said as the card reads it. */
    saysReading: boolean;
    /** A lead-in written from the reading and meaning may go before the term. docs/lead-ins.md. */
    leadIn: boolean;
  };
}

/** A card field a generated clip is made from, besides its term and language. */
export type SpeechInput = "pronunciation" | "meaning";

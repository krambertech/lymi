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
  /** Generated speech says the Reading, led in by the meaning, so a new reading or meaning makes a new clip. */
  speech: "reading";
}

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type CardText, normalizeCardText } from "../card-text";
import { formatPinyin, parsePinyin, stripPinyin } from "../pinyin";
import {
  formatReadings,
  parseReadings,
  type ReadingSegment,
  readingKey,
  readingPairs,
  stripReadings,
  termReading,
} from "../reading";
import ja from "./fixtures/ja.json";
import zh from "./fixtures/zh.json";
import {
  LANGUAGE_RECORDS,
  languageScript,
  languageSupport,
  type ReadingEngine,
  type RecordTag,
} from "./index";

interface Fixture {
  /** Tags that must resolve to the record, each with the script it is written in. */
  tags: Record<string, string>;
  /** Each term with its pronunciation, and how it is drawn in inline notation, or null for plain. */
  terms: { term: string; pronunciation: string; drawn: string | null }[];
  /** Examples with inline readings, and the text with them taken out. */
  examples: { text: string; plain: string }[];
  /** Pronunciations of one term that must each give one reading key. */
  keys: { term: string; pronunciations: string[] }[];
  /** Readings of one term that must each give a different key, so they stay two cards. */
  apart?: { term: string; pronunciations: string[] }[];
  /** Pronunciations that are not a reading of the term and give no key, so they never split it. */
  noKey: { term: string; pronunciation: string }[];
  /** What a write sends, what Lymi stores, and which fields it converted. */
  inputs: { sent: CardText; stored: CardText; normalized: string[] }[];
  /** The Known pairs a term gives, where the engine pairs other than by runs of the term. */
  pairs?: { term: string; pronunciation: string; pairs: string[] }[];
}

/** Each engine's inline notation. */
const NOTATION: Record<
  ReadingEngine,
  {
    parse: (text: string) => ReadingSegment[];
    format: (segments: readonly ReadingSegment[]) => string;
    strip: (text: string) => string;
  }
> = {
  furigana: {
    parse: parseReadings,
    format: formatReadings,
    strip: (text) => stripReadings(text, "ja"),
  },
  pinyin: { parse: parsePinyin, format: formatPinyin, strip: stripPinyin },
};

const FIXTURES: Record<RecordTag, Fixture> = { ja, zh };

const TOKENS = readFileSync(new URL("../../../design/tokens.css", import.meta.url), "utf8");

describe.each(Object.values(LANGUAGE_RECORDS))("$tag", (record) => {
  const fixture = FIXTURES[record.tag];
  const notation = NOTATION[record.engine];

  it("is chosen from each of its tags, in its script", () => {
    for (const [tag, script] of Object.entries(fixture.tags)) {
      expect(languageSupport(tag)).toBe(record);
      expect(languageScript(tag)).toBe(script);
    }
  });

  it("has a face token for each script, read by the web's :lang() rule and the phone", () => {
    for (const script of record.scripts)
      expect(TOKENS).toContain(`--face-${script.toLowerCase()}:`);
    expect(TOKENS).toContain(`:lang(${record.tag})`);
  });

  it("draws each term's reading", () => {
    for (const { term, pronunciation, drawn } of fixture.terms) {
      const segments = termReading({ term, pronunciation, language: record.tag });
      expect(segments && notation.format(segments)).toBe(drawn);
    }
  });

  it("gives each example back when its readings are parsed, written or removed", () => {
    for (const { text, plain } of fixture.examples) {
      expect(notation.format(notation.parse(text))).toBe(text);
      expect(notation.strip(text)).toBe(plain);
    }
  });

  it("keys one reading the same in every form", () => {
    for (const { term, pronunciations } of fixture.keys) {
      const keys = pronunciations.map((pronunciation) =>
        readingKey({ term, pronunciation, language: record.tag }),
      );
      expect(keys[0]).not.toBeNull();
      expect(new Set(keys).size).toBe(1);
    }
  });

  it("keys different readings of one term apart", () => {
    for (const { term, pronunciations } of fixture.apart ?? []) {
      const keys = pronunciations.map((pronunciation) =>
        readingKey({ term, pronunciation, language: record.tag }),
      );
      expect(new Set(keys).size).toBe(pronunciations.length);
    }
  });

  it("gives no key for a pronunciation that is not a reading of the term", () => {
    for (const card of fixture.noKey)
      expect(readingKey({ ...card, language: record.tag })).toBeNull();
  });

  it("pairs each Known term's characters with their readings", () => {
    for (const { pairs, ...card } of fixture.pairs ?? [])
      expect(readingPairs({ ...card, language: record.tag })).toEqual(pairs);
  });

  it("stores only input with one possible meaning converted", () => {
    for (const { sent, stored, normalized } of fixture.inputs) {
      expect(normalizeCardText(record.tag, sent)).toEqual({ fields: stored, normalized });
    }
  });
});

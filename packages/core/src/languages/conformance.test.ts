import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type CardText, normalizeCardText } from "../card-text";
import { formatReadings, parseReadings, readingKey, stripReadings, termReading } from "../reading";
import ja from "./fixtures/ja.json";
import { languageScript, languageSupport, SUPPORTED_LANGUAGES, type SupportedTag } from "./index";

interface Fixture {
  /** Tags that must resolve to the record. */
  tags: string[];
  /** Each term with its pronunciation, and how it is drawn in inline notation, or null for plain. */
  terms: { term: string; pronunciation: string; drawn: string | null }[];
  /** Examples with inline readings, and the text with them taken out. */
  examples: { text: string; plain: string }[];
  /** Pronunciations of one term that must each give one reading key. */
  keys: { term: string; pronunciations: string[] }[];
  /** Pronunciations that are not a reading of the term and give no key, so they never split it. */
  noKey: { term: string; pronunciation: string }[];
  /** What a write sends, what Lymi stores, and which fields it converted. */
  inputs: { sent: CardText; stored: CardText; normalized: string[] }[];
}

const FIXTURES: Record<SupportedTag, Fixture> = { ja };

const TOKENS = readFileSync(new URL("../../../design/tokens.css", import.meta.url), "utf8");

describe.each(Object.values(SUPPORTED_LANGUAGES))("$tag", (record) => {
  const fixture = FIXTURES[record.tag];

  it("is chosen from each of its tags", () => {
    for (const tag of fixture.tags) expect(languageSupport(tag)).toBe(record);
  });

  it("has a face token for its script, read by the web's :lang() rule and the phone", () => {
    expect(languageScript(record.tag)).toBe(record.script);
    expect(TOKENS).toContain(`--face-${record.script.toLowerCase()}:`);
    expect(TOKENS).toContain(`:lang(${record.tag})`);
  });

  it("draws each term's reading", () => {
    for (const { term, pronunciation, drawn } of fixture.terms) {
      const segments = termReading({ term, pronunciation, language: record.tag });
      expect(segments && formatReadings(segments)).toBe(drawn);
    }
  });

  it("gives each example back when its readings are parsed, written or removed", () => {
    for (const { text, plain } of fixture.examples) {
      expect(formatReadings(parseReadings(text))).toBe(text);
      expect(stripReadings(text)).toBe(plain);
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

  it("gives no key for a pronunciation that is not a reading of the term", () => {
    for (const card of fixture.noKey)
      expect(readingKey({ ...card, language: record.tag })).toBeNull();
  });

  it("stores only input with one possible meaning converted", () => {
    for (const { sent, stored, normalized } of fixture.inputs) {
      expect(normalizeCardText(record.tag, sent)).toEqual({ fields: stored, normalized });
    }
  });
});

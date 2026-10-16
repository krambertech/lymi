import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  decodeTextImport,
  detectSeparators,
  encodeTextImport,
  normaliseText,
  parseDelimited,
} from "./import-text";

const fixture = (name: string) =>
  readFileSync(join(import.meta.dirname, "fixtures/quizlet", name), "utf8");

const TAB_NL = { field: "\t", row: "\n" };

describe("Quizlet fixtures", () => {
  it("01: Quizlet's default Tab and New line", () => {
    const text = fixture("01-default-tab-newline.txt");
    expect(detectSeparators(text)).toMatchObject({ ...TAB_NL, confidence: 1 });
    const parsed = parseDelimited(text, TAB_NL);
    expect(parsed.cards).toHaveLength(5);
    expect(parsed.cards[0]).toEqual({ term: "der Hund", definition: "the dog" });
    expect(parsed.cards[4]).toEqual({ term: "schön", definition: "beautiful, nice" });
    expect(parsed).toMatchObject({ oneSided: 0, blank: 0, repeated: 0 });
  });

  it("02: Comma and Semicolon keep a comma inside a definition", () => {
    const text = fixture("02-comma-semicolon.txt");
    const seps = detectSeparators(text);
    expect(seps).toMatchObject({ field: ",", row: ";", confidence: 1 });
    const parsed = parseDelimited(text, seps);
    expect(parsed.cards).toHaveLength(3);
    expect(parsed.cards[1]).toEqual({
      term: "mitochondria",
      definition: "powerhouse of the cell, makes ATP",
    });
    expect(parsed.blank).toBe(0);
  });

  it("03: custom || and ## keep line breaks, tabs and quotes", () => {
    const text = fixture("03-custom-separators-multiline.txt");
    const parsed = parseDelimited(text, { field: " || ", row: "##" });
    expect(parsed.cards).toEqual([
      { term: "Q: capital of Estonia?", definition: "Tallinn\n(since 1918)" },
      { term: "Q: largest lake?", definition: "Peipus" },
      { term: "Q: tab\tinside term", definition: 'definition with\ttab and "quotes"' },
    ]);
    // Detection finds the custom marks too, though the guide tells the learner to set them.
    const seps = detectSeparators(text);
    expect(seps).toMatchObject({ field: "||", row: "##" });
    expect(parseDelimited(text, seps).cards).toEqual(parsed.cards);
  });

  it("04: BOM, CRLF, Cyrillic, Hebrew, Arabic, blank rows and a repeated term", () => {
    const text = fixture("04-cyrillic-rtl-bom.txt");
    expect(detectSeparators(text)).toMatchObject(TAB_NL);
    const parsed = parseDelimited(text, TAB_NL);
    expect(parsed.cards).toHaveLength(6);
    expect(parsed.cards[0]?.term).toBe("привіт");
    expect(parsed.cards.some((c) => /[\r\ufeff]/.test(c.term + c.definition))).toBe(false);
    expect(parsed.cards[3]).toEqual({ term: "שלום", definition: "peace, hello" });
    expect(parsed.cards[4]).toEqual({ term: "مرحبا", definition: "hello" });
    expect(parsed).toMatchObject({ blank: 2, oneSided: 0, repeated: 1 });
  });

  it("05: blank and one-sided rows skip, extra columns stay in the definition", () => {
    const text = fixture("05-edge-cases.txt");
    expect(detectSeparators(text)).toMatchObject(TAB_NL);
    const parsed = parseDelimited(text, TAB_NL);
    expect(parsed).toMatchObject({ blank: 2, oneSided: 2, repeated: 0 });
    // "normal card", 200 numbered words, the quoted row and the three-column row.
    expect(parsed.cards).toHaveLength(203);
    expect(parsed.cards).toContainEqual({ term: "x", definition: "y\tz extra column" });
    // With Tab, quotes are Quizlet's literal text.
    expect(parsed.cards).toContainEqual({
      term: '"quoted, term"',
      definition: '"quoted ""def"""',
    });
    expect(parsed.cards.at(-1)).toEqual({ term: "word200", definition: "meaning 200" });
  });
});

describe("parseDelimited", () => {
  it("reads a quoted row as CSV when the field separator is a comma", () => {
    const parsed = parseDelimited('"one, two","say ""hi"""\nplain,"literal', {
      field: ",",
      row: "\n",
    });
    expect(parsed.cards).toEqual([
      { term: "one, two", definition: 'say "hi"' },
      { term: "plain", definition: '"literal' },
    ]);
  });

  it("drops control characters and keeps inner spaces", () => {
    expect(normaliseText("\ufeffa\u0007b\r\nc\rd")).toBe("ab\nc\nd");
    expect(parseDelimited("  big   dog \t a  b  ", TAB_NL).cards).toEqual([
      { term: "big   dog", definition: "a  b" },
    ]);
  });

  it("counts repeated terms regardless of case and keeps every card", () => {
    const parsed = parseDelimited("Bank\triver side\nbank\tmoney place\nBANK\tbench", TAB_NL);
    expect(parsed.cards).toHaveLength(3);
    expect(parsed.repeated).toBe(2);
  });

  it("parses 5,000 rows quickly enough to re-render on every change", () => {
    const text = Array.from({ length: 5000 }, (_, i) => `term ${i}\tmeaning ${i}`).join("\n");
    const started = performance.now();
    const parsed = parseDelimited(text, detectSeparators(text));
    expect(parsed.cards).toHaveLength(5000);
    expect(performance.now() - started).toBeLessThan(100);
  });
});

describe("text import envelope", () => {
  it("round-trips the choices and the text", () => {
    const text = "a\tb\nc\td";
    const raw = encodeTextImport(
      { separators: { field: "||", row: "##" }, deckName: "German", deckId: "d1" },
      text,
    );
    expect(decodeTextImport(raw)).toEqual({
      meta: { separators: { field: "||", row: "##" }, deckName: "German", deckId: "d1" },
      text,
    });
  });

  it("reads plain text, or a header it can't trust, as text with no choices", () => {
    expect(decodeTextImport("a\tb")).toEqual({ meta: null, text: "a\tb" });
    const bad = decodeTextImport('LYMI-TEXT-IMPORT 1\n{"separators":{"field":"","row":"x"}}\na\tb');
    expect(bad).toEqual({ meta: null, text: "a\tb" });
  });
});

import { describe, expect, it } from "vitest";
import { normalizeCardText } from "./card-text";
import { pitchIntoReading } from "./import";
import { PITCH_DOT, pitchLayout, pitchPatterns, sourcePitch, storedPitch } from "./pitch";
import {
  kanaReading,
  pronunciationText,
  readingKey,
  sameSpokenReading,
  termReading,
  termShowsPronunciation,
} from "./reading";

const shape = (pronunciation: string) =>
  pitchPatterns({ language: "ja", pronunciation }).map((pattern) => ({
    highs: pattern.morae.map((mora) => (mora.high ? "H" : "L")).join(""),
    particle: pattern.particleHigh ? "H" : "L",
  }));

describe("pitchPatterns", () => {
  it("draws the four accent shapes", () => {
    expect(shape("ともだち [0]")).toEqual([{ highs: "LHHH", particle: "H" }]);
    expect(shape("はし [1]")).toEqual([{ highs: "HL", particle: "L" }]);
    expect(shape("おとこ [3]")).toEqual([{ highs: "LHH", particle: "L" }]);
    expect(shape("かんがえる [4]")).toEqual([{ highs: "LHHHL", particle: "L" }]);
  });

  it("counts a small kana with its mora and ん, っ and ー as their own", () => {
    const [pattern] = pitchPatterns({ language: "ja", pronunciation: "としょかん [2]" });
    expect(pattern?.morae.map((mora) => mora.text)).toEqual(["と", "しょ", "か", "ん"]);
    expect(pattern?.morae.map((mora) => mora.high)).toEqual([false, true, false, false]);
    expect(shape("コーヒー [3]")).toEqual([{ highs: "LHHL", particle: "L" }]);
  });

  it("keeps a flat word and a fall on the last mora apart at the particle", () => {
    const [flat] = shape("はし [0]");
    const [last] = shape("はし [2]");
    expect(flat?.highs).toBe(last?.highs);
    expect(flat?.particle).not.toBe(last?.particle);
  });

  it("gives each accepted accent its own pattern", () => {
    expect(
      pitchPatterns({ language: "ja", pronunciation: "かんがえる [4][3]" }).map((p) => p.position),
    ).toEqual([4, 3]);
  });

  it("charts nothing without an accent, outside Japanese or past a phone's width", () => {
    expect(pitchPatterns({ language: "ja", pronunciation: "はし" })).toEqual([]);
    expect(pitchPatterns({ language: "ja", pronunciation: "/haʃi/" })).toEqual([]);
    expect(pitchPatterns({ language: "es", pronunciation: "はし [1]" })).toEqual([]);
    expect(pitchPatterns({ language: "ja", pronunciation: "はし [5]" })).toEqual([]);
    expect(pitchPatterns({ language: "ja", pronunciation: `${"あ".repeat(13)} [1]` })).toEqual([]);
  });

  it("stops the line at each dot's edge, so a dot stays hollow", () => {
    const [pattern] = pitchPatterns({ language: "ja", pronunciation: "ともだち [0]" });
    const { morae, segments } = pitchLayout(pattern as NonNullable<typeof pattern>);
    const [first] = segments;
    const [from, to] = morae as [(typeof morae)[0], (typeof morae)[0]];
    expect(Math.hypot((first?.x1 ?? 0) - from.x, (first?.y1 ?? 0) - from.y)).toBeCloseTo(PITCH_DOT);
    expect(Math.hypot((first?.x2 ?? 0) - to.x, (first?.y2 ?? 0) - to.y)).toBeCloseTo(PITCH_DOT);
  });

  it("lays a two-kana mora out wider and ends at the tail", () => {
    const [pattern] = pitchPatterns({ language: "ja", pronunciation: "しゃ [1]" });
    const layout = pitchLayout(pattern as NonNullable<typeof pattern>);
    expect(layout.morae[0]?.width).toBeGreaterThan(11);
    expect(layout.segments.at(-1)).toMatchObject({ x2: layout.width, y2: 8 });
  });
});

describe("a Reading with a pitch accent", () => {
  const card = { term: "図書館", language: "ja", pronunciation: "としょかん [2]" };

  it("reads as its kana for duplicates, furigana, audio and a line of text", () => {
    expect(kanaReading(card)).toBe("としょかん");
    expect(readingKey(card)).toBe("としょかん");
    expect(readingKey({ ...card, pronunciation: "としょかん" })).toBe("としょかん");
    expect(termReading(card)).toEqual([{ text: "図書館", reading: "としょかん" }]);
    expect(pronunciationText(card)).toBe("としょかん");
  });

  it("needs no line of its own under a term written in the same kana", () => {
    expect(
      termShowsPronunciation({
        term: "ありがとう",
        language: "ja",
        pronunciation: "ありがとう [2]",
      }),
    ).toBe(true);
  });

  it("says the same when only the accent changes, so generated speech stays", () => {
    expect(sameSpokenReading(card, "としょかん [0]")).toBe(true);
    expect(sameSpokenReading(card, "としょかん")).toBe(true);
    expect(sameSpokenReading(card, "としょしつ [2]")).toBe(false);
    expect(sameSpokenReading(card, null)).toBe(false);
  });

  it("leaves another language's text alone", () => {
    expect(pronunciationText({ language: "en", pronunciation: "tʃeə [1]" })).toBe("tʃeə [1]");
  });
});

describe("storedPitch", () => {
  it.each([
    ["としょꜜかん", "としょかん [2]"],
    ["はꜜし [1]", "はし [1]"],
    ["としょかん[2]", "としょかん [2]"],
    ["としょかん ［２］", "としょかん [2]"],
    ["かんがえる [4] [3]", "かんがえる [4][3]"],
    ["かんがえる [4][4]", "かんがえる [4]"],
    ["はし [9]", "はし"],
    ["はし", "はし"],
    ["/haʃi/ [1]", "/haʃi/ [1]"],
  ])("stores %s as %s", (sent, stored) => {
    expect(storedPitch(sent)).toBe(stored);
  });

  it("runs on a write, and a bracketed term still meets its Reading", () => {
    expect(normalizeCardText("ja", { pronunciation: "はꜜし" }).fields.pronunciation).toBe(
      "はし [1]",
    );
    expect(
      normalizeCardText("ja", { term: "食[た]べる", pronunciation: "たべる [2]" }).fields,
    ).toEqual({ term: "食べる", pronunciation: "たべる [2]" });
  });
});

describe("pitch from an import", () => {
  it("reads an accent line that names the Reading, or a bare position", () => {
    expect(sourcePitch("はꜜし [1]", "はし")).toEqual([1]);
    expect(sourcePitch("はꜜし [1] · はし [0]", "はし")).toEqual([1, 0]);
    expect(sourcePitch("[1][3]", "かんがえる")).toEqual([1, 3]);
    expect(sourcePitch("はし [0]", "ハシ")).toEqual([0]);
  });

  it("refuses another Reading and free text", () => {
    expect(sourcePitch("かꜜみ [1]", "はし")).toBeNull();
    expect(sourcePitch("Falls early", "はし")).toBeNull();
    expect(sourcePitch("はꜜし [2]", "はし")).toBeNull();
  });

  it("moves the line into the Reading and keeps the rest of the notes", () => {
    expect(
      pitchIntoReading({ term: "箸", pronunciation: "はし", notes: "A note\nはꜜし [1]" }, "ja"),
    ).toEqual({ term: "箸", pronunciation: "はし [1]", notes: "A note" });
  });

  it("gives a kana term a Reading to hold it", () => {
    expect(pitchIntoReading({ term: "ありがとう", notes: "ありꜜがとう [2]" }, "ja")).toEqual({
      term: "ありがとう",
      pronunciation: "ありがとう [2]",
      notes: undefined,
    });
  });

  it("leaves the fields as they were when no line fits or the language draws no reading", () => {
    const fields = { term: "箸", pronunciation: "はし", notes: "かꜜみ [1]" };
    expect(pitchIntoReading(fields, "ja")).toBe(fields);
    const spanish = { term: "casa", pronunciation: "はし", notes: "[1]" };
    expect(pitchIntoReading(spanish, "es")).toBe(spanish);
  });
});

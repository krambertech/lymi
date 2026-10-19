import { knownReadings, markKnownReadings, parseReadings, termReading } from "@lymi/core";
import { describe, expect, it } from "vitest";
import { clampBoxes, furiganaBoxes, readingInset, spokenReading } from "./furigana-boxes";

const texts = (segments: Parameters<typeof furiganaBoxes>[0]) =>
  furiganaBoxes(segments).map((box) =>
    box.map((run) => (run.reading ? `${run.text}[${run.reading}]` : run.text)).join(""),
  );

describe("furiganaBoxes", () => {
  it("keeps a reading with its kanji and breaks plain kana between characters", () => {
    const term = termReading({ term: "食べる", language: "ja", pronunciation: "たべる" });
    expect(texts(term ?? [])).toEqual(["食[た]", "べ", "る"]);
  });

  it("keeps a word read as a whole in one box", () => {
    const term = termReading({ term: "今日", language: "ja", pronunciation: "きょう" });
    expect(texts(term ?? [])).toEqual(["今日[きょう]"]);
  });

  it("never starts a line with a closing mark or a small kana", () => {
    expect(texts(parseReadings("毎朝[まいあさ]、ちょっと食[た]べる。"))).toEqual([
      "毎朝[まいあさ]、",
      "ちょっ",
      "と",
      "食[た]",
      "べ",
      "る。",
    ]);
  });

  it("never ends a line on an opening mark", () => {
    expect(texts(parseReadings("「本[ほん]」です"))).toEqual(["「本[ほん]」", "で", "す"]);
  });

  it("keeps a word in another script whole, with the space after it", () => {
    expect(texts([{ text: "OK です a cat" }])).toEqual(["OK ", "で", "す ", "a ", "cat"]);
  });

  it("flows a tail after the term, never starting a line with its space", () => {
    const term = termReading({ term: "見る", language: "ja", pronunciation: "みる" }) ?? [];
    const boxes = furiganaBoxes([...term, { text: " · 見ます", tail: true }]);
    expect(boxes.map((box) => box.map((run) => `${run.text}${run.tail ? "*" : ""}`))).toEqual([
      ["見"],
      ["る", " *"],
      ["· *"],
      ["見*"],
      ["ま*"],
      ["す*"],
    ]);
  });

  it("gives each hanzi its own box under its syllable, and 儿 the box before it", () => {
    const zh = (term: string, pronunciation: string) =>
      texts(termReading({ term, language: "zh", pronunciation }) ?? []);
    expect(zh("学习", "xuéxí")).toEqual(["学[xué]", "习[xí]"]);
    expect(zh("一点儿", "yì diǎnr")).toEqual(["一[yì]", "点儿[diǎnr]"]);
    expect(zh("學習", "xué xí")).toEqual(["學[xué]", "習[xí]"]);
    expect(zh("卡拉OK", "kǎlā OK")).toEqual(["卡[kǎ]", "拉[lā]", "OK"]);
  });

  it("returns nothing for nothing", () => {
    expect(furiganaBoxes([])).toEqual([]);
    expect(furiganaBoxes([{ text: "" }])).toEqual([]);
  });
});

describe("clampBoxes", () => {
  // Three lines of boxes 30 pt tall in a 100 pt line.
  const frames = [
    { top: 0, end: 40 },
    { top: 0, end: 90 },
    { top: 30, end: 40 },
    { top: 30, end: 95 },
    { top: 60, end: 50 },
  ];

  it("keeps every box that fits", () => {
    expect(clampBoxes(frames, 3, 100, 20)).toBeNull();
  });

  it("drops what runs past the last line and makes room at its end", () => {
    expect(clampBoxes(frames, 2, 100, 20)).toBe(3);
    expect(clampBoxes(frames, 2, 100, 4)).toBe(4);
    expect(clampBoxes(frames, 1, 100, 70)).toBe(0);
  });
});

describe("readingInset", () => {
  it("pads pinyin so a wide syllable never meets the next, and leaves kana as it was", () => {
    expect(readingInset("zhuāng", 17)).toBe(4);
    expect(readingInset("きょう", 17)).toBe(0);
  });
});

describe("spokenReading", () => {
  const segments = parseReadings("毎朝[まいあさ]パンを食[た]べる");

  it("says the reading in place of its kanji while it shows", () => {
    expect(spokenReading(segments, true)).toBe("まいあさパンをたべる");
  });

  it("says the text as written while the reading is hidden", () => {
    expect(spokenReading(segments, false)).toBe("毎朝パンを食べる");
  });

  it("says a Known word as written, since its reading has faded", () => {
    const known = knownReadings([
      { term: "食べる", pronunciation: "たべる", language: "ja", known: true },
    ]);
    expect(spokenReading(markKnownReadings(segments, known), true)).toBe("まいあさパンを食べる");
  });

  it("says the text where a reading only holds room", () => {
    expect(spokenReading([{ text: "猫", reading: " " }], true)).toBe("猫");
  });
});

import { parseReadings, termReading } from "@lymi/core";
import { describe, expect, it } from "vitest";
import { furiganaBoxes, spokenReading } from "./furigana-boxes";

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

  it("returns nothing for nothing", () => {
    expect(furiganaBoxes([])).toEqual([]);
    expect(furiganaBoxes([{ text: "" }])).toEqual([]);
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

  it("says the text where a reading only holds room", () => {
    expect(spokenReading([{ text: "猫", reading: " " }], true)).toBe("猫");
  });
});

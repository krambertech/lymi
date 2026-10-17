import { describe, expect, it } from "vitest";
import {
  addsReadingsOnly,
  alignReading,
  cueKeepsReading,
  formatReadings,
  hasReadings,
  kanaReading,
  missingReadings,
  parseReadings,
  readingKey,
  stripReadings,
  termReading,
} from "./reading";

describe("alignReading", () => {
  it("keeps the kana the term and the reading share plain", () => {
    expect(alignReading("食べる", "たべる")).toEqual([
      { text: "食", reading: "た" },
      { text: "べる" },
    ]);
    expect(alignReading("引き出し", "ひきだし")).toEqual([
      { text: "引", reading: "ひ" },
      { text: "き" },
      { text: "出", reading: "だ" },
      { text: "し" },
    ]);
    expect(alignReading("お茶", "おちゃ")).toEqual([
      { text: "お" },
      { text: "茶", reading: "ちゃ" },
    ]);
  });

  it("puts a word read as a whole over the whole run of kanji", () => {
    expect(alignReading("今日", "きょう")).toEqual([{ text: "今日", reading: "きょう" }]);
    expect(alignReading("時々", "ときどき")).toEqual([{ text: "時々", reading: "ときどき" }]);
  });

  it("gives a run of kanji the shortest reading the rest still fits", () => {
    expect(alignReading("大きい", "おおきい")).toEqual([
      { text: "大", reading: "おお" },
      { text: "きい" },
    ]);
    expect(alignReading("日の出", "ひので")).toEqual([
      { text: "日", reading: "ひ" },
      { text: "の" },
      { text: "出", reading: "で" },
    ]);
  });

  it("reads a katakana reading or katakana in the term as hiragana", () => {
    expect(alignReading("食べる", "タベル")).toEqual([
      { text: "食", reading: "た" },
      { text: "べる" },
    ]);
    expect(alignReading("消しゴム", "けしごむ")).toEqual([
      { text: "消", reading: "け" },
      { text: "しゴム" },
    ]);
  });

  it("ignores spaces and dots in the reading", () => {
    expect(alignReading("食べる", " た・べる ")).toEqual([
      { text: "食", reading: "た" },
      { text: "べる" },
    ]);
  });

  it("puts the reading over the whole term when the two do not fit", () => {
    expect(alignReading("食べる", "のむ")).toEqual([{ text: "食べる", reading: "のむ" }]);
  });

  it("never gives a digit's or a letter's sound to the kanji beside it", () => {
    expect(alignReading("3日", "みっか")).toEqual([{ text: "3日", reading: "みっか" }]);
    expect(alignReading("1人", "ひとり")).toEqual([{ text: "1人", reading: "ひとり" }]);
    expect(alignReading("CD屋", "しーでぃーや")).toEqual([
      { text: "CD屋", reading: "しーでぃーや" },
    ]);
  });

  it("draws nothing over a term without kanji", () => {
    expect(alignReading("ありがとう", "ありがとう")).toEqual([{ text: "ありがとう" }]);
    expect(alignReading("コーヒー", "こーひー")).toEqual([{ text: "コーヒー" }]);
  });

  it("puts a reading that is not kana over the whole term", () => {
    expect(alignReading("学习", "xuéxí")).toEqual([{ text: "学习", reading: "xuéxí" }]);
  });
});

describe("termReading", () => {
  it("draws a Japanese card's kana reading", () => {
    expect(termReading({ term: "食べる", language: "ja", pronunciation: "たべる" })).toEqual([
      { text: "食", reading: "た" },
      { text: "べる" },
    ]);
    expect(termReading({ term: "今日", language: "ja-JP", pronunciation: "きょう" })).toEqual([
      { text: "今日", reading: "きょう" },
    ]);
  });

  it("draws nothing for another language, a missing or non-kana reading, or a kana term", () => {
    expect(termReading({ term: "молоко", language: "ru", pronunciation: "молоко́" })).toBeNull();
    expect(termReading({ term: "学习", language: "zh", pronunciation: "xuéxí" })).toBeNull();
    expect(termReading({ term: "食べる", language: "ja", pronunciation: "taberu" })).toBeNull();
    expect(termReading({ term: "食べる", language: "ja", pronunciation: null })).toBeNull();
    expect(
      termReading({ term: "ありがとう", language: "ja", pronunciation: "ありがとう" }),
    ).toBeNull();
  });

  it("puts a one-form reading over the first of the term's forms", () => {
    expect(
      termReading({ term: "食べる · 食べます", language: "ja", pronunciation: "たべる" }),
    ).toEqual([{ text: "食", reading: "た" }, { text: "べる · 食べます" }]);
  });
});

describe("parseReadings", () => {
  it("gives each reading to the run of kanji just before it", () => {
    expect(parseReadings("私[わたし]は毎朝[まいあさ]パンを食[た]べます。")).toEqual([
      { text: "私", reading: "わたし" },
      { text: "は" },
      { text: "毎朝", reading: "まいあさ" },
      { text: "パンを" },
      { text: "食", reading: "た" },
      { text: "べます。" },
    ]);
  });

  it("reads a reading over a word with kana, as Anki writes it", () => {
    expect(parseReadings("見せ物[みせもの]")).toEqual([
      { text: "見", reading: "み" },
      { text: "せ" },
      { text: "物", reading: "もの" },
    ]);
    expect(parseReadings("パンを 食べます[たべます]。")).toEqual([
      { text: "パンを" },
      { text: "食", reading: "た" },
      { text: "べます。" },
    ]);
  });

  it("never lets a particle before a word take part of its reading", () => {
    expect(parseReadings("駅で電車[でんしゃ]に乗[の]ります。")).toEqual([
      { text: "駅で" },
      { text: "電車", reading: "でんしゃ" },
      { text: "に" },
      { text: "乗", reading: "の" },
      { text: "ります。" },
    ]);
    expect(parseReadings("私は母[はは]と行きます。")[1]).toEqual({ text: "母", reading: "はは" });
    expect(parseReadings("私は母[はは]が")).toEqual([
      { text: "私は" },
      { text: "母", reading: "はは" },
      { text: "が" },
    ]);
    expect(parseReadings("友達と時計[とけい]")).toEqual([
      { text: "友達と" },
      { text: "時計", reading: "とけい" },
    ]);
    expect(parseReadings("ここに日本[にほん]")).toEqual([
      { text: "ここに" },
      { text: "日本", reading: "にほん" },
    ]);
    expect(parseReadings("友達が学校[がっこう]に来た。")[1]).toEqual({
      text: "学校",
      reading: "がっこう",
    });
    expect(parseReadings("熱い お茶[おちゃ]")).toEqual([
      { text: "熱いお" },
      { text: "茶", reading: "ちゃ" },
    ]);
  });

  it("reads an honorific お or ご before a word as part of it, mid-sentence too", () => {
    expect(parseReadings("私はお茶[おちゃ]を飲みます。")).toEqual([
      { text: "私はお" },
      { text: "茶", reading: "ちゃ" },
      { text: "を飲みます。" },
    ]);
    expect(parseReadings("毎朝ご飯[ごはん]")).toEqual([
      { text: "毎朝ご" },
      { text: "飯", reading: "はん" },
    ]);
    expect(stripReadings("今日はお弁当[おべんとう]")).toBe("今日はお弁当");
    // Here お ends なお, and おお is 多's own reading.
    expect(parseReadings("なお多[おお]く")).toEqual([
      { text: "なお" },
      { text: "多", reading: "おお" },
      { text: "く" },
    ]);
    expect(parseReadings("今日はお弁当[おべんとう]").at(-1)).toEqual({
      text: "弁当",
      reading: "べんとう",
    });
  });

  it("reads a crafted long example quickly", () => {
    const text = `${"漢あ".repeat(800)}[${"あ".repeat(390)}]`;
    const started = performance.now();
    expect(stripReadings(text)).toBe(text);
    expect(stripReadings(`${"漢あ".repeat(800)}[${"あ".repeat(30)}]`)).toHaveLength(1600);
    expect(performance.now() - started).toBeLessThan(500);
  });

  it("drops the space Anki puts before a reading, and keeps one between words", () => {
    expect(stripReadings("私[わたし]は 毎朝[まいあさ]")).toBe("私は毎朝");
    expect(stripReadings("I like 寿司[すし]")).toBe("I like 寿司");
  });

  it("leaves brackets that are not readings as written", () => {
    expect(parseReadings("[sound:a.mp3] [note] ありがとう[ありがとう]")).toEqual([
      { text: "[sound:a.mp3] [note] ありがとう[ありがとう]" },
    ]);
    expect(parseReadings("Plain text.")).toEqual([{ text: "Plain text." }]);
  });
});

describe("stripReadings", () => {
  it("leaves the text as written", () => {
    expect(stripReadings("毎朝[まいあさ]パンを食[た]べる")).toBe("毎朝パンを食べる");
    expect(stripReadings("Sbrigati, il treno parte!")).toBe("Sbrigati, il treno parte!");
  });
});

describe("hasReadings", () => {
  it("is true only for text with an inline reading", () => {
    expect(hasReadings("食[た]べる")).toBe(true);
    expect(hasReadings("食べる")).toBe(false);
    expect(hasReadings("[sound:a.mp3]")).toBe(false);
  });
});

describe("missingReadings", () => {
  it("is true while any kanji has no reading", () => {
    expect(missingReadings("毎朝パンを食[た]べる")).toBe(true);
    expect(missingReadings("毎朝[まいあさ]パンを食[た]べる")).toBe(false);
    expect(missingReadings("パンをたべる")).toBe(false);
  });
});

describe("formatReadings", () => {
  it("writes runs back in the inline notation", () => {
    const text = "私[わたし]は毎朝[まいあさ]パンを食[た]べます。";
    expect(formatReadings(parseReadings(text))).toBe(text);
    expect(formatReadings(parseReadings("食べます[たべます]"))).toBe("食[た]べます");
  });

  it("spaces a reading off kana that would otherwise join it", () => {
    const segments = [{ text: "は" }, { text: "花", reading: "はな" }];
    const text = formatReadings(segments);
    expect(parseReadings(text)).toEqual(segments);
  });
});

describe("addsReadingsOnly", () => {
  it("accepts the same text with readings added", () => {
    expect(addsReadingsOnly("毎朝パンを食べる", "毎朝[まいあさ]パンを食[た]べる")).toBe(true);
  });

  it("refuses any other change, or no change", () => {
    expect(addsReadingsOnly("毎朝パンを食べる", "毎朝[まいあさ]パンを食[た]べます")).toBe(false);
    expect(addsReadingsOnly("毎朝パンを食べる", "毎朝パンを食べる")).toBe(false);
    expect(addsReadingsOnly("食[た]べる", "食[た]べる")).toBe(false);
  });
});

describe("kanaReading", () => {
  it("takes a Japanese card's kana reading", () => {
    expect(kanaReading({ language: "ja", pronunciation: " じょうず " })).toBe("じょうず");
    expect(kanaReading({ language: "ja-JP", pronunciation: "コーヒー" })).toBe("コーヒー");
  });
  it("refuses anything that is not kana", () => {
    expect(kanaReading({ language: "ja", pronunciation: "joːzɯ" })).toBeNull();
    expect(kanaReading({ language: "ja", pronunciation: "jōzu" })).toBeNull();
    expect(kanaReading({ language: "ja", pronunciation: "上手" })).toBeNull();
    expect(kanaReading({ language: "ja", pronunciation: "" })).toBeNull();
    expect(kanaReading({ language: "ja", pronunciation: null })).toBeNull();
  });
  it("is only for Japanese", () => {
    expect(kanaReading({ language: "zh", pronunciation: "じょうず" })).toBeNull();
    expect(kanaReading({ language: null, pronunciation: "じょうず" })).toBeNull();
  });
});

describe("readingKey", () => {
  it("folds katakana, spacing and composition, so one reading written two ways is one", () => {
    expect(readingKey({ language: "ja", pronunciation: "ジョウズ" })).toBe("じょうず");
    expect(readingKey({ language: "ja-JP", pronunciation: " じょう  ず " })).toBe("じょうず");
    expect(readingKey({ language: "ja", pronunciation: "た・べる" })).toBe("たべる");
    expect(readingKey({ language: "ja", pronunciation: "じょう\u3000ず" })).toBe("じょうず");
    expect(readingKey({ language: "ja", pronunciation: "か\u3099" })).toBe("が");
  });
  it("has no reading where none applies", () => {
    expect(readingKey({ language: "ja", pronunciation: "jōzu" })).toBeNull();
    expect(readingKey({ language: "zh", pronunciation: "xuéxí" })).toBeNull();
    expect(readingKey({ language: "it", pronunciation: null })).toBeNull();
  });
});

describe("cueKeepsReading", () => {
  it("keeps Chinese pinyin on the cue until the card is Known", () => {
    expect(cueKeepsReading("zh", false)).toBe(true);
    expect(cueKeepsReading("zh-Hans", false)).toBe(true);
    expect(cueKeepsReading("zh", true)).toBe(false);
  });
  it("leaves every other reading for the reveal", () => {
    expect(cueKeepsReading("ja", false)).toBe(false);
    expect(cueKeepsReading("ko", false)).toBe(false);
    expect(cueKeepsReading(null, false)).toBe(false);
  });
});

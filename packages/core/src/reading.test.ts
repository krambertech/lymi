import { describe, expect, it } from "vitest";
import {
  addsReadingsOnly,
  alignReading,
  exampleReadings,
  formatReadings,
  hasReadings,
  kanaReading,
  knownReadings,
  markKnownReadings,
  missingReadings,
  parseReadings,
  readingKey,
  splitTermReading,
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

describe("markKnownReadings", () => {
  const card = (term: string, pronunciation: string | null, known = true, language = "ja") => ({
    term,
    pronunciation,
    language,
    known,
  });
  /** The kanji whose reading fades in the example, given the learner's cards. */
  const faded = (example: string, cards: Parameters<typeof knownReadings>[0]) =>
    markKnownReadings(parseReadings(example), knownReadings(cards))
      .filter((segment) => segment.known)
      .map((segment) => segment.text);

  it("fades a Known word's reading through its inflections", () => {
    expect(faded("毎朝[まいあさ]パンを食[た]べます。", [card("食べる", "たべる")])).toEqual(["食"]);
    expect(faded("食べます[たべます]", [card("食べる", "たべる")])).toEqual(["食"]);
  });

  it("fades 来る through the readings its kanji takes as it inflects", () => {
    const come = [card("来る", "くる")];
    expect(faded("明日[あした]来[き]ます。", come)).toEqual(["来"]);
    expect(faded("誰[だれ]も来[こ]ない。", come)).toEqual(["来"]);
    expect(faded("来年[らいねん]", come)).toEqual([]);
  });

  it("keeps the reading of another word that shares the kanji", () => {
    expect(faded("食事[しょくじ]をします。", [card("食べる", "たべる")])).toEqual([]);
    expect(faded("食[た]べます。", [card("食事", "しょくじ")])).toEqual([]);
  });

  it("fades a compound only when the compound is Known", () => {
    const example = "毎朝[まいあさ]走[はし]る。";
    expect(faded(example, [card("毎", "まい")])).toEqual([]);
    expect(faded(example, [card("毎朝", "まいあさ")])).toEqual(["毎朝"]);
    expect(faded("毎[まい]朝[あさ]走[はし]る。", [card("毎朝", "まいあさ")])).toEqual(["毎", "朝"]);
    expect(faded("毎[まい]朝[あさ]走[はし]る。", [card("毎", "まい")])).toEqual(["毎"]);
  });

  it("matches a word read as a whole", () => {
    expect(faded("今日[きょう]は暑[あつ]い。", [card("今日", "きょう")])).toEqual(["今日"]);
    expect(faded("今日[こんにち]は。", [card("今日", "きょう")])).toEqual([]);
  });

  it("tells apart two readings of the same kanji", () => {
    expect(faded("歌[うた]が上手[じょうず]です。", [card("上手", "じょうず")])).toEqual(["上手"]);
    expect(faded("一枚[いちまい]上手[うわて]だ。", [card("上手", "じょうず")])).toEqual([]);
  });

  it("folds the reading as the duplicate rule does", () => {
    expect(faded("上手[ジョウズ]です。", [card("上手", "じょう・ず")])).toEqual(["上手"]);
  });

  it("takes nothing from a card that is not Known, not Japanese, or written in kana", () => {
    expect(knownReadings([card("食べる", "たべる", false)]).size).toBe(0);
    expect(knownReadings([card("学习", "xuéxí", true, "zh")]).size).toBe(0);
    expect(knownReadings([card("ありがとう", "ありがとう")]).size).toBe(0);
    expect(knownReadings([card("食べる", null)]).size).toBe(0);
  });

  it("leaves the runs as they are when nothing is Known", () => {
    const segments = parseReadings("食[た]べる");
    expect(markKnownReadings(segments, new Set())).toBe(segments);
    expect(markKnownReadings(segments, undefined)).toBe(segments);
  });

  it("counts an example's readings and the ones that fade", () => {
    const example = "毎朝[まいあさ]パンを食[た]べます。";
    const known = knownReadings([card("食べる", "たべる")]);
    expect(exampleReadings(example, known)).toEqual({ readings: 2, known: 1 });
    expect(exampleReadings(example)).toEqual({ readings: 2, known: 0 });
    expect(exampleReadings(null, known)).toEqual({ readings: 0, known: 0 });
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
    const key = (pronunciation: string, language = "ja") =>
      readingKey({ term: "上手", language, pronunciation });
    expect(key("ジョウズ")).toBe("じょうず");
    expect(key(" じょう  ず ", "ja-JP")).toBe("じょうず");
    expect(key("じょう・ず")).toBe("じょうず");
    expect(key("じょう\u3000ず")).toBe("じょうず");
    expect(readingKey({ term: "外", language: "ja", pronunciation: "そと" })).toBe("そと");
    expect(readingKey({ term: "画", language: "ja", pronunciation: "か\u3099" })).toBe("が");
  });
  it("has no reading where none applies", () => {
    expect(readingKey({ term: "上手", language: "ja", pronunciation: "jōzu" })).toBeNull();
    expect(readingKey({ term: "学习", language: "zh", pronunciation: "xuéxí" })).toBeNull();
    expect(readingKey({ term: "ciao", language: "it", pronunciation: null })).toBeNull();
  });
  it("keys only a reading that fits the term, so a stray reading never splits a word", () => {
    expect(readingKey({ term: "食べる", language: "ja", pronunciation: "たべる" })).toBe("たべる");
    expect(readingKey({ term: "食べる", language: "ja", pronunciation: "しょくじ" })).toBeNull();
    expect(readingKey({ term: "ねこ", language: "ja", pronunciation: "いぬ" })).toBeNull();
    expect(readingKey({ term: "食べる · 食べます", language: "ja", pronunciation: "たべる" })).toBe(
      "たべる",
    );
    // Alignment cannot read a Latin letter, so the reading stands.
    expect(readingKey({ term: "Tシャツ", language: "ja", pronunciation: "ティーシャツ" })).toBe(
      "てぃーしゃつ",
    );
  });
});

describe("splitTermReading", () => {
  it("splits a term written with inline readings into the term and its whole reading", () => {
    expect(splitTermReading("食[た]べる")).toEqual({ term: "食べる", reading: "たべる" });
    expect(splitTermReading("引[ひ]き出[だ]し")).toEqual({ term: "引き出し", reading: "ひきだし" });
    expect(splitTermReading(" 上手[ジョウズ] ")).toEqual({ term: "上手", reading: "じょうず" });
  });
  it("leaves a term alone unless every kanji has a kana reading", () => {
    expect(splitTermReading("食べる")).toBeNull();
    expect(splitTermReading("食[た]べ物")).toBeNull();
    expect(splitTermReading("食[ta]べる")).toBeNull();
    expect(splitTermReading("T[てぃー]シャツ")).toBeNull();
    expect(splitTermReading("[sound:a.mp3]食べる")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import {
  addsReadingsOnly,
  alignReading,
  cueShowsPronunciation,
  exampleReadings,
  exampleSegments,
  formatReadings,
  hasReadings,
  kanaReading,
  knownReadings,
  lettersReading,
  markedTerm,
  markKnownReadings,
  missingReadings,
  parseReadings,
  readingKey,
  splitTermReading,
  stripReadings,
  termReading,
  termShowsPronunciation,
  toneRuns,
} from "./reading";

describe("markedTerm", () => {
  it("draws a Russian term with its stress in place, and draws nothing over it", () => {
    const card = { term: "замок", language: "ru", pronunciation: "замо́к" };
    expect(markedTerm(card)).toBe("замо́к");
    expect(termReading(card)).toBeNull();
    expect(knownReadings([{ ...card, known: true }]).size).toBe(0);
  });
  it("marks a first form drawn alone from the pronunciation's first form", () => {
    const card = { term: "идти", language: "ru", pronunciation: "идти́ · шёл" };
    expect(markedTerm(card)).toBe("идти́");
  });
  it("marks nothing in a language that draws no stress", () => {
    expect(markedTerm({ term: "замок", language: "bg", pronunciation: "замо́к" })).toBeNull();
    expect(markedTerm({ term: "上手", language: "ja", pronunciation: "じょうず" })).toBeNull();
  });
});

describe("termShowsPronunciation", () => {
  it("holds for a reading drawn over the term or marks drawn in place", () => {
    expect(
      termShowsPronunciation({ term: "上手", language: "ja", pronunciation: "じょうず" }),
    ).toBe(true);
    expect(termShowsPronunciation({ term: "мука", language: "ru", pronunciation: "мука́" })).toBe(
      true,
    );
    expect(termShowsPronunciation({ term: "か\u3099", language: "ja", pronunciation: "が" })).toBe(
      true,
    );
    expect(termShowsPronunciation({ term: "мука", language: "ru", pronunciation: "[mʊˈka]" })).toBe(
      false,
    );
  });
});

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
    expect(alignReading("日の野原", "ひののはら")).toEqual([
      { text: "日", reading: "ひ" },
      { text: "の" },
      { text: "野原", reading: "のはら" },
    ]);
  });

  it("reads the counters ヶ and ヵ and the mark 〆 as kanji", () => {
    expect(alignReading("三ヶ月ぶり", "さんかげつぶり")[0]).toEqual({
      text: "三ヶ月",
      reading: "さんかげつ",
    });
    expect(alignReading("三ヵ月ぶり", "さんかげつぶり")[0]).toEqual({
      text: "三ヵ月",
      reading: "さんかげつ",
    });
    expect(alignReading("〆切り", "しめきり")[0]).toEqual({ text: "〆切", reading: "しめき" });
  });

  it("lets a space or punctuation of the term be missing from the reading", () => {
    expect(alignReading("食べる、飲む", "たべるのむ")).toEqual([
      { text: "食", reading: "た" },
      { text: "べる、" },
      { text: "飲", reading: "の" },
      { text: "む" },
    ]);
  });

  it("puts the reading of a term past 80 characters over the whole of it", () => {
    const kana = "べ".repeat(79);
    expect(alignReading(`食${kana}`, `た${kana}`)[0]).toEqual({ text: "食", reading: "た" });
    expect(alignReading(`食${kana}べ`, `た${kana}べ`)).toEqual([
      { text: `食${kana}べ`, reading: `た${kana}べ` },
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
  it("draws nothing for another language, a missing or non-kana reading, or a kana term", () => {
    expect(termReading({ term: "молоко", language: "ru", pronunciation: "молоко́" })).toBeNull();
    expect(termReading({ term: "學校", language: "ko", pronunciation: "hakgyo" })).toBeNull();
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
    expect(
      termReading({ term: "食べる · 食べます", language: "ja", pronunciation: "たべる・たべます" }),
    ).toEqual([
      { text: "食", reading: "た" },
      { text: "べる · " },
      { text: "食", reading: "た" },
      { text: "べます" },
    ]);
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
    expect(stripReadings("今日はお弁当[おべんとう]", "ja")).toBe("今日はお弁当");
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
    expect(stripReadings(text, "ja")).toBe(text);
    expect(stripReadings(`${"漢あ".repeat(800)}[${"あ".repeat(30)}]`, "ja")).toHaveLength(1600);
    expect(performance.now() - started).toBeLessThan(500);
  });

  it("looks back 20 characters for the word a reading belongs to", () => {
    const word = (kana: number) => `食${"べ".repeat(kana)}[た${"べ".repeat(kana)}]`;
    expect(parseReadings(word(19))[0]).toEqual({ text: "食", reading: "た" });
    expect(parseReadings(word(20))).toEqual([{ text: word(20) }]);
  });

  it("drops the space Anki puts before a reading, and keeps one between words", () => {
    expect(stripReadings("私[わたし]は 毎朝[まいあさ]", "ja")).toBe("私は毎朝");
    expect(stripReadings("I like 寿司[すし]", "ja")).toBe("I like 寿司");
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
  const faded = (example: string, cards: Parameters<typeof knownReadings>[0]) =>
    markKnownReadings(parseReadings(example), knownReadings(cards), "ja")
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

  it("joins four readings side by side to meet a Known word, and never five", () => {
    expect(faded("一[いち]期[ご]一[いち]会[え]", [card("一期一会", "いちごいちえ")])).toEqual([
      "一",
      "期",
      "一",
      "会",
    ]);
    expect(
      faded("一[いち]期[ご]一[いち]会[え]展[てん]", [card("一期一会展", "いちごいちえてん")]),
    ).toEqual([]);
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

  it("takes nothing from a card that is not Known, in a language with no reading, or written in kana", () => {
    expect(knownReadings([card("食べる", "たべる", false)]).size).toBe(0);
    expect(knownReadings([card("學校", "hakgyo", true, "ko")]).size).toBe(0);
    expect(knownReadings([card("ありがとう", "ありがとう")]).size).toBe(0);
    expect(knownReadings([card("食べる", null)]).size).toBe(0);
  });

  it("leaves the runs as they are when nothing is Known", () => {
    const segments = parseReadings("食[た]べる");
    expect(markKnownReadings(segments, new Set(), "ja")).toBe(segments);
    expect(markKnownReadings(segments, undefined, "ja")).toBe(segments);
  });

  it("counts an example's readings and the ones that fade", () => {
    const example = "毎朝[まいあさ]パンを食[た]べます。";
    const known = knownReadings([card("食べる", "たべる")]);
    expect(exampleReadings(example, "ja", known)).toEqual({ readings: 2, known: 1 });
    expect(exampleReadings(example, "ja")).toEqual({ readings: 2, known: 0 });
    expect(exampleReadings(null, "ja", known)).toEqual({ readings: 0, known: 0 });
  });
});

describe("example pinyin", () => {
  const known = knownReadings([
    { term: "银行", pronunciation: "yínháng", language: "zh", known: true },
  ]);
  const faded = (example: string) =>
    markKnownReadings(exampleSegments(example, "zh"), known, "zh")
      .filter((segment) => segment.known)
      .map((segment) => `${segment.text} ${segment.reading}`);

  it("fades a character whose syllable a Known card reads the same", () => {
    expect(faded("行长[hángzhǎng]来了。")).toEqual(["行 háng"]);
    expect(faded("今天不行[bù xíng]。")).toEqual([]);
    expect(faded("我去银行[yín háng]。")).toEqual(["银 yín", "行 háng"]);
  });

  it("never meets a kana pair, and reads kana brackets only for other languages", () => {
    expect(faded("銀行[ぎんこう]")).toEqual([]);
    expect(exampleSegments("银行[yínháng]", "ja")).toEqual([{ text: "银行[yínháng]" }]);
    expect(exampleSegments("食[た]べる", "zh")).toEqual([{ text: "食[た]べる" }]);
  });

  it("counts, strips and checks pinyin as furigana", () => {
    expect(exampleReadings("我去银行[yínháng]。", "zh-TW", known)).toEqual({
      readings: 2,
      known: 2,
    });
    expect(stripReadings("我[wǒ]去[qù]银行[yínháng]。", "zh")).toBe("我去银行。");
    expect(hasReadings("我去银行。", "zh")).toBe(false);
    expect(missingReadings("我去银行[yínháng]。", "zh")).toBe(true);
    expect(missingReadings("我[wǒ]去[qù]银行[yínháng]。", "zh")).toBe(false);
    expect(addsReadingsOnly("今天不行。", "今天[jīntiān]不行[bù xíng]。", "zh")).toBe(true);
    expect(addsReadingsOnly("今天不行。", "今天[jīntiān]不行[bù xíng]！", "zh")).toBe(false);
    expect(addsReadingsOnly("Я живу в Москве.", "Я живу́ в Москве́.", "ru")).toBe(true);
    expect(addsReadingsOnly("Я живу в Москве.", "Я живу в Москве.", "ru")).toBe(false);
  });
});

describe("example Jyutping", () => {
  const known = knownReadings([
    { term: "銀行", pronunciation: "ngan4 hong4", language: "yue", known: true },
    { term: "搭𨋢", pronunciation: "daap3 lip1", language: "zh-yue", known: true },
  ]);
  const faded = (example: string) =>
    markKnownReadings(exampleSegments(example, "yue"), known, "yue")
      .filter((segment) => segment.known)
      .map((segment) => `${segment.text} ${segment.reading}`);

  it("fades a character whose syllable a Known card reads the same", () => {
    expect(faded("佢喺行業[hong4 jip6]做嘢。")).toEqual(["行 hong4"]);
    expect(faded("我行路[hang4 lou6]返屋企。")).toEqual([]);
    expect(faded("佢搭𨋢[daap3 lip1]上去。")).toEqual(["搭 daap3", "𨋢 lip1"]);
    expect(faded("我去銀行[ngan⁴ hong⁴]。")).toEqual(["銀 ngan4", "行 hong4"]);
  });

  it("never meets a pinyin pair", () => {
    const mandarin = knownReadings([
      { term: "银行", pronunciation: "yínháng", language: "zh", known: true },
    ]);
    expect(markKnownReadings(exampleSegments("银行[ngan4 hong4]", "yue"), mandarin, "yue")).toEqual(
      [
        { text: "银", reading: "ngan4" },
        { text: "行", reading: "hong4" },
      ],
    );
    expect(exampleSegments("銀行[ngan4 hong4]", "zh")).toEqual([{ text: "銀行[ngan4 hong4]" }]);
  });

  it("counts, strips and checks Jyutping as furigana", () => {
    expect(exampleReadings("我去銀行[ngan4 hong4]。", "zh-yue", known)).toEqual({
      readings: 2,
      known: 2,
    });
    expect(stripReadings("我[ngo5]去[heoi3]銀行[ngan4 hong4]。", "yue")).toBe("我去銀行。");
    expect(missingReadings("我去銀行[ngan4 hong4]。", "yue")).toBe(true);
    expect(missingReadings("我[ngo5]去[heoi3]銀行[ngan4 hong4]。", "yue")).toBe(false);
    expect(addsReadingsOnly("唔該晒。", "唔該[m4 goi1]晒[saai3]。", "yue")).toBe(true);
  });
});

describe("stripReadings", () => {
  it("leaves the text as written", () => {
    expect(stripReadings("毎朝[まいあさ]パンを食[た]べる", "ja")).toBe("毎朝パンを食べる");
    expect(stripReadings("Sbrigati, il treno parte!", "ja")).toBe("Sbrigati, il treno parte!");
  });
});

describe("hasReadings", () => {
  it("is true only for text with an inline reading", () => {
    expect(hasReadings("食[た]べる", "ja")).toBe(true);
    expect(hasReadings("食べる", "ja")).toBe(false);
    expect(hasReadings("[sound:a.mp3]", "ja")).toBe(false);
  });
});

describe("missingReadings", () => {
  it("is true while any kanji has no reading", () => {
    expect(missingReadings("毎朝パンを食[た]べる", "ja")).toBe(true);
    expect(missingReadings("毎朝[まいあさ]パンを食[た]べる", "ja")).toBe(false);
    expect(missingReadings("パンをたべる", "ja")).toBe(false);
  });
  it("finds a Russian word of two or more syllables with no stress shown", () => {
    expect(missingReadings("Я живу в Москве́.", "ru")).toBe(true);
    expect(missingReadings("Я живу́ в Москве́.", "ru")).toBe(false);
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
    expect(addsReadingsOnly("毎朝パンを食べる", "毎朝[まいあさ]パンを食[た]べる", "ja")).toBe(true);
  });

  it("refuses any other change, or no change", () => {
    expect(addsReadingsOnly("毎朝パンを食べる", "毎朝[まいあさ]パンを食[た]べます", "ja")).toBe(
      false,
    );
    expect(addsReadingsOnly("毎朝パンを食べる", "毎朝パンを食べる", "ja")).toBe(false);
    expect(addsReadingsOnly("食[た]べる", "食[た]べる", "ja")).toBe(false);
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
    expect(readingKey({ term: "學校", language: "ko", pronunciation: "hakgyo" })).toBeNull();
    expect(readingKey({ term: "ciao", language: "it", pronunciation: null })).toBeNull();
  });
  it("keys only a reading that fits the term, so a stray reading never splits a word", () => {
    expect(readingKey({ term: "食べる", language: "ja", pronunciation: "たべる" })).toBe("たべる");
    expect(readingKey({ term: "食べる", language: "ja", pronunciation: "しょくじ" })).toBeNull();
    expect(readingKey({ term: "ねこ", language: "ja", pronunciation: "いぬ" })).toBeNull();
    expect(readingKey({ term: "食べる · 食べます", language: "ja", pronunciation: "たべる" })).toBe(
      "たべる",
    );
    expect(readingKey({ term: "Tシャツ", language: "ja", pronunciation: "ティーシャツ" })).toBe(
      "てぃーしゃつ",
    );
  });
  it("keys any reading of a passage past 80 characters, which is never aligned", () => {
    const key = (term: string) => readingKey({ term, language: "ja", pronunciation: "のむ" });
    expect(key(`食${"べ".repeat(79)}`)).toBeNull();
    expect(key(`食${"べ".repeat(80)}`)).toBe("のむ");
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
    expect(splitTermReading("食[た]べるTV")).toBeNull();
    expect(splitTermReading("食[た]べる3")).toBeNull();
  });
});

describe("toneRuns", () => {
  it("parts each Jyutping tone number from its syllable", () => {
    expect(toneRuns("gwong2 dung1")).toEqual([
      { text: "gwong", tone: false },
      { text: "2", tone: true },
      { text: " dung", tone: false },
      { text: "1", tone: true },
    ]);
    expect(toneRuns("nei5hou2").map((run) => run.text)).toEqual(["nei", "5", "hou", "2"]);
  });
  it("leaves a reading with no tone number whole", () => {
    expect(toneRuns("xuéxí")).toEqual([{ text: "xuéxí", tone: false }]);
    expect(toneRuns("たべる")).toEqual([{ text: "たべる", tone: false }]);
    expect(toneRuns("3")).toEqual([{ text: "3", tone: false }]);
  });
});

describe("lettersReading", () => {
  it("tells a reading in letters, which needs room beside it, from one in kana", () => {
    expect(lettersReading("xué")).toBe(true);
    expect(lettersReading("hok6")).toBe(true);
    expect(lettersReading("たべる")).toBe(false);
  });
});

describe("cueShowsPronunciation", () => {
  const shows = (display: "adaptive" | "separate" | undefined, known: boolean, revealed: boolean) =>
    cueShowsPronunciation({ display, known, revealed });

  it("draws it on the term until the card is Known, and on the answer, by default", () => {
    expect(shows("adaptive", false, false)).toBe(true);
    expect(shows("adaptive", true, false)).toBe(false);
    expect(shows("adaptive", true, true)).toBe(true);
    expect(shows(undefined, false, false)).toBe(true);
    expect(shows(undefined, true, true)).toBe(true);
  });

  it("never draws it on the term once the learner shows it separately", () => {
    for (const known of [false, true]) {
      expect(shows("separate", known, false)).toBe(false);
      expect(shows("separate", known, true)).toBe(false);
    }
  });
});

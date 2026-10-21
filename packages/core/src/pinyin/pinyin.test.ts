import { describe, expect, it } from "vitest";
import {
  formatPinyin,
  parsePinyin,
  pinyinExampleSegments,
  pinyinKey,
  pinyinPairs,
  pinyinSyllables,
  pinyinTermReading,
  stripPinyin,
  toneMarks,
} from ".";

const drawn = (term: string, reading: string) => {
  const segments = pinyinTermReading(term, reading);
  return segments && formatPinyin(segments);
};
const split = (reading: string) => pinyinSyllables(reading)?.map((s) => s.text) ?? null;

describe("toneMarks", () => {
  it("marks each numbered syllable in citation tone", () => {
    expect(toneMarks("ni3 hao3")).toBe("nǐ hǎo");
    expect(toneMarks("bu4 shi4")).toBe("bù shì");
    expect(toneMarks("yi1")).toBe("yī");
    expect(toneMarks("Zhong1guo2")).toBe("Zhōngguó");
  });
  it("puts the mark on a or e, then the o of ou, then the last vowel", () => {
    expect(toneMarks("hao3 xue2 dou1 gui4 liu4 lüe4")).toBe("hǎo xué dōu guì liù lüè");
  });
  it("reads v and u: as ü", () => {
    expect(toneMarks("lv4")).toBe("lǜ");
    expect(toneMarks("lu:4")).toBe("lǜ");
    expect(toneMarks("nv3")).toBe("nǚ");
  });
  it("leaves the neutral tone unmarked", () => {
    expect(toneMarks("dong1 xi5")).toBe("dōng xi");
    expect(toneMarks("ma0")).toBe("ma");
  });
  it("marks an erhua syllable before its r", () => {
    expect(toneMarks("yi4 dian3r")).toBe("yì diǎnr");
    expect(toneMarks("yi1 dian3 r5")).toBe("yī diǎn r");
    expect(toneMarks("r5")).toBe("r5");
  });
  it("leaves text alone unless every digit ends a syllable", () => {
    expect(toneMarks("nǐ hǎo")).toBe("nǐ hǎo");
    expect(toneMarks("ka3 la1 OK")).toBe("kǎ lā OK");
    expect(toneMarks("3 ge4")).toBe("3 ge4");
    expect(toneMarks("xx3")).toBe("xx3");
  });
});

describe("pinyinSyllables", () => {
  it("splits at spaces and apostrophes", () => {
    expect(split("nǐ hǎo")).toEqual(["nǐ", "hǎo"]);
    expect(split("Xī'ān")).toEqual(["Xī", "ān"]);
    expect(split("xi'an")).toEqual(["xi", "an"]);
  });
  it("splits solid pinyin by the syllable list", () => {
    expect(split("xuéxí")).toEqual(["xué", "xí"]);
    expect(split("xian")).toEqual(["xian"]);
    expect(split("Zhōngguó")).toEqual(["Zhōng", "guó"]);
    expect(split("jīnián")).toEqual(["jī", "nián"]);
    expect(split("fangan")).toEqual(["fan", "gan"]);
  });
  it("never puts two tone marks in one syllable", () => {
    expect(split("xīān")).toEqual(["xī", "ān"]);
  });
  it("keeps an erhua r with its syllable, written solid or apart", () => {
    expect(split("yìdiǎnr")).toEqual(["yì", "diǎnr"]);
    expect(split("yī diǎn r")).toEqual(["yī", "diǎnr"]);
    expect(split("èr")).toEqual(["èr"]);
  });
  it("finds nothing in what is not pinyin", () => {
    expect(split("ɕɥɛ̌ɕǐ")).toBeNull();
    expect(split("OK")).toBeNull();
    expect(split("")).toBeNull();
  });
});

describe("pinyinTermReading", () => {
  it("puts one syllable over each character", () => {
    expect(drawn("你好", "nǐ hǎo")).toBe("你[nǐ]好[hǎo]");
    expect(drawn("学习", "xuéxí")).toBe("学[xué]习[xí]");
    expect(drawn("學習", "xué xí")).toBe("學[xué]習[xí]");
  });
  it("gives 儿 to the erhua syllable before it", () => {
    expect(drawn("一点儿", "yì diǎnr")).toBe("一[yì]点儿[diǎnr]");
    expect(drawn("女儿", "nǚ'ér")).toBe("女[nǚ]儿[ér]");
  });
  it("leaves letters and digits plain", () => {
    expect(drawn("卡拉OK", "kǎlā OK")).toBe("卡[kǎ]拉[lā]OK");
    expect(drawn("卡拉OK", "kǎlā")).toBe("卡[kǎ]拉[lā]OK");
  });
  it("goes over the whole term when the counts do not fit", () => {
    expect(drawn("你好", "nǐ")).toBe("你好[nǐ]");
    expect(drawn("卡拉OK", "kǎlā ōukēi")).toBe("卡拉OK[kǎlā ōukēi]");
  });
  it("converts tone numbers as it draws", () => {
    expect(drawn("你好", "ni3 hao3")).toBe("你[nǐ]好[hǎo]");
  });
  it("draws nothing for a reading that is not pinyin or a term with no Han", () => {
    expect(pinyinTermReading("学习", "ɕɥɛ̌ɕǐ")).toBeNull();
    expect(pinyinTermReading("OK", "OK")).toBeNull();
  });
});

describe("pinyinKey", () => {
  it("keeps tones, so 行 háng and 行 xíng are two words", () => {
    expect(pinyinKey("行", "háng")).toBe("háng");
    expect(pinyinKey("行", "xíng")).toBe("xíng");
    expect(pinyinKey("东西", "dōngxi")).not.toBe(pinyinKey("东西", "dōngxī"));
  });
  it("gives one key across case, spacing, NFD and tone numbers", () => {
    const keys = ["xuéxí", "Xué xí", "xue2 xi2", "xuéxí"].map((r) => pinyinKey("学习", r));
    expect(new Set(keys)).toEqual(new Set(["xuéxí"]));
  });
  it("gives no key for a toneless reading, IPA, or another word's pinyin", () => {
    expect(pinyinKey("学习", "xuexi")).toBeNull();
    expect(pinyinKey("学习", "ɕɥɛ̌ɕǐ")).toBeNull();
    expect(pinyinKey("行", "xuéxí")).toBeNull();
  });
});

describe("pinyinPairs", () => {
  it("pairs each character with its syllable, an erhua character without its r, and 一 or 不 without a tone", () => {
    const pairs = (term: string, reading: string) =>
      pinyinPairs(pinyinTermReading(term, reading) ?? []);
    expect(pairs("银行", "yínháng")).toEqual(["pinyin:银[yín]", "pinyin:行[háng]"]);
    expect(pairs("不行", "bù xíng")).toContain("pinyin:行[xíng]");
    expect(pairs("一点儿", "yì diǎnr")).toEqual(["pinyin:一[yi]", "pinyin:点[diǎn]"]);
    expect(pairs("不是", "bù shì")).toEqual(pairs("不是", "bú shì"));
    expect(pairs("你好吗", "nǐ")).toEqual([]);
  });
});

describe("inline pinyin", () => {
  const examples = [
    { text: "我说你好[nǐ hǎo]。", plain: "我说你好。" },
    { text: "我[wǒ]要一点儿[yì diǎnr]水", plain: "我要一点儿水" },
    { text: "[sound:nihao.mp3]你好", plain: "[sound:nihao.mp3]你好" },
    { text: "好[nǐ hǎo]", plain: "好[nǐ hǎo]" },
  ];
  it("gives each example back when parsed, written or stripped", () => {
    for (const { text, plain } of examples) {
      expect(formatPinyin(parsePinyin(text))).toBe(text);
      expect(stripPinyin(text)).toBe(plain);
    }
  });
  it("splits a bracket into one run per character, in tone marks", () => {
    expect(pinyinExampleSegments("我说你好[ni3 hao3]。")).toEqual([
      { text: "我说" },
      { text: "你", reading: "nǐ" },
      { text: "好", reading: "hǎo" },
      { text: "。" },
    ]);
    expect(pinyinExampleSegments("要一点儿[yìdiǎnr]")).toEqual([
      { text: "要" },
      { text: "一", reading: "yì" },
      { text: "点儿", reading: "diǎnr" },
    ]);
  });
  it("reads as many characters before a bracket as it has syllables", () => {
    expect(parsePinyin("我说你好[nǐ hǎo]")).toEqual([
      { text: "我说" },
      { text: "你好", reading: "nǐ hǎo" },
    ]);
  });
});

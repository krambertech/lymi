import { describe, expect, it } from "vitest";
import {
  clozeAnswer,
  clozeNumbers,
  fieldLanguage,
  furiganaBase,
  furiganaReading,
  hasFurigana,
  inlinePinyin,
  isImageOcclusion,
  markedExample,
  pinyinLine,
  pinyinReading,
  plainReading,
  questionField,
  repeatsText,
  revealCloze,
  samePinyin,
} from "./text";

describe("cloze", () => {
  const text = "Io {{c1::sono}} stanco e tu {{c2::sei::essere}} felice, {{c1::sono}} io.";
  it("reveals every deletion", () => {
    expect(revealCloze(text)).toBe("Io sono stanco e tu sei felice, sono io.");
  });
  it("lists the numbers and each number's answers and hint", () => {
    expect(clozeNumbers(text)).toEqual([1, 2]);
    expect(clozeAnswer(text, 1)).toEqual({ answers: ["sono", "sono"], hint: null });
    expect(clozeAnswer(text, 2)).toEqual({ answers: ["sei"], hint: "essere" });
  });
  it("reads nested deletions", () => {
    const nested = "{{c1::big {{c2::red}} house}} today";
    expect(revealCloze(nested)).toBe("big red house today");
    expect(clozeNumbers(nested)).toEqual([1, 2]);
    expect(clozeAnswer(nested, 1).answers).toEqual(["big red house"]);
    expect(clozeAnswer(nested, 2).answers).toEqual(["red"]);
  });
  it("leaves an unclosed deletion as text", () => {
    expect(revealCloze("a {{c1::b")).toBe("a {{c1::b");
  });
});

describe("furigana", () => {
  it("splits a term into what is written and how it is read", () => {
    expect(hasFurigana("漢字[かんじ]")).toBe(true);
    expect(furiganaBase("漢字[かんじ]")).toBe("漢字");
    expect(furiganaReading("漢字[かんじ]")).toBe("かんじ");
    expect(furiganaBase("日本[にほん] 語[ご]を 話[はな]す")).toBe("日本語を話す");
    expect(furiganaReading("日本[にほん] 語[ご]を 話[はな]す")).toBe("にほんごをはなす");
  });
  it("leaves brackets that are not readings alone", () => {
    expect(hasFurigana("cat [informal]")).toBe(false);
    expect(furiganaBase("cat [informal]")).toBe("cat [informal]");
    expect(hasFurigana("猫[sound:neko.mp3]")).toBe(false);
  });
});

describe("questionField", () => {
  const fields = ["Front", "Back", "Picture"];
  it("finds the first field a question shows", () => {
    expect(questionField("{{Front}}", fields)).toBe(0);
    expect(questionField("{{#Picture}}{{Picture}}{{/Picture}}<br>{{back}}", fields)).toBe(2);
    expect(questionField("{{type:Back}}", fields)).toBe(1);
    expect(questionField("{{cloze:Front}}", fields)).toBe(0);
    expect(questionField("{{FrontSide}}", fields)).toBeNull();
  });
  it("recognises image occlusion", () => {
    const template = "{{#Image Occlusion}}{{image-occlusion:Occlusion}}{{/Image Occlusion}}";
    expect(isImageOcclusion(template)).toBe(true);
    expect(questionField(template, ["Occlusion", "Image"])).toBeNull();
  });
});

describe("plainReading", () => {
  it("reads bracket furigana through to plain kana", () => {
    expect(plainReading("漢字[かんじ]")).toBe("かんじ");
    expect(plainReading("食[た]べる")).toBe("たべる");
    expect(plainReading("日本[にほん] 語[ご]")).toBe("にほんご");
  });

  it("keeps a reading that is already plain", () => {
    expect(plainReading("かんじ")).toBe("かんじ");
    expect(plainReading("ネコ")).toBe("ネコ");
    expect(plainReading("[sound:neko.mp3]")).toBe("[sound:neko.mp3]");
  });
});

describe("pinyin", () => {
  it("reads a pinyin field as one line, keeping separate readings apart", () => {
    expect(pinyinReading("yì\ndiǎnr ", "一点儿")).toBe("yì diǎnr");
    expect(pinyinReading("xíng\nháng", "行")).toBe("xíng / háng");
    expect(pinyinReading("yín  háng", "银行")).toBe("yín háng");
  });
  it("writes a sentence's numbered pinyin in tone marks, and anything else as it is", () => {
    expect(pinyinLine("Wo3 hen3 hao3.")).toBe("Wǒ hěn hǎo.");
    expect(pinyinLine("see p. 3")).toBe("see p. 3");
  });
  it("names Mandarin from pinyin fields, and traditional when its term is", () => {
    expect(fieldLanguage(["Hanzi", "Pinyin", "Meaning"])).toBe("zh");
    expect(fieldLanguage(["Traditional", "拼音", "Meaning"])).toBe("zh-Hant");
    expect(fieldLanguage(["Characters", "Jyutping", "Pinyin"])).toBeNull();
    expect(fieldLanguage(["Front", "Back"])).toBeNull();
  });
  it("knows numbered pinyin for the marked pinyin it repeats", () => {
    expect(samePinyin("yin2hang2", "yínháng")).toBe(true);
    expect(samePinyin("yi4 dian3r", "yìdiǎnr")).toBe(true);
    expect(samePinyin("ma5", "ma")).toBe(true);
    expect(samePinyin("yin2xing2", "yínháng")).toBe(false);
    expect(samePinyin("bank", "bank")).toBe(false);
  });
  it("knows a coloured or ruby copy of a text", () => {
    const toned = '<span class="tone3">你</span><span class="tone3">好</span>';
    expect(repeatsText(toned, "你好")).toBe(true);
    expect(repeatsText("<ruby>你<rt>nǐ</rt></ruby><ruby>好<rt>hǎo</rt></ruby>", "你好")).toBe(true);
    expect(repeatsText("你[nǐ]好[hǎo]", "你好")).toBe(true);
    expect(repeatsText("我很好。", "我[Wǒ]很[hěn]好[hǎo]。")).toBe(true);
    expect(repeatsText("您好", "你好")).toBe(false);
    expect(repeatsText("", "你好")).toBe(false);
  });
  it("marks tone numbers inside an example's brackets", () => {
    expect(markedExample("我说你好[ni3 hao3]。")).toBe("我说你好[nǐ hǎo]。");
    expect(markedExample("[sound:a.mp3] no pinyin")).toBe("[sound:a.mp3] no pinyin");
  });
  it("puts a sentence's pinyin inline, one bracket a pinyin word", () => {
    expect(inlinePinyin("我去银行。", "Wǒ qù yínháng.")).toBe("我[Wǒ]去[qù]银行[yín háng]。");
    expect(inlinePinyin("小姐，请回来", "Xiǎojie, qǐng huílai")).toBe(
      "小姐[Xiǎo jie]，请[qǐng]回来[huí lai]",
    );
    expect(inlinePinyin("我有一点儿。", "wo3 you3 yi4dian3r")).toBe(
      "我[wǒ]有[yǒu]一点儿[yì diǎnr]。",
    );
  });
  it("gives no inline pinyin when the syllables do not fall one a character", () => {
    expect(inlinePinyin("他学习3个小时。", "Tā xuéxí sān gè xiǎoshí.")).toBeNull();
    expect(inlinePinyin("我去银行。", "Wǒ qù.")).toBeNull();
    expect(inlinePinyin("我去OK", "Wǒ qù OK")).toBeNull();
    expect(inlinePinyin("你好", "a sentence in English")).toBeNull();
  });
});

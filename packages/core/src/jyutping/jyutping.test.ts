import { describe, expect, it } from "vitest";
import {
  formatJyutping,
  jyutpingDigits,
  jyutpingExampleSegments,
  jyutpingKey,
  jyutpingPairs,
  jyutpingSyllables,
  jyutpingTermReading,
  parseJyutping,
  stripJyutping,
} from ".";

const drawn = (term: string, reading: string) => {
  const segments = jyutpingTermReading(term, reading);
  return segments && formatJyutping(segments);
};
const pairs = (term: string, reading: string) =>
  jyutpingPairs(jyutpingTermReading(term, reading) ?? []);

describe("jyutpingSyllables", () => {
  it("splits at spaces and after each tone number", () => {
    expect(jyutpingSyllables("nei5 hou2")).toEqual(["nei5", "hou2"]);
    expect(jyutpingSyllables("nei5hou2")).toEqual(["nei5", "hou2"]);
    expect(jyutpingSyllables("Hoeng1gong2")).toEqual(["Hoeng1", "gong2"]);
    expect(jyutpingSyllables("gwong2-dung1")).toEqual(["gwong2", "dung1"]);
    expect(jyutpingSyllables("nei５ hou２")).toEqual(["nei5", "hou2"]);
    expect(jyutpingSyllables("ｎｅｉ5")).toEqual(["nei5"]);
  });
  it("reads the syllabic nasals of 唔 and 五, and keeps ng as an initial where a vowel follows", () => {
    expect(jyutpingSyllables("m4 goi1")).toEqual(["m4", "goi1"]);
    expect(jyutpingSyllables("ng5")).toEqual(["ng5"]);
    expect(jyutpingSyllables("ngo5")).toEqual(["ngo5"]);
    expect(jyutpingSyllables("ngo")).toEqual(["ngo"]);
  });
  it("splits solid toneless Jyutping by the syllable list, longest first", () => {
    expect(jyutpingSyllables("neihou")).toEqual(["nei", "hou"]);
    expect(jyutpingSyllables("jyutping")).toEqual(["jyut", "ping"]);
  });
  it("covers the rounded vowels and labialised initials", () => {
    expect(jyutpingSyllables("zoeng2 ceoi1 jyu4 gwok3 kwaang1 wui5 deu6")).toHaveLength(7);
  });
  it("finds nothing in pinyin, IPA or tones past 6", () => {
    expect(jyutpingSyllables("ni3 hao3")).toBeNull();
    expect(jyutpingSyllables("xue2 xi2")).toBeNull();
    expect(jyutpingSyllables("nei˩˧ hou˧˥")).toBeNull();
    expect(jyutpingSyllables("sik7")).toBeNull();
    expect(jyutpingSyllables("")).toBeNull();
  });
  it("reads a labial before a rounded front vowel as no syllable", () => {
    expect(jyutpingSyllables("byu1")).toBeNull();
    expect(jyutpingSyllables("ngi1")).toBeNull();
  });
});

describe("jyutpingTermReading", () => {
  it("puts one syllable over each character", () => {
    expect(drawn("你好", "nei5 hou2")).toBe("你[nei5]好[hou2]");
    expect(drawn("銀行", "ngan4hong4")).toBe("銀[ngan4]行[hong4]");
  });
  it("draws colloquial characters like any other", () => {
    expect(drawn("唔該", "m4 goi1")).toBe("唔[m4]該[goi1]");
    expect(drawn("食咗", "sik6 zo2")).toBe("食[sik6]咗[zo2]");
    expect(drawn("我嘅", "ngo5 ge3")).toBe("我[ngo5]嘅[ge3]");
    expect(drawn("冇啲", "mou5 di1")).toBe("冇[mou5]啲[di1]");
  });
  it("counts a character outside the Basic Multilingual Plane as one", () => {
    expect(drawn("搭𨋢", "daap3 lip1")).toBe("搭[daap3]𨋢[lip1]");
    expect(drawn("𡃁仔", "leng1 zai2")).toBe("𡃁[leng1]仔[zai2]");
  });
  it("leaves letters plain, taking a word of the reading only when it is them", () => {
    expect(drawn("卡拉OK", "kaa1 laa1 OK")).toBe("卡[kaa1]拉[laa1]OK");
    expect(drawn("T恤", "T seot1")).toBe("T恤[seot1]");
  });
  it("lets letters take a syllable a letter, or one for the run, when the reading says them", () => {
    expect(drawn("T恤", "ti1 seot1")).toBe("T[ti1]恤[seot1]");
    expect(drawn("A貨", "ei1 fo3")).toBe("A[ei1]貨[fo3]");
    expect(drawn("卡拉OK", "kaa1 laa1 ou1 kei1")).toBe("卡[kaa1]拉[laa1]OK[ou1 kei1]");
    expect(drawn("BB仔", "bi4 zai2")).toBe("BB[bi4]仔[zai2]");
  });
  it("puts a reading that does not fit over the whole term", () => {
    expect(drawn("你好嗎", "nei5 hou2")).toBe("你好嗎[nei5 hou2]");
  });
  it("puts a one-form reading over the first of listed forms", () => {
    expect(drawn("行 · 行路", "hang4")).toBe("行[hang4] · 行路");
  });
  it("draws nothing for what is not Jyutping, or a term with no character", () => {
    expect(drawn("你好", "ni3 hao3")).toBeNull();
    expect(drawn("OK", "ou1 kei1")).toBeNull();
  });
});

describe("jyutpingKey", () => {
  it("keeps a polyphone's readings apart", () => {
    expect(jyutpingKey("行", "hong4")).not.toBe(jyutpingKey("行", "hang4"));
    expect(jyutpingKey("長", "coeng4")).not.toBe(jyutpingKey("長", "zoeng2"));
    expect(jyutpingKey("樂", "lok6")).not.toBe(jyutpingKey("樂", "ngok6"));
  });
  it("keeps a changed tone as its own reading", () => {
    expect(jyutpingKey("女", "neoi5")).not.toBe(jyutpingKey("女", "neoi2"));
  });
  it("matches across spacing, case, punctuation and raised tone numbers", () => {
    const key = jyutpingKey("香港", "hoeng1 gong2");
    expect(key).toBe("hoeng1gong2");
    for (const reading of [
      "Hoeng1gong2",
      "hoeng1-gong2",
      "hoeng¹ gong²",
      "hoeng１ gong２",
      "hoeng1 gong2.",
    ])
      expect(jyutpingKey("香港", reading)).toBe(key);
  });
  it("gives no key unless every character's syllable carries a tone", () => {
    expect(jyutpingKey("香港", "hoeng gong")).toBeNull();
    expect(jyutpingKey("香港", "hoeng1 gong")).toBeNull();
  });
  it("gives no key to another romanisation, IPA, pinyin or another word's reading", () => {
    expect(jyutpingKey("香港", "heung1 gong2")).toBeNull();
    expect(jyutpingKey("你好", "nei˩˧ hou˧˥")).toBeNull();
    expect(jyutpingKey("你好", "ni3 hao3")).toBeNull();
    expect(jyutpingKey("你好", "nei5")).toBeNull();
  });
  it("keys letters by the characters' syllables alone", () => {
    expect(jyutpingKey("卡拉OK", "kaa1 laa1 OK")).toBe("kaa1laa1");
    expect(jyutpingKey("T恤", "ti1 seot1")).toBe("ti1seot1");
    expect(jyutpingKey("A貨", "ei1 fo3")).toBe("ei1fo3");
  });
});

describe("jyutpingPairs", () => {
  it("pairs each character with its syllable", () => {
    expect(pairs("銀行", "ngan4 hong4")).toEqual(["jyutping:銀[ngan4]", "jyutping:行[hong4]"]);
    expect(pairs("行路", "hang4 lou6")).toEqual(["jyutping:行[hang4]", "jyutping:路[lou6]"]);
  });
  it("pairs a character outside the Basic Multilingual Plane whole", () => {
    expect(pairs("搭𨋢", "daap3 lip1")).toContain("jyutping:𨋢[lip1]");
  });
  it("gives no pair for a reading over the whole term or a toneless syllable", () => {
    expect(pairs("你好嗎", "nei5 hou2")).toEqual([]);
    expect(pairs("你好", "nei hou")).toEqual([]);
  });
});

describe("parseJyutping", () => {
  const read = (text: string) => formatJyutping(parseJyutping(text));

  it("puts each bracket over as many characters before it as it has syllables", () => {
    expect(parseJyutping("我去銀行[ngan4 hong4]。")).toEqual([
      { text: "我去" },
      { text: "銀行", reading: "ngan4 hong4" },
      { text: "。" },
    ]);
    expect(parseJyutping("佢搭𨋢[daap3 lip1]上去")).toEqual([
      { text: "佢" },
      { text: "搭𨋢", reading: "daap3 lip1" },
      { text: "上去" },
    ]);
  });
  it("reads hyphens and raised or full-width tone numbers inside a bracket", () => {
    expect(parseJyutping("我講廣東話[gwong2-dung1 waa2]。")[1]).toEqual({
      text: "廣東話",
      reading: "gwong2-dung1 waa2",
    });
    expect(parseJyutping("你好[nei⁵ hou²]")).toEqual([{ text: "你好", reading: "nei⁵ hou²" }]);
    expect(parseJyutping("你好[nei５ hou２]")).toEqual([{ text: "你好", reading: "nei５ hou２" }]);
    expect(stripJyutping("我講廣東話[gwong2-dung1 waa2]。")).toBe("我講廣東話。");
  });
  it("reads letters before the characters when the bracket says them", () => {
    expect(parseJyutping("佢着住一件T恤[ti1 seot1]。")).toEqual([
      { text: "佢着住一件" },
      { text: "T恤", reading: "ti1 seot1" },
      { text: "。" },
    ]);
    expect(parseJyutping("一件T恤[seot1]")).toEqual([
      { text: "一件T" },
      { text: "恤", reading: "seot1" },
    ]);
    expect(jyutpingExampleSegments("T恤[ti1 seot1]")).toEqual([
      { text: "T", reading: "ti1" },
      { text: "恤", reading: "seot1" },
    ]);
  });
  it("leaves a bracket that is not toned Jyutping, or finds too few characters, as written", () => {
    for (const text of ["[sound:hou2.mp3]你好", "我話[ok]", "好[hou2 hou2]", "我[hao3]"])
      expect(parseJyutping(text)).toEqual([{ text }]);
  });
  it("never reaches back past the bracket before it", () => {
    expect(read("你[nei5]好[hou2 hou2]")).toBe("你[nei5]好[hou2 hou2]");
    expect(parseJyutping("你[nei5]好[hou2 hou2]")[1]).toEqual({ text: "好[hou2 hou2]" });
  });
  it("round-trips, and strips back to the sentence", () => {
    const text = "我食咗飯[sik6 zo2 faan6]啦。";
    expect(parseJyutping(text)[0]).toEqual({ text: "我" });
    expect(read(text)).toBe(text);
    expect(stripJyutping(text)).toBe("我食咗飯啦。");
    expect(stripJyutping("唔該[m4 goi1]晒")).toBe("唔該晒");
  });
});

describe("jyutpingDigits", () => {
  it("lowers raised tone numbers when that gives Jyutping", () => {
    expect(jyutpingDigits("nei⁵ hou²")).toBe("nei5 hou2");
    expect(jyutpingDigits("nei５ hou２")).toBe("nei5 hou2");
  });
  it("leaves anything else as written", () => {
    expect(jyutpingDigits("nei5 hou2")).toBe("nei5 hou2");
    expect(jyutpingDigits("nei¹³ hou³⁵")).toBe("nei¹³ hou³⁵");
    expect(jyutpingDigits("ni³ hao³")).toBe("ni³ hao³");
  });
});

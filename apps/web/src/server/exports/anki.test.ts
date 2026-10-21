import { htmlToText, parseReadings } from "@lymi/core";
import { describe, expect, it } from "vitest";
import { ankiExample } from "./anki";

describe("ankiExample", () => {
  const text = "私[わたし]は毎朝[まいあさ]パンを食[た]べます。";

  it("starts each reading's kanji after a space, as Anki's furigana filter needs", () => {
    expect(ankiExample(text, "ja")).toBe("私[わたし]は 毎朝[まいあさ]パンを 食[た]べます。");
  });

  it("reads back as the same readings", () => {
    expect(parseReadings(htmlToText(ankiExample(text, "ja")))).toEqual(parseReadings(text));
  });

  it("keeps any other bracket as text, so Anki draws no ruby over it", () => {
    expect(ankiExample("das Haus[e] & <mehr>", "de")).toBe(
      "das Haus&#91;e&#93; &amp; &lt;mehr&gt;",
    );
    expect(htmlToText(ankiExample("das Haus[e]", "de"))).toBe("das Haus[e]");
  });

  it("starts each Chinese word's characters after a space or a reading, and keeps kana brackets as text", () => {
    const pinyin = "我[wǒ]去[qù]银行[yínháng]，说你好[nǐ hǎo]。";
    expect(ankiExample(pinyin, "zh")).toBe("我[wǒ]去[qù]银行[yínháng]，说 你好[nǐ hǎo]。");
    expect(ankiExample("銀行[ぎんこう]", "zh")).toBe("銀行&#91;ぎんこう&#93;");
  });

  it("writes a Cantonese example's Jyutping the same way, and leaves pinyin as text", () => {
    const jyutping = "我[ngo5]去[heoi3]銀行[ngan4 hong4]，話你好[nei5 hou2]。";
    expect(ankiExample(jyutping, "zh-yue")).toBe(
      "我[ngo5]去[heoi3]銀行[ngan4 hong4]，話 你好[nei5 hou2]。",
    );
    expect(ankiExample("你好[nǐ hǎo]", "yue")).toBe("你好&#91;nǐ hǎo&#93;");
  });

  it("is empty for no example", () => {
    expect(ankiExample(null, "ja")).toBe("");
  });
});

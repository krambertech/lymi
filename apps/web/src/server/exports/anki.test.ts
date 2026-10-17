import { htmlToText, parseReadings } from "@lymi/core";
import { describe, expect, it } from "vitest";
import { ankiExample } from "./anki";

describe("ankiExample", () => {
  const text = "私[わたし]は毎朝[まいあさ]パンを食[た]べます。";

  it("starts each reading's kanji after a space, as Anki's furigana filter needs", () => {
    expect(ankiExample(text)).toBe("私[わたし]は 毎朝[まいあさ]パンを 食[た]べます。");
  });

  it("reads back as the same readings", () => {
    expect(parseReadings(htmlToText(ankiExample(text)))).toEqual(parseReadings(text));
  });

  it("keeps any other bracket as text, so Anki draws no ruby over it", () => {
    expect(ankiExample("das Haus[e] & <mehr>")).toBe("das Haus&#91;e&#93; &amp; &lt;mehr&gt;");
    expect(htmlToText(ankiExample("das Haus[e]"))).toBe("das Haus[e]");
  });

  it("is empty for no example", () => {
    expect(ankiExample(null)).toBe("");
  });
});

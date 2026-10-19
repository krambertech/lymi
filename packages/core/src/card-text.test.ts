import { describe, expect, it } from "vitest";
import { normalizeCardText } from "./card-text";

describe("normalizeCardText", () => {
  it("splits a bracketed term only for a language drawn with furigana", () => {
    expect(normalizeCardText("ja-JP", { term: "食[た]べる", meaning: "to eat" })).toEqual({
      fields: { term: "食べる", pronunciation: "たべる", meaning: "to eat" },
      normalized: ["term", "pronunciation"],
    });
    for (const language of [null, "it", "zh"]) {
      expect(normalizeCardText(language, { term: "食[た]べる" }).normalized).toEqual([]);
    }
  });

  it("keeps the pronunciation that was sent when it is the same reading", () => {
    expect(normalizeCardText("ja", { term: "上手[じょうず]", pronunciation: "ジョウズ" })).toEqual({
      fields: { term: "上手", pronunciation: "ジョウズ" },
      normalized: ["term"],
    });
  });

  it("leaves both fields as sent when the pronunciation names another reading", () => {
    const sent = { term: "上手[じょうず]", pronunciation: "dʒoːzɯ" };
    expect(normalizeCardText("ja", sent)).toEqual({ fields: sent, normalized: [] });
  });

  it("converts nothing when no term is written, as an enrichment fill sends", () => {
    expect(normalizeCardText("ja", { pronunciation: "たべる" }).normalized).toEqual([]);
  });
});

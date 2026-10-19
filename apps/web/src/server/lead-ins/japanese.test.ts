import type { Card } from "@lymi/core/schema";
import { describe, expect, it } from "vitest";
import { leadInPolicy } from ".";
import { japanese } from "./japanese";

const input = { term: "橋", reading: "はし", meaning: "bridge" };
const card = (patch: Partial<Card>) =>
  ({ term: "橋", pronunciation: "はし", meaning: "bridge", language: "ja", ...patch }) as Card;

describe("Japanese lead-ins", () => {
  it("is the policy for every Japanese tag and no other language", () => {
    expect(leadInPolicy("ja")).toBe(japanese);
    expect(leadInPolicy("ja-JP")).toBe(japanese);
    expect(leadInPolicy("et")).toBeUndefined();
    expect(leadInPolicy(null)).toBeUndefined();
  });

  it("sends a short kana word with a meaning on, and screens out the rest for free", () => {
    expect(japanese.screen(card({}))).toEqual(input);
    expect(japanese.screen(card({ pronunciation: null }))).toBe("no_reading");
    expect(japanese.screen(card({ pronunciation: "hashi" }))).toBe("no_reading");
    expect(japanese.screen(card({ meaning: " " }))).toBe("no_meaning");
    expect(japanese.screen(card({ meaning: "x".repeat(501) }))).toBe("long_meaning");
    expect(japanese.screen(card({ term: "橋を渡る。" }))).toBe("sentence");
    expect(japanese.screen(card({ term: "コーヒー", pronunciation: "こーひー" }))).toBe("loanword");
    expect(
      japanese.screen(card({ term: "図書館員", pronunciation: "としょかんいんさんたち" })),
    ).toBe("long");
  });

  it("accepts an explicit no-context result and refuses repetition, markup and generic modifiers", () => {
    expect(japanese.accepts(null, input)).toBe(true);
    expect(japanese.accepts("川を渡る", input)).toBe(true);
    for (const prefix of ["橋の", "はし", "とても", "新しい", "川。", "[quiet]", "あ".repeat(17)])
      expect(japanese.accepts(prefix, input)).toBe(false);
  });

  it("keeps lead-ins whose ordinary words contain a one-kana reading, unless they end in it", () => {
    const tree = { term: "木", reading: "き", meaning: "tree" };
    const leaf = { term: "葉", reading: "は", meaning: "leaf" };
    expect(japanese.accepts("大きな", tree)).toBe(true);
    expect(japanese.accepts("秋には色づく", leaf)).toBe(true);
    expect(japanese.accepts("木の", tree)).toBe(false);
    expect(japanese.accepts("ゆき", tree)).toBe(false);
  });
});

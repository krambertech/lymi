import { describe, expect, it } from "vitest";
import { languagePrompts } from "../languages";
import { type CheckedCard, checkCard, isSentence, tally, words } from "./checks";

const reply = (fields: Partial<Record<string, string | null>>) => ({
  id: "c1",
  meaning: null,
  example: null,
  notes: null,
  pronunciation: null,
  language: null,
  ...fields,
});

const word: CheckedCard = {
  term: "tulema",
  mayFill: ["meaning", "example", "notes"],
  language: true,
  expect: {},
};

const broken = (card: CheckedCard, fields: Parameters<typeof reply>[0]) =>
  checkCard(card, reply(fields))
    .filter((result) => !result.pass)
    .map((result) => `${result.field}: ${result.rule}`);

describe("isSentence", () => {
  it("reads sentence punctuation as a sentence, and an idiom without it as none", () => {
    expect(isSentence("Ma ei tea veel.")).toBe(true);
    expect(isSentence("in bocca al lupo")).toBe(false);
    expect(isSentence("die Bank")).toBe(false);
  });
  it("reads Japanese and Chinese sentence enders as a sentence", () => {
    expect(isSentence("まだ分かりません。")).toBe(true);
    expect(isSentence("本当？")).toBe(true);
    expect(isSentence("すごい！")).toBe(true);
    expect(isSentence("上手")).toBe(false);
  });
});

describe("words", () => {
  it("counts spaced scripts by spaces, a hyphenated word as one", () => {
    expect(words("  a well-known  word ")).toBe(3);
    expect(words("jooma · juua")).toBe(3);
  });
  it("counts the words inside an unspaced script", () => {
    expect(words("上手")).toBe(1);
    expect(words("日本語を勉強します")).toBeGreaterThan(3);
  });
});

describe("checkCard", () => {
  it("holds a Japanese example to the word limit", () => {
    const japanese: CheckedCard = {
      term: "上手",
      mayFill: ["example"],
      language: true,
      expect: {},
    };
    expect(broken(japanese, { example: "彼女は絵が上手です。" })).toEqual([]);
    expect(
      broken(japanese, {
        example:
          "私の友達の妹は小さい時から毎日ピアノを練習していたので今ではとても上手に弾けます。",
      }),
    ).toEqual(["example: under twelve words"]);
  });

  it("holds a reply to the rules its language module adds", () => {
    const japanese: CheckedCard = {
      term: "毎朝",
      mayFill: ["example"],
      language: true,
      rules: languagePrompts("ja")?.checks,
      expect: {},
    };
    expect(broken(japanese, { example: "毎朝[まいあさ]パンを食[た]べます。" })).toEqual([]);
    expect(broken(japanese, { example: "毎朝パンを食べます。" })).toEqual([
      "example: readings over kanji",
    ]);
  });

  it("passes a short gloss with forms in the notes", () => {
    expect(broken(word, { meaning: "приходить", notes: "*tulema · tulla · tulen*" })).toEqual([]);
  });

  it("fails a definition where a gloss belongs, and a field outside mayFill", () => {
    expect(
      broken(word, {
        meaning: "прийти в какое-то место откуда-то ещё.",
        language: "et",
      }),
    ).toEqual(["meaning: short gloss", "meaning: no full stop", "language: only mayFill"]);
  });

  it("holds each field to what the case expects", () => {
    const card = {
      ...word,
      expect: {
        meaning: { oneOf: ["приходить", "прийти"] },
        example: "empty",
        notes: { includes: ["tulla", "tulen"] },
      },
    } satisfies CheckedCard;
    expect(broken(card, { meaning: "Прийти", notes: "*tulema · tulla · tulen*" })).toEqual([]);
    expect(broken(card, { meaning: "идти", example: "Ma tulen koju.", notes: "*tulema*" })).toEqual(
      [
        "meaning: expected text",
        "example: expected empty",
        "notes: includes tulla",
        "notes: includes tulen",
      ],
    );
  });

  it("rules out an example for a sentence and Markdown the notes cannot show", () => {
    const sentence = { ...word, term: "Ma ei tea veel." };
    expect(
      broken(sentence, {
        meaning: "Я ещё не знаю.",
        example: "Ma ei tea, kus ta on.",
        notes: "# Grammar\n`ei` + partitive",
      }),
    ).toEqual(["example: no example for a sentence", "notes: no heading", "notes: no code"]);
  });

  it("counts every field as unanswered when the card is missing from the reply", () => {
    expect(checkCard(word, undefined).every((result) => !result.pass)).toBe(true);
  });
});

describe("tally", () => {
  it("groups includes and excludes under one rule per field", () => {
    const results = checkCard(
      { ...word, expect: { notes: { includes: ["tulla", "tulen"] } } },
      reply({ meaning: "приходить", notes: "*tulema · tulla*" }),
    );
    expect(tally(results).get("notes: includes")).toEqual({ pass: 1, total: 2 });
  });
});

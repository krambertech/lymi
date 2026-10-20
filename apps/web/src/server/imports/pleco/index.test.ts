import { readFileSync } from "node:fs";
import { encodeTextImport } from "@lymi/core";
import { describe, expect, it } from "vitest";
import type { ImportChoices } from "../adapter";
import { bytesSource, ImportFileError } from "../files";
import { quizlet } from "../quizlet";
import { MAX_PLECO_BYTES, PLECO_BOTH, PLECO_ONE, pleco } from "./index";
import { looksLikePleco, plainDefinition } from "./text";

const fixture = (name: string) =>
  new Uint8Array(readFileSync(new URL(`./fixtures/${name}`, import.meta.url)));
const file = (text: string) => bytesSource(new TextEncoder().encode(text));
const NO_CHOICES: ImportChoices = { languages: {}, roles: {} };

async function read(bytes: Uint8Array, choices = NO_CHOICES) {
  const { summary, notes } = await pleco.inspect(bytesSource(bytes));
  const all = [...notes];
  return { summary, notes: all, cards: all.flatMap((n) => pleco.cards(n, summary, choices)) };
}

const byTerm = (cards: Awaited<ReturnType<typeof read>>["cards"]) =>
  cards.map((c) => [c.fields.term, c.fields.pronunciation, c.fields.notes, c.tags]);

describe("pleco adapter", () => {
  it("claims a Pleco export ahead of Quizlet, and leaves other text to Quizlet", async () => {
    expect(await pleco.detect(bytesSource(fixture("both.txt")), "flash.txt")).toBe(true);
    expect(await pleco.detect(bytesSource(fixture("malformed.txt")), "flash.TXT")).toBe(true);
    // Only a .txt: a Pleco XML export or a renamed file is not claimed.
    expect(await pleco.detect(bytesSource(fixture("both.txt")), "flash.xml")).toBe(false);
    for (const text of [
      "der Hund\tthe dog\ndie Katze\tthe cat",
      "你好\thello\n谢谢\tthank you",
      "你好\tnǐ hǎo\thello",
      encodeTextImport({ separators: { field: "\t", row: "\n" }, deckName: "" }, "你好\tni3hao3"),
      "",
    ]) {
      expect(await pleco.detect(file(text), "set.txt")).toBe(false);
      if (text) expect(await quizlet.detect(file(text), "set.txt")).toBe(true);
    }
    expect(looksLikePleco("//Food\n茶\tcha2\ttea")).toBe(true);
    expect(looksLikePleco("你好\tnǐhǎo\n//Greetings")).toBe(true);
  });

  it("keeps both scripts, tone numbers as sent, and each category as a tag", async () => {
    const { summary, notes, cards } = await read(fixture("both.txt"));
    expect(summary.decks).toEqual([
      { key: "pleco", name: "Pleco flashcards", description: null, cards: 9 },
    ]);
    expect(summary.languages).toEqual({ pleco: "zh" });
    expect(summary.tags).toEqual(["HSK 1", "HSK 1/Verbs", "Bank words/Places"]);
    expect(summary.noteTypes).toEqual([
      expect.objectContaining({
        key: PLECO_BOTH,
        fields: ["Simplified", "Traditional", "Pinyin", "Definition"],
        roles: ["term", "notes", "pronunciation", "meaning"],
        notes: 9,
      }),
    ]);
    expect(notes).toHaveLength(9);
    expect(byTerm(cards)).toEqual([
      ["你好", "ni3hao3", undefined, ["HSK 1"]],
      // 东西 is two words told apart by pinyin; the repeat under a second category is one card.
      ["东西", "dong1xi5", "東西", ["HSK 1", "Bank words/Places"]],
      ["东西", "dong1xi1", "東西", ["HSK 1"]],
      // 行 háng and xíng stay two cards; the duplicate rules decide between them while writing.
      ["行", "xing2", undefined, ["HSK 1"]],
      ["学习", "xue2xi2", "學習", ["HSK 1/Verbs", "HSK 1"]],
      ["开学", "kai1xue2", "開學", ["HSK 1/Verbs"]],
      ["走", "zou3", undefined, ["HSK 1/Verbs"]],
      ["银行", "yin2hang2", "銀行", ["Bank words/Places"]],
      ["行", "hang2", undefined, ["Bank words/Places"]],
    ]);
    expect(cards.find((c) => c.fields.term === "走")?.fields.meaning).toBe(
      "to go on foot See 走路",
    );
    expect(cards.find((c) => c.fields.term === "银行")?.fields.meaning).toBe("a bank");
    expect(cards[0]).toMatchObject({
      deckKey: "pleco",
      noteTypeKey: PLECO_BOTH,
      modes: ["term_to_meaning"],
      progress: [{ mode: "term_to_meaning", reviews: [], unstarted: true }],
      archived: false,
    });
  });

  it("puts the traditional form on the term when the learner chooses it", async () => {
    const choices = {
      languages: {},
      roles: { [PLECO_BOTH]: ["notes", "term", "pronunciation", "meaning"] },
    } satisfies ImportChoices;
    const { cards } = await read(fixture("both.txt"), choices);
    expect(byTerm(cards).slice(0, 2)).toEqual([
      ["你好", "ni3hao3", undefined, ["HSK 1"]],
      ["東西", "dong1xi5", "东西", ["HSK 1", "Bank words/Places"]],
    ]);
  });

  it("gives every card an id that holds across exports and definitions", async () => {
    const first = (await read(fixture("both.txt"))).cards.map((c) => c.externalId);
    expect(new Set(first).size).toBe(first.length);
    expect((await read(fixture("both.txt"))).cards.map((c) => c.externalId)).toEqual(first);
    const edited = new TextDecoder()
      .decode(fixture("both.txt"))
      .replace("thing; stuff", "things in general");
    const again = (await read(new TextEncoder().encode(edited))).cards;
    expect(again.find((c) => c.fields.meaning === "things in general")?.externalId).toBe(first[1]);
  });

  it("reads malformed lines as far as they go and skips a line with no characters", async () => {
    const { summary, notes, cards } = await read(fixture("malformed.txt"));
    expect(summary.tags).toEqual([]);
    expect(summary.noteTypes[0]?.key).toBe(PLECO_BOTH);
    expect(notes).toHaveLength(8);
    expect(
      cards.map((c) => [c.fields.term, c.fields.pronunciation, c.fields.meaning, c.fields.notes]),
    ).toEqual([
      ["绿茶", "lu:4cha2", "green tea", "綠茶"],
      ["谢谢", undefined, undefined, undefined],
      ["朋友", "peng2you5", "friend extra column after a stray tab", undefined],
      ["東西", "dong1xi5", "traditional characters with no brackets", undefined],
      ["猫[貓", "mao1", "an unclosed bracket", undefined],
      ["一点儿", "yi1dian3r5", "a little", "一點兒"],
      ["苹果", "ping2guo3", undefined, "蘋果"],
    ]);
  });

  it("reads a one-script export and UTF-16 with its byte-order mark", async () => {
    const text = "//Food\r\n茶\tcha2\ttea\r\n麵包\tmian4bao1\tbread\r\n";
    const le = utf16(text, "le");
    const be = utf16(text, "be");
    for (const bytes of [new TextEncoder().encode(text), le, be]) {
      expect(await pleco.detect(bytesSource(bytes), "flash.txt")).toBe(true);
      const { summary, cards } = await read(bytes);
      expect(summary.noteTypes[0]).toMatchObject({
        key: PLECO_ONE,
        fields: ["Characters", "Pinyin", "Definition"],
        roles: ["term", "pronunciation", "meaning"],
      });
      expect(byTerm(cards)).toEqual([
        ["茶", "cha2", undefined, ["Food"]],
        ["麵包", "mian4bao1", undefined, ["Food"]],
      ]);
    }
  });

  it("keeps a nested category's own name when its path is past the tag limit", async () => {
    const path = "Textbook chapters/Integrated Chinese level one/Lesson 12 Dining";
    const { summary, cards } = await read(new TextEncoder().encode(`//${path}\n菜\tcai4\tdish`));
    expect(summary.tags).toEqual([`…${path.slice(-39)}`]);
    expect(cards[0]?.tags).toEqual([`…${path.slice(-39)}`]);
  });

  it("refuses text that isn't UTF-8 and an export over the size cap", async () => {
    await expect(pleco.inspect(bytesSource(new Uint8Array([0xc3, 0x28, 0x09])))).rejects.toThrow(
      ImportFileError,
    );
    const big = {
      size: MAX_PLECO_BYTES + 1,
      read: async () => new Uint8Array(),
      stream: async () => new ReadableStream(),
    };
    await expect(pleco.inspect(big)).rejects.toMatchObject({ failure: "too_large" });
  });

  it("removes Pleco's link and formatting marks from a definition", () => {
    expect(plainDefinition("see 1好hao3好 and bold")).toBe("see 好 and bold");
  });
});

/** Text as UTF-16 with its byte-order mark, as Pleco's UTF-16 encodings write it. */
function utf16(text: string, order: "le" | "be"): Uint8Array {
  const bytes = new Uint8Array(2 + text.length * 2);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, 0xfeff, order === "le");
  for (let i = 0; i < text.length; i++)
    view.setUint16(2 + i * 2, text.charCodeAt(i), order === "le");
  return bytes;
}

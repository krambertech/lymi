import { readFileSync } from "node:fs";
import type { ImportedCard } from "@lymi/core";
import { describe, expect, it, vi } from "vitest";
import type { ImportChoices, SourceSummary } from "../adapter";
import { bytesSource } from "../files";
import { anki } from "./index";

/** Whether Chinese examples draw pinyin, which slice 4 of docs/proposals/chinese.md turns on in core. */
const examples = vi.hoisted(() => ({ drawPinyin: false }));
vi.mock("@lymi/core", async (original) => {
  const core = await original<typeof import("@lymi/core")>();
  return {
    ...core,
    examplesCarryReadings: (language: string | null | undefined) =>
      core.readingEngine(language) === "pinyin"
        ? examples.drawPinyin
        : core.examplesCarryReadings(language),
  };
});

const FILES = ["legacy.apkg", "current.apkg", "legacy.colpkg", "current.colpkg"];
const file = (name: string) =>
  bytesSource(new Uint8Array(readFileSync(new URL(`./fixtures/${name}`, import.meta.url))));
const noChoices: ImportChoices = { languages: {}, roles: {} };
const DAY = 86_400_000;
/** The fixture collection starts on this day; its due dates count from here. */
const CREATED = Date.UTC(2026, 0, 1, 4);

async function read(name: string, choices = noChoices) {
  const { summary, notes } = await anki.inspect(file(name));
  const cards = [...notes].flatMap((note) => anki.cards(note, summary, choices));
  return { summary, cards };
}

/** A card with ids and deck keys replaced by names, so two containers can be compared. */
function comparable(cards: ImportedCard[], decks: Map<string, string>) {
  return cards
    .map((card) => ({ ...card, deckKey: decks.get(card.deckKey), externalId: undefined }))
    .sort((a, b) => a.fields.term.localeCompare(b.fields.term));
}

const byTerm = (cards: ImportedCard[], term: string) => {
  const card = cards.find((c) => c.fields.term === term);
  if (!card) throw new Error(`no card ${term}`);
  return card;
};

describe("anki adapter", () => {
  it("recognises every Anki container and nothing else", async () => {
    for (const name of FILES) expect(await anki.detect(file(name), name)).toBe(true);
    expect(await anki.detect(bytesSource(new TextEncoder().encode("not a zip")), "x.apkg")).toBe(
      false,
    );
  });

  it("summarises what the file holds", async () => {
    const { summary } = await read("current.apkg");
    expect(summary).toMatchObject({ notes: 9, pictures: 2, audio: 1, unsupported: 0 });
    // Eleven grades in the fixture log; the manual reschedule is not one of them.
    expect(summary.reviews).toBe(11);
    expect(summary.decks.map((d) => [d.name, d.cards])).toEqual([
      ["Italian::Grammar", 2],
      // Six notes; the reversed one is one Lymi card although Anki has two.
      ["Italian::Lesson 1", 6],
      ["Japanese", 2],
    ]);
    expect(summary.decks.find((d) => d.name === "Italian::Lesson 1")?.description).toBe(
      "Words from the first lesson",
    );
    const types = Object.fromEntries(summary.noteTypes.map((t) => [t.name, t]));
    expect(types.Basic).toMatchObject({ kind: "basic", roles: ["term", "meaning"], notes: 6 });
    expect(types.Cloze).toMatchObject({ kind: "cloze", roles: ["term", "meaning"] });
    expect(types["Japanese (reading)"]?.roles).toEqual(["term", "pronunciation", "meaning"]);
    expect(types["Basic (and reversed card)"]?.questions).toEqual([0, 1]);
    expect(types.Basic?.samples[0]).toEqual(["il gatto", "the cat"]);
  });

  it("reads the same cards from the legacy and the current container", async () => {
    const results = await Promise.all(FILES.map((name) => read(name)));
    const [first, ...rest] = results.map(({ summary, cards }) =>
      comparable(cards, new Map(summary.decks.map((d) => [d.key, d.name]))),
    );
    for (const other of rest) expect(other).toEqual(first);
    const ids = results.map(({ cards }) => cards.map((c) => c.externalId).sort());
    for (const other of ids.slice(1)) expect(other).toEqual(ids[0]);
  });

  it("turns HTML into text, takes the first picture, and keeps tags Lymi uses", async () => {
    const { cards } = await read("current.apkg");
    expect(byTerm(cards, "il gatto")).toMatchObject({
      fields: { meaning: "the cat" },
      tags: ["animals", "lesson::one"],
      picture: "gatto.png",
      archived: false,
    });
    expect(byTerm(cards, "il cane")).toMatchObject({
      fields: { meaning: "the dog" },
      picture: "cane.png",
    });
    expect(byTerm(cards, "ciao").fields.meaning).toBe("hello & goodbye");
  });

  it("archives a suspended card and keeps a long meaning that fits", async () => {
    const { cards } = await read("current.apkg");
    expect(byTerm(cards, "la casa").archived).toBe(true);
    // Overflow into notes is `fitFields`' rule, tested in core against the limits themselves.
    const long = byTerm(cards, "sbrigarsi");
    expect(long.shortened).toBe(false);
    expect(long.fields.meaning?.startsWith("to hurry up; to get a move on")).toBe(true);
  });

  it("makes one card of a reversed note, asked both ways with each side's own log", async () => {
    const { cards } = await read("current.apkg");
    const grazie = byTerm(cards, "grazie");
    expect(grazie.modes).toEqual(["term_to_meaning", "meaning_to_term"]);
    const [recognition, production] = grazie.progress;
    expect(recognition?.reviews.map((r) => r.rating)).toEqual([3, 3]);
    expect(production?.reviews.map((r) => r.rating)).toEqual([2, 3]);
    expect(recognition?.due?.getTime()).toBe(CREATED + 15 * DAY);
    expect(production?.due?.getTime()).toBe(CREATED + 16 * DAY);
  });

  it("makes one card per cloze number with the sentence as its example", async () => {
    const { cards } = await read("current.apkg");
    expect(byTerm(cards, "sono")).toMatchObject({
      fields: {
        meaning: "essere, present tense",
        example: "Io sono stanco e tu sei felice.",
      },
      modes: ["meaning_to_term"],
    });
    expect(byTerm(cards, "sei").fields.notes).toBe("essere");
    expect(byTerm(cards, "sono").externalId).not.toBe(byTerm(cards, "sei").externalId);
  });

  it("splits furigana into the term and its reading, and reads a reading field", async () => {
    const { cards } = await read("current.apkg");
    expect(byTerm(cards, "漢字").fields).toMatchObject({
      pronunciation: "かんじ",
      meaning: "Chinese characters",
    });
    expect(byTerm(cards, "猫").fields).toMatchObject({ pronunciation: "ねこ", meaning: "cat" });
  });

  it("keeps an example's readings, in Lymi's inline notation", async () => {
    const { summary, notes } = await anki.inspect(file("current.apkg"));
    const note = [...notes].find((n) => n.fields[0] === "猫");
    const type = summary.noteTypes.find((t) => t.name === "Japanese (reading)");
    if (!note || !type) throw new Error("no Japanese note");
    const [card] = anki.cards(
      { ...note, fields: ["猫", "猫[ねこ]が 好[す]きです。", "cat"] },
      summary,
      {
        languages: {},
        roles: { [type.key]: ["term", "example", "meaning"] },
      },
    );
    expect(card?.fields.example).toBe("猫[ねこ]が好[す]きです。");
  });

  it("strips readings that are not kana from an example, such as pinyin", async () => {
    const { summary, notes } = await anki.inspect(file("current.apkg"));
    const note = [...notes].find((n) => n.fields[0] === "猫");
    const type = summary.noteTypes.find((t) => t.name === "Japanese (reading)");
    if (!note || !type) throw new Error("no Japanese note");
    const [card] = anki.cards(
      { ...note, fields: ["猫", "我[wǒ] 喜欢[xǐhuan]猫。", "cat"] },
      summary,
      {
        languages: {},
        roles: { [type.key]: ["term", "example", "meaning"] },
      },
    );
    expect(card?.fields.example).toBe("我喜欢猫。");
  });

  describe("an HSK-shaped Chinese deck", () => {
    /** The fixture's cards under the languages the file says, or one language for every deck. */
    async function hsk(drawPinyin = true, language?: string | null) {
      examples.drawPinyin = drawPinyin;
      const { summary, notes } = await anki.inspect(file("hsk.apkg"));
      const languages = Object.fromEntries(
        summary.decks.map((d) => [
          d.key,
          language === undefined ? (summary.languages?.[d.key] ?? null) : language,
        ]),
      );
      const choices = { languages, roles: {} };
      return { summary, cards: [...notes].flatMap((note) => anki.cards(note, summary, choices)) };
    }
    const rolesOf = (summary: SourceSummary, name: string) => {
      const type = summary.noteTypes.find((t) => t.name === name);
      return Object.fromEntries(type?.fields.map((f, i) => [f, type.roles[i]]) ?? []);
    };

    it("says which decks are Chinese, and in which script, from their pinyin fields", async () => {
      const { summary } = await hsk();
      expect(summary.decks.map((d) => [d.name, summary.languages?.[d.key]])).toEqual([
        ["HSK::HSK 1", "zh"],
        ["Italiano", undefined],
        ["TOCFL", "zh-Hant"],
      ]);
    });

    it("guesses roles by name, and Skip for fields that only repeat the term or Reading", async () => {
      const { summary } = await hsk();
      expect(rolesOf(summary, "HSK Vocabulary")).toMatchObject({
        Simplified: "term",
        Traditional: "notes",
        Pinyin: "pronunciation",
        "Pinyin.1": "skip",
        SentenceSimplified: "example",
        SentenceTraditional: "notes",
        SentencePinyin: "notes",
      });
      expect(rolesOf(summary, "HSK 3.0")).toMatchObject({
        Hanzi: "term",
        SentenceHanzi: "example",
        SentencePinyin: "notes",
      });
      expect(rolesOf(summary, "Chinese (Advanced)")).toMatchObject({ Color: "skip", Ruby: "skip" });
      // A traditional deck keeps its traditional sentence; "Trad." elsewhere is a translation.
      expect(rolesOf(summary, "TOCFL")).toMatchObject({
        Traditional: "term",
        SentenceTraditional: "example",
        SentenceSimplified: "notes",
      });
      expect(rolesOf(summary, "Lessico")).toEqual({ Parola: "term", "Trad.": "meaning" });
    });

    it("reads pinyin without its tone colours, keeping separate readings apart", async () => {
      const { cards } = await hsk();
      expect(byTerm(cards, "银行").fields.pronunciation).toBe("yínháng");
      expect(byTerm(cards, "一点儿").fields.pronunciation).toBe("yìdiǎnr");
      expect(byTerm(cards, "行").fields).toEqual({
        term: "行",
        meaning: "to go; a row",
        pronunciation: "xíng / háng",
      });
      // Tone numbers stay for normalizeCardText, which counts the Readings it converts.
      expect(byTerm(cards, "东西").fields.pronunciation).toBe("dong1 xi5");
      expect(byTerm(cards, "你好").fields).toEqual({
        term: "你好",
        meaning: "hello",
        pronunciation: "nǐ hǎo",
      });
      expect(byTerm(cards, "il cane").fields).toEqual({ term: "il cane", meaning: "the dog" });
    });

    it("leaves out notes lines that repeat the term or the example", async () => {
      const { cards } = await hsk();
      expect(byTerm(cards, "很").fields).toEqual({
        term: "很",
        meaning: "very",
        pronunciation: "hěn",
        example: "我[Wǒ]很[hěn]好[hǎo]。",
        exampleTranslation: "I am very well.",
      });
      expect(byTerm(cards, "學習").fields).toMatchObject({
        example: "我學習中文。",
        notes: "我学习中文。",
      });
    });

    it("puts sentence pinyin inline when it fits, and keeps it a notes line when not", async () => {
      const { cards } = await hsk();
      expect(byTerm(cards, "银行").fields).toMatchObject({
        example: "我[Wǒ]去[qù]银行[yín háng]。",
        exampleTranslation: "I am going to the bank.",
        notes: "銀行\nnoun\n我去銀行。",
      });
      expect(byTerm(cards, "一点儿").fields.example).toBe(
        "我[Wǒ]会[huì]说[shuō]一点儿[yì diǎnr]中文[Zhōng wén]。",
      );
      expect(byTerm(cards, "东西").fields).toMatchObject({
        example: "这个[Zhè ge]东西[dōng xi]很[hěn]好[hǎo]。",
        exampleTranslation: "This thing is good.",
      });
      expect(byTerm(cards, "学习").fields).toMatchObject({
        example: "他每天学习3个小时。",
        exampleTranslation: "He studies for three hours a day.",
        notes: "學習\n他每天學習3個小時。\nTā měitiān xuéxí sān gè xiǎoshí.",
      });
    });

    it("keeps sentence pinyin a notes line in tone marks while examples draw none", async () => {
      const { cards } = await hsk(false);
      expect(byTerm(cards, "银行").fields).toMatchObject({
        example: "我去银行。",
        exampleTranslation: "I am going to the bank.",
        notes: "銀行\nnoun\n我去銀行。\nWǒ qù yínháng.",
      });
      expect(byTerm(cards, "很").fields).toMatchObject({
        example: "我很好。",
        exampleTranslation: "I am very well.",
        notes: "Wǒ hěn hǎo.",
      });
    });

    it("keeps each word's recording and leaves the sentence's out", async () => {
      const { cards } = await hsk();
      expect(
        cards.filter((c) => c.recording).map((c) => [c.fields.term, c.recording, c.soundsLeftOut]),
      ).toEqual([
        ["银行", "hsk_yinhang.mp3", 1],
        ["一点儿", "hsk_yidianr.mp3", 0],
        ["学习", "hsk_xuexi.mp3", 0],
        ["很", "hsk_hen.mp3", 0],
        ["东西", "hsk_dongxi.mp3", 1],
        ["你好", "hsk_nihao.mp3", 0],
      ]);
    });

    it("leaves a deck of no language as it always was", async () => {
      const { cards } = await hsk(true, null);
      expect(byTerm(cards, "银行").fields).toMatchObject({
        pronunciation: "yínháng",
        example: "我去银行。",
        exampleTranslation: "I am going to the bank.",
        notes: "銀行\nnoun\n我去銀行。\nWǒ qù yínháng.",
      });
    });
  });

  it("carries the log, the due date and the memory state Anki had", async () => {
    const { cards } = await read("legacy.apkg");
    const [gatto] = byTerm(cards, "il gatto").progress;
    expect(gatto?.reviews.map((r) => r.rating)).toEqual([3, 3, 3, 1, 3, 4]);
    expect(gatto?.due?.getTime()).toBe(CREATED + 25 * DAY);
    const [cane] = byTerm(cards, "il cane").progress;
    expect(cane?.reviews).toHaveLength(1);
    const [ciao] = byTerm(cards, "ciao").progress;
    expect(ciao).toMatchObject({
      reviews: [],
      unstarted: false,
      memory: { stability: 30, difficulty: 3.5 },
    });
    const [casa] = byTerm(cards, "la casa").progress;
    expect(casa).toMatchObject({ unstarted: true, due: undefined });
  });

  it("follows the learner's field choices", async () => {
    const { summary } = await anki.inspect(file("current.apkg"));
    const basic = summary.noteTypes.find((t) => t.name === "Basic");
    const { cards } = await read("current.apkg", {
      languages: {},
      roles: { [basic?.key as string]: ["meaning", "term"] },
    });
    const cat = byTerm(cards, "the cat");
    expect(cat.fields.meaning).toBe("il gatto");
    // Card 1 asks the Front field, which is now the meaning.
    expect(cat.modes).toEqual(["meaning_to_term"]);
  });

  it("reads pictures from both containers and leaves missing ones out", async () => {
    for (const name of ["legacy.apkg", "current.apkg"]) {
      const media = await anki.media(file(name));
      const png = await media("gatto.png", 1_000_000);
      expect([...(png ?? new Uint8Array()).subarray(1, 4)]).toEqual([0x50, 0x4e, 0x47]);
      expect(await media("missing.png", 1_000_000)).toBeNull();
      expect(await media("gatto.png", 10)).toBeNull();
    }
  });
});

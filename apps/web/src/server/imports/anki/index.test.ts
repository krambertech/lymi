import { readFileSync } from "node:fs";
import type { ImportedCard } from "@lymi/core";
import { describe, expect, it } from "vitest";
import type { ImportChoices } from "../adapter";
import { bytesSource } from "../files";
import { anki } from "./index";

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

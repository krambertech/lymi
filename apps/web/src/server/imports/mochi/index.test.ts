import { readFileSync } from "node:fs";
import type { ImportedCard } from "@lymi/core";
import { describe, expect, it } from "vitest";
import type { ImportChoices } from "../adapter";
import { anki } from "../anki";
import { bytesSource } from "../files";
import { mochi, ONE_SIDED, TWO_SIDED } from "./index";

const fixture = (name: string) =>
  new Uint8Array(readFileSync(new URL(`./fixtures/${name}`, import.meta.url)));
const file = () => bytesSource(fixture("export.mochi"));
const noChoices: ImportChoices = { languages: {}, roles: {} };
const DAY = 86_400_000;
const MINUTE = 60_000;
/** The fixture's first review; its dates count from here. */
const CREATED = Date.UTC(2026, 0, 1, 4);

async function read(choices = noChoices) {
  const { summary, notes } = await mochi.inspect(file());
  const cards = [...notes].flatMap((note) => mochi.cards(note, summary, choices));
  return { summary, cards };
}

const byTerm = (cards: ImportedCard[], term: string) => {
  const card = cards.find((c) => c.fields.term === term);
  if (!card) throw new Error(`no card ${term}`);
  return card;
};

describe("mochi adapter", () => {
  it("recognises a Mochi export and not an Anki package", async () => {
    expect(await mochi.detect(file(), "export.mochi")).toBe(true);
    const apkg = bytesSource(
      new Uint8Array(readFileSync(new URL("../anki/fixtures/current.apkg", import.meta.url))),
    );
    expect(await mochi.detect(apkg, "current.apkg")).toBe(false);
    expect(await anki.detect(file(), "export.mochi")).toBe(false);
  });

  it("summarises nested decks, kinds of card, history, pictures and sounds", async () => {
    const { summary } = await read();
    expect(summary).toMatchObject({ notes: 11, reviews: 12, pictures: 2, audio: 1 });
    // A trashed card and a trashed deck's card are left out; an empty parent deck is not listed.
    expect(summary.decks.map((d) => [d.name, d.cards])).toEqual([
      ["Italian::Lesson 1", 6],
      ["Italian::Lesson 1::Verbs", 1],
      ["Japanese", 4],
    ]);
    const types = Object.fromEntries(summary.noteTypes.map((t) => [t.key, t]));
    expect(types[TWO_SIDED]).toMatchObject({ roles: ["term", "meaning"], notes: 6 });
    expect(types[ONE_SIDED]).toMatchObject({ fields: ["Text"], roles: ["term"], notes: 1 });
    // Fields no card fills, and checkboxes, are left out of the preview.
    expect(types["template:VocabTpl1"]).toMatchObject({
      name: "Vocab",
      fields: ["Word", "Reading", "Meaning"],
      roles: ["term", "pronunciation", "meaning"],
      questions: [0],
      notes: 3,
    });
    expect(types["template:VocabTpl1"]?.samples[0]).toEqual(["猫", "ねこ", "cat"]);
    // The first side shows the translation, so the other field is the term.
    expect(types["template:ReverseTp"]).toMatchObject({
      fields: ["Translation", "Japanese"],
      roles: ["meaning", "term"],
    });
  });

  it("splits content at its first --- and turns Markdown into text", async () => {
    const { cards } = await read();
    expect(byTerm(cards, "il gatto")).toMatchObject({
      fields: { meaning: "the cat" },
      tags: ["animals", "lesson one"],
      picture: "gatto.png",
      archived: false,
      modes: ["term_to_meaning"],
    });
    expect(byTerm(cards, "ciao").fields.meaning).toBe("hello & goodbye");
    expect(byTerm(cards, "essere").fields.meaning).toBe("to be\n\nsono, sei, è");
    expect(byTerm(cards, "il cane")).toMatchObject({ fields: { meaning: "the dog" } });
    expect(byTerm(cards, "il cane").picture).toBeUndefined();
  });

  it("makes a card without --- a term only, and keeps an archived card archived", async () => {
    const { cards } = await read();
    const casa = byTerm(cards, "la casa");
    expect(casa).toMatchObject({ archived: true, noteTypeKey: ONE_SIDED });
    expect(casa.fields.meaning).toBeUndefined();
  });

  it("reads template fields, and a picture only when the export holds it", async () => {
    const { cards } = await read();
    expect(byTerm(cards, "猫")).toMatchObject({
      fields: { pronunciation: "ねこ", meaning: "cat" },
      picture: "neko.png",
      modes: ["term_to_meaning"],
    });
    expect(byTerm(cards, "犬")).toMatchObject({
      fields: { meaning: "dog" },
      tags: ["animals", "N5"],
    });
    expect(byTerm(cards, "犬").picture).toBeUndefined();
    expect(byTerm(cards, "思い出").fields).toMatchObject({
      pronunciation: "おもいで",
      meaning: "memory",
    });
    expect(byTerm(cards, "水")).toMatchObject({
      fields: { meaning: "water" },
      modes: ["meaning_to_term"],
    });
  });

  it("replays Remembered as Good and Forgot as Again, keeping the last due date", async () => {
    const { cards } = await read();
    const [gatto] = byTerm(cards, "il gatto").progress;
    expect(gatto?.reviews.map((r) => r.rating)).toEqual([3, 1, 3, 3]);
    // Mochi dates grades by day, so the second grade that day is kept a minute after the first.
    expect(gatto?.reviews.map((r) => r.at.getTime())).toEqual([
      CREATED,
      CREATED + MINUTE,
      CREATED + DAY,
      CREATED + 3 * DAY,
    ]);
    expect(gatto?.due?.getTime()).toBe(CREATED + 9 * DAY);
    expect(byTerm(cards, "la casa").progress).toEqual([
      { mode: "term_to_meaning", reviews: [], unstarted: true, due: undefined },
    ]);
  });

  it("asks a reversed card both ways, each with its own log", async () => {
    const { cards } = await read();
    const ciao = byTerm(cards, "ciao");
    expect(ciao.modes).toEqual(["term_to_meaning", "meaning_to_term"]);
    const [forward, reverse] = ciao.progress;
    expect(forward?.due?.getTime()).toBe(CREATED + 2 * DAY);
    expect(reverse?.reviews.map((r) => r.at.getTime())).toEqual([
      CREATED + DAY,
      CREATED + DAY + MINUTE,
    ]);
    expect(reverse?.due?.getTime()).toBe(CREATED + 4 * DAY);
    // Reverse reviews left from before reversing was turned off are not asked.
    expect(byTerm(cards, "presto").modes).toEqual(["term_to_meaning"]);
  });

  it("keeps each card's id, and gives a card without one a stable id", async () => {
    const first = await read();
    const second = await read();
    expect(byTerm(first.cards, "il gatto").externalId).toBe("mochi:GattoCard");
    const grazie = byTerm(first.cards, "grazie").externalId;
    expect(grazie).toMatch(/^mochi:Lesson001-/);
    expect(byTerm(second.cards, "grazie").externalId).toBe(grazie);
  });

  it("follows the learner's field choices", async () => {
    const { cards } = await read({ languages: {}, roles: { [TWO_SIDED]: ["meaning", "term"] } });
    const cat = byTerm(cards, "the cat");
    expect(cat.fields.meaning).toBe("il gatto");
    expect(cat.modes).toEqual(["meaning_to_term"]);
  });

  it("reads attachments at the root or in a folder, and leaves missing ones out", async () => {
    const media = await mochi.media(file());
    for (const name of ["gatto.png", "neko.png"]) {
      const png = await media(name, 1_000_000);
      expect([...(png ?? new Uint8Array()).subarray(1, 4)]).toEqual([0x50, 0x4e, 0x47]);
    }
    expect(await media("inu.png", 1_000_000)).toBeNull();
    expect(await media("gatto.png", 10)).toBeNull();
  });
});

import { readFileSync } from "node:fs";
import { arrivesKnown, type ImportedCard, sourceOfFileName } from "@lymi/core";
import { describe, expect, it } from "vitest";
import type { ImportChoices } from "../adapter";
import { anki } from "../anki";
import { bytesSource } from "../files";
import { mochi } from "../mochi";
import { CLOZE, FRONT_AND_BACK, noji } from "./index";

const fixture = (name: string) =>
  bytesSource(new Uint8Array(readFileSync(new URL(`./fixtures/${name}`, import.meta.url))));
const noChoices: ImportChoices = { languages: {}, roles: {} };
const DAY = 86_400_000;
const MINUTE = 60_000;
/** The fixture's first day; its dates count from here. */
const CREATED = Date.UTC(2026, 0, 1, 4);

async function read(name = "export.ofc", choices = noChoices) {
  const { summary, notes } = await noji.inspect(fixture(name));
  const cards = [...notes].flatMap((note) => noji.cards(note, summary, choices));
  return { summary, cards };
}

const byTerm = (cards: ImportedCard[], term: string) => {
  const card = cards.find((c) => c.fields.term === term);
  if (!card) throw new Error(`no card ${term}`);
  return card;
};

describe("noji adapter", () => {
  it("recognises a Noji export, and no other adapter claims it", async () => {
    expect(sourceOfFileName("Spanish.ofc")).toBe("noji");
    expect(await noji.detect(fixture("export.ofc"), "export.ofc")).toBe(true);
    expect(await noji.detect(fixture("legacy.ofc"), "legacy.ofc")).toBe(true);
    expect(await anki.detect(fixture("export.ofc"), "export.ofc")).toBe(false);
    expect(await mochi.detect(fixture("export.ofc"), "export.ofc")).toBe(false);
    const apkg = bytesSource(
      new Uint8Array(readFileSync(new URL("../anki/fixtures/current.apkg", import.meta.url))),
    );
    expect(await noji.detect(apkg, "current.apkg")).toBe(false);
  });

  it("summarises sub-decks, kinds of card and pictures, leaving out cards with no text", async () => {
    const { summary } = await read();
    expect(summary).toMatchObject({ notes: 7, reviews: 0, pictures: 2, unsupported: 1 });
    // A deck with no cards is not listed; a cloze counts a card per deletion.
    expect(summary.decks.map((d) => [d.name, d.cards])).toEqual([
      ["Spanish", 7],
      ["Spanish::Verbs", 1],
    ]);
    const types = Object.fromEntries(summary.noteTypes.map((t) => [t.key, t]));
    expect(types[FRONT_AND_BACK]).toMatchObject({ roles: ["term", "meaning"], notes: 6 });
    expect(types[CLOZE]).toMatchObject({ kind: "cloze", notes: 1 });
    expect(types[FRONT_AND_BACK]?.samples[1]).toEqual(["el perro", "the dog\na pet"]);
  });

  it("reads the same cards from the older uncompressed form", async () => {
    const current = await read("export.ofc");
    const legacy = await read("legacy.ofc");
    expect(legacy.summary).toEqual(current.summary);
    expect(legacy.cards).toEqual(current.cards);
  });

  it("turns HTML into text and takes a picture only when the export holds it", async () => {
    const { cards } = await read();
    expect(byTerm(cards, "el gato")).toMatchObject({
      externalId: "noji:9001",
      deckKey: "101",
      fields: { meaning: "the cat" },
      picture: "gato.png",
      modes: ["term_to_meaning"],
      tags: [],
      archived: false,
    });
    expect(byTerm(cards, "el perro").fields.meaning).toBe("the dog\na pet");
    expect(byTerm(cards, "el agua").picture).toBeUndefined();
    expect(byTerm(cards, "hablar")).toMatchObject({ deckKey: "102", picture: "hablar.png" });
  });

  it("keeps a graduated card's due date and starts a learning card new", async () => {
    const { cards } = await read();
    const now = new Date(CREATED + DAY);
    const [gato] = byTerm(cards, "el gato").progress;
    expect(gato).toMatchObject({ reviews: [], memory: { stability: 10, difficulty: 5 } });
    expect(gato?.due?.getTime()).toBe(CREATED + 30 * DAY);
    expect(gato?.memory?.lastReview.getTime()).toBe(CREATED + 20 * DAY);
    expect(byTerm(cards, "el perro").progress).toEqual([
      { mode: "term_to_meaning", reviews: [], unstarted: true },
    ]);
    expect(byTerm(cards, "la casa").progress[0]?.unstarted).toBe(true);
    expect(byTerm(cards, "hablar").progress[0]?.unstarted).toBe(true);
    expect(arrivesKnown(byTerm(cards, "el gato"), now)).toBe(true);
    expect(arrivesKnown(byTerm(cards, "el perro"), now)).toBe(false);
  });

  it("keeps a relearning card's interval, due again soon", async () => {
    const { cards } = await read();
    const [agua] = byTerm(cards, "el agua").progress;
    expect(agua?.memory?.stability).toBe(12);
    expect(agua?.due?.getTime()).toBe(CREATED + MINUTE);
  });

  it("brings a frozen card archived", async () => {
    const { cards } = await read();
    expect(byTerm(cards, "el libro").archived).toBe(true);
  });

  it("makes a card of each cloze deletion, the first carrying Noji's progress", async () => {
    const { cards } = await read();
    const gato = byTerm(cards, "gato");
    expect(gato).toMatchObject({
      externalId: "noji:9005:c1",
      fields: { meaning: "pets", example: "Tengo un gato y un perro." },
      modes: ["meaning_to_term"],
    });
    expect(gato.progress[0]?.due?.getTime()).toBe(CREATED + 15 * DAY);
    const perro = byTerm(cards, "perro");
    expect(perro).toMatchObject({ externalId: "noji:9005:c2", fields: { notes: "animal" } });
    expect(perro.progress[0]?.unstarted).toBe(true);
  });

  it("follows the learner's field choices", async () => {
    const { cards } = await read("export.ofc", {
      languages: {},
      roles: { [FRONT_AND_BACK]: ["meaning", "term"] },
    });
    expect(byTerm(cards, "the cat")).toMatchObject({
      fields: { meaning: "el gato" },
      modes: ["meaning_to_term"],
    });
  });

  it("reads pictures from a stored and from a compressed attachments.zip", async () => {
    for (const name of ["export.ofc", "legacy.ofc"]) {
      const picture = await noji.media(fixture(name));
      const bytes = await picture("gato.png", 1024 * 1024);
      expect(bytes?.subarray(1, 4)).toEqual(new TextEncoder().encode("PNG"));
      expect(await picture("missing.png", 1024 * 1024)).toBeNull();
      expect(await picture("gato.png", 10)).toBeNull();
    }
  });
});

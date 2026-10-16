import { readFileSync } from "node:fs";
import { encodeTextImport } from "@lymi/core";
import { describe, expect, it } from "vitest";
import { anki } from "../anki";
import { bytesSource, ImportFileError } from "../files";
import { lymi } from "../lymi";
import { quizlet } from "./index";

const encoder = new TextEncoder();
const fixture = (name: string) =>
  readFileSync(
    new URL(`../../../../../../packages/core/src/fixtures/quizlet/${name}`, import.meta.url),
    "utf8",
  );
const file = (text: string) => bytesSource(encoder.encode(text));
const choices = { languages: {}, roles: {} };

async function read(text: string) {
  const { summary, notes } = await quizlet.inspect(file(text));
  const all = [...notes];
  return { summary, notes: all, cards: all.flatMap((n) => quizlet.cards(n, summary, choices)) };
}

describe("quizlet adapter", () => {
  it("claims text files only, so archives reach their own adapters", async () => {
    expect(await quizlet.detect(file("a\tb"), "set.txt")).toBe(true);
    expect(await quizlet.detect(file("a\tb"), "set.TSV")).toBe(true);
    expect(await quizlet.detect(file("PK"), "deck.apkg")).toBe(false);
    expect(await quizlet.detect(file("PK"), "export.zip")).toBe(false);
    // A pasted text never looks like a zip to the adapters before it.
    expect(await anki.detect(file("a\tb"), "quizlet.txt")).toBe(false);
    expect(await lymi.detect(file("a\tb"), "quizlet.txt")).toBe(false);
  });

  it("reads the learner's separators and deck from the header", async () => {
    const text = encodeTextImport(
      { separators: { field: " || ", row: "##" }, deckName: "Geography" },
      fixture("03-custom-separators-multiline.txt"),
    );
    const { summary, cards } = await read(text);
    expect(summary.decks).toEqual([
      expect.objectContaining({ key: "set", name: "Geography", cards: 3 }),
    ]);
    expect(summary.noteTypes[0]).toMatchObject({
      fields: ["Term", "Definition"],
      roles: ["term", "meaning"],
      samples: [
        ["Q: capital of Estonia?", "Tallinn\n(since 1918)"],
        ["Q: largest lake?", "Peipus"],
        ["Q: tab\tinside term", 'definition with\ttab and "quotes"'],
      ],
    });
    expect(cards[0]).toMatchObject({
      fields: { term: "Q: capital of Estonia?", meaning: "Tallinn\n(since 1918)" },
      modes: ["term_to_meaning"],
      progress: [{ mode: "term_to_meaning", reviews: [], unstarted: true }],
      tags: [],
      archived: false,
    });
  });

  it("gives every row its own stable id, repeats included", async () => {
    const text = "a\tb\na\tb\na\tc";
    const first = await read(text);
    const second = await read(text);
    const ids = first.cards.map((c) => c.externalId);
    expect(new Set(ids).size).toBe(3);
    expect(second.cards.map((c) => c.externalId)).toEqual(ids);
  });

  it("names a bare file's deck plainly and reads all five fixtures", async () => {
    const counts: Record<string, number> = {};
    for (const name of [
      "01-default-tab-newline.txt",
      "02-comma-semicolon.txt",
      "04-cyrillic-rtl-bom.txt",
      "05-edge-cases.txt",
    ]) {
      const { summary, cards } = await read(fixture(name));
      expect(summary.decks[0]?.name).toBe("Quizlet import");
      counts[name] = cards.length;
    }
    expect(counts).toEqual({
      "01-default-tab-newline.txt": 5,
      "02-comma-semicolon.txt": 3,
      "04-cyrillic-rtl-bom.txt": 6,
      "05-edge-cases.txt": 203,
    });
  });

  it("refuses text that isn't UTF-8 and sets over the cap", async () => {
    await expect(quizlet.inspect(bytesSource(new Uint8Array([0xff, 0xfe, 0x00])))).rejects.toThrow(
      ImportFileError,
    );
    const many = Array.from({ length: 5001 }, (_, i) => `t${i}\tm${i}`).join("\n");
    await expect(quizlet.inspect(file(many))).rejects.toMatchObject({ failure: "too_large" });
  });
});

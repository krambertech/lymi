import { readFileSync } from "node:fs";
import type { LymiFileCard, LymiFileManifest } from "@lymi/core";
import { describe, expect, it } from "vitest";
import { centralDirectory, ZipSegment } from "../../exports/zip";
import { anki } from "../anki";
import { bytesSource, ImportFileError } from "../files";
import { lymi } from "./index";

const encoder = new TextEncoder();

const card = (overrides: Partial<LymiFileCard> = {}): LymiFileCard => ({
  id: "c1",
  deck: "d1",
  section: null,
  term: "il gatto",
  meaning: "the cat",
  pronunciation: null,
  example: null,
  notes: null,
  language: "it",
  tags: ["animals"],
  source: null,
  meaningSource: "ai",
  exampleSource: null,
  reviewModes: null,
  picture: { file: "media/c1.webp", description: "An orange animal", width: 4, height: 3 },
  archivedAt: null,
  createdAt: Date.UTC(2026, 0, 1),
  states: [
    {
      mode: "term_to_meaning",
      state: 2,
      due: Date.UTC(2026, 0, 20),
      lastReview: Date.UTC(2026, 0, 10),
      stability: 9.5,
      difficulty: 5,
      reviews: [
        {
          at: Date.UTC(2026, 0, 10),
          rating: 3,
          state: 0,
          elapsedDays: 0,
          scheduledDays: 10,
          stability: 9.5,
          difficulty: 5,
          source: "web",
        },
      ],
    },
  ],
  ...overrides,
});

async function zip(manifest: Partial<LymiFileManifest>, cards: LymiFileCard[], media = true) {
  const segment = new ZipSegment(0);
  const full: LymiFileManifest = {
    format: "lymi",
    version: 1,
    exportedAt: Date.UTC(2026, 0, 21),
    series: [],
    decks: [
      {
        id: "d1",
        name: "Italian",
        description: null,
        defaultLanguage: "it",
        reviewModes: ["term_to_meaning", "meaning_to_term"],
        sectionProgression: "automatic",
        series: null,
        sections: [],
        archivedAt: null,
        createdAt: Date.UTC(2026, 0, 1),
      },
    ],
    counts: { decks: 1, cards: cards.length, reviews: 1, pictures: 1, sounds: 0 },
    ...manifest,
  };
  await segment.add("lymi.json", encoder.encode(JSON.stringify(full)), true);
  await segment.add(
    "cards.jsonl",
    encoder.encode(cards.map((c) => `${JSON.stringify(c)}\n`).join("")),
    true,
  );
  if (media) await segment.add("media/c1.webp", new Uint8Array([1, 2, 3]), false);
  const directory = centralDirectory(segment.records, segment.length);
  return bytesSource(new Uint8Array(Buffer.concat([segment.bytes(), directory])));
}

describe("lymi adapter", () => {
  it("recognises a Lymi zip and not an Anki package", async () => {
    const file = await zip({}, [card()]);
    expect(await lymi.detect(file, "lymi.zip")).toBe(true);
    expect(await anki.detect(file, "lymi.zip")).toBe(false);
    const apkg = bytesSource(
      new Uint8Array(readFileSync(new URL("../anki/fixtures/current.apkg", import.meta.url))),
    );
    expect(await lymi.detect(apkg, "current.apkg")).toBe(false);
  });

  it("carries a pronunciation's source, and reads a file written before the key existed", async () => {
    const withSource = card({
      id: "c3",
      pronunciation: "il ˈɡatto",
      pronunciationSource: "ai",
    });
    // A zip from before the key: the field is simply absent, as an older Lymi wrote it.
    const { pronunciationSource: _omitted, ...older } = card({
      id: "c4",
      pronunciation: "il ˈɡatto",
    });
    const file = await zip({}, [withSource, older as LymiFileCard]);
    const { summary, notes } = await lymi.inspect(file);
    const cards = [...notes].flatMap((note) =>
      lymi.cards(note, summary, { languages: {}, roles: {} }),
    );
    expect(cards[0]?.fieldSources?.pronunciation).toBe("ai");
    // Absent means nobody said, which the writer records as the learner's own.
    expect(cards[1]?.fieldSources?.pronunciation).toBeNull();
  });

  it("refuses a file from a newer Lymi and a damaged card line", async () => {
    await expect(lymi.inspect(await zip({ version: 2 }, [card()]))).rejects.toMatchObject({
      failure: "unrecognized",
    });
    const broken = await zip({}, [{ ...card(), term: 42 } as unknown as LymiFileCard]);
    await expect(lymi.inspect(broken)).rejects.toBeInstanceOf(ImportFileError);
  });

  it("reads each card with its deck's modes, own language, sources and picture description", async () => {
    const file = await zip({}, [
      card(),
      card({ id: "c2", term: "hello", language: "en", picture: null, states: [] }),
    ]);
    const { summary, notes } = await lymi.inspect(file);
    expect(summary).toMatchObject({ notes: 2, reviews: 1, pictures: 1, languages: { d1: "it" } });
    expect(summary.decks).toEqual([
      {
        key: "d1",
        name: "Italian",
        description: null,
        cards: 2,
        archived: false,
        reviewModes: ["term_to_meaning", "meaning_to_term"],
      },
    ]);
    const cards = [...notes].flatMap((note) =>
      lymi.cards(note, summary, { languages: {}, roles: {} }),
    );
    expect(cards[0]).toMatchObject({
      externalId: "lymi:c1",
      modes: ["term_to_meaning", "meaning_to_term"],
      language: undefined,
      fieldSources: { meaning: "ai", example: null, pronunciation: null },
      picture: "media/c1.webp",
      pictureDescription: "An orange animal",
    });
    expect(cards[0]?.progress.map((p) => [p.mode, p.reviews.length, p.unstarted])).toEqual([
      ["term_to_meaning", 1, false],
      ["meaning_to_term", 0, true],
    ]);
    // A card in another language than its deck keeps its own.
    expect(cards[1]).toMatchObject({ language: "en", picture: undefined });
    const read = await lymi.media(file);
    expect(await read("media/c1.webp", 1000)).toEqual(new Uint8Array([1, 2, 3]));
    expect(await read("lymi.json", 1000)).toBeNull();
  });
});

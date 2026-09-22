import type { ActivityEntry } from "../../lib/api";
import { day, now } from "../mock";

const entry = (over: Partial<ActivityEntry> & Pick<ActivityEntry, "id" | "kind" | "at">) =>
  ({
    group: over.id,
    day: over.at.slice(0, 10),
    actor: "mcp",
    app: null,
    count: 1,
    deck: null,
    person: null,
    cards: [],
    import: null,
    export: null,
    ...over,
  }) satisfies ActivityEntry;

const italian = { id: "d1", name: "Italian with Giulia", archived: false };
const estonian = { id: "d3", name: "Estonian A2", archived: false };

/** A card as an Activity row lists it: where it is now, and whether that deck can be opened. */
const wrote = (id: string, term: string, meaning: string, deck = italian) => ({
  id,
  term,
  meaning,
  archived: false,
  deckId: deck.id,
  deckArchived: deck.archived,
});

/** The learner-local day the sample week is read on, so its newest rows say Today. */
export const activityToday = new Date(now).toISOString().slice(0, 10);

/** A week of Activity: an app, the AI, an import, a key and the people of a shared deck. */
export const activity: ActivityEntry[] = [
  entry({
    id: "a1",
    kind: "cards_added",
    at: new Date(now - 2 * 3_600_000).toISOString(),
    app: "Claude",
    count: 6,
    deck: italian,
    cards: [
      wrote("c1", "affrettarsi", "to hurry"),
      wrote("c2", "il pendolare", "commuter"),
      wrote("c3", "sbrigarsi", "to get a move on"),
    ],
  }),
  entry({
    id: "a2",
    kind: "cards_enriched",
    at: new Date(now - 4 * 3_600_000).toISOString(),
    actor: "ai",
    count: 12,
    deck: italian,
    cards: [wrote("c4", "la bolletta", "the bill"), wrote("c5", "il vicolo", "the alley")],
  }),
  entry({
    id: "a3",
    kind: "member_joined",
    at: new Date(now - 7 * 3_600_000).toISOString(),
    actor: "user",
    deck: estonian,
    person: "Maryna",
  }),
  entry({
    id: "a4",
    kind: "import",
    at: new Date(now - day).toISOString(),
    actor: "user",
    import: {
      id: "i1",
      source: "anki",
      fileName: "italian-deck.apkg",
      byteSize: 4_200_000,
      status: "done",
      failure: null,
      summary: null,
      choices: null,
      counts: {
        added: 214,
        existing: 0,
        duplicates: 0,
        duplicateExamples: [],
        skipped: 12,
        archived: 0,
        shortened: 0,
        reviews: 1_900,
        pictures: 8,
        picturesSkipped: 0,
        decks: 3,
      },
      progress: { written: 3, chunks: 3 },
      upload: { partBytes: 4_000_000, parts: 2, received: 2 },
      createdBy: "user",
      createdAt: new Date(now - day).toISOString(),
      updatedAt: new Date(now - day).toISOString(),
      finishedAt: new Date(now - day).toISOString(),
      archivedAt: null,
    },
  }),
  entry({
    id: "a5",
    kind: "cards_archived",
    at: new Date(now - day - 3_600_000).toISOString(),
    actor: "api",
    app: "Lesson notes script",
    count: 2,
    deck: italian,
    cards: [{ ...wrote("c6", "la spesa", "the shopping"), archived: true }],
  }),
  entry({
    id: "a5b",
    kind: "export",
    at: new Date(now - 2 * day).toISOString(),
    actor: "user",
    export: {
      id: "e1",
      format: "lymi",
      deckId: null,
      fileName: "lymi-library-2026-09-14.zip",
      status: "done",
      failure: null,
      byteSize: 2_400_000,
      counts: { cards: 431, decks: 4, reviews: 3_180, pictures: 12, sounds: 0 },
      downloadUrl: "/api/exports/e1/file",
      createdBy: "user",
      createdAt: new Date(now - 2 * day).toISOString(),
      finishedAt: new Date(now - 2 * day).toISOString(),
      expiresAt: new Date(now - day).toISOString(),
    },
  }),
  entry({
    id: "a6",
    kind: "link_on",
    at: new Date(now - 3 * day).toISOString(),
    actor: "user",
    deck: estonian,
  }),
  entry({
    id: "a7",
    kind: "deck_added",
    at: new Date(now - 5 * day).toISOString(),
    app: "Claude",
    deck: { id: "d4", name: "Phrases from the news", archived: false },
  }),
];

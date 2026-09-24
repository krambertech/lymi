import { readFileSync } from "node:fs";
import {
  IMPORT_PART_BYTES,
  type ImportChoicesInput,
  type ImportCounts,
  type ImportOut,
} from "@lymi/core";
import { and, eq, isNull, sql } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Db, schema } from "../db";
import { addCards, archiveCard } from "./cards";
import type { ServiceContext } from "./context";
import { createDeck } from "./decks";
import {
  archiveImport,
  attachImportPictures,
  cancelImport,
  completeImportUpload,
  confirmImport,
  expireImports,
  failImport,
  failureOf,
  finishImport,
  getImport,
  type ImportRunParams,
  inspectImport,
  listImports,
  NOTES_PER_CHUNK,
  nextWriteStep,
  prepareImportDecks,
  previewImportChoices,
  restoreImport,
  startImport,
  uploadImportPart,
  writeImportChunk,
} from "./imports";
import { reviewDraw, reviewHistory } from "./review";
import { streak } from "./review-days";
import { insights } from "./stats";
import { learner, type TestBindings, testDb } from "./test-db";

let db: Db;
let env: TestBindings;
let dispose: () => Promise<void>;

beforeAll(async () => {
  ({ db, env, dispose } = await testDb());
}, 60_000);
afterAll(async () => dispose());

const fixture = (name: string) =>
  new Uint8Array(
    readFileSync(
      new URL(
        `../imports/${name.endsWith(".mochi") ? "mochi" : "anki"}/fixtures/${name}`,
        import.meta.url,
      ),
    ),
  );
const DAY = 86_400_000;
const CREATED = Date.UTC(2026, 0, 1, 4);
let learners = 0;
const fresh = () => {
  learners++;
  return learner(db, `import-learner-${learners}`, `Learner ${learners}`);
};

/** Sends bytes the way the app does: in parts, then complete. Returns the runs it started. */
async function upload(ctx: ServiceContext, name: string, bytes: Uint8Array) {
  const runs: ImportRunParams[] = [];
  const started = await startImport(ctx, { fileName: name, byteSize: bytes.length }, env.IMPORTS);
  for (let part = 1; (part - 1) * IMPORT_PART_BYTES < bytes.length; part++) {
    const slice = bytes.slice((part - 1) * IMPORT_PART_BYTES, part * IMPORT_PART_BYTES);
    await uploadImportPart(ctx, started.id, part, slice.buffer, slice.length, env.IMPORTS);
  }
  await completeImportUpload(ctx, started.id, env.IMPORTS, async (params) => {
    runs.push(params);
  });
  return { id: started.id, runs };
}

/** Everything the Workflow would do, step by step, without the Workflow. */
async function runImport(
  ctx: ServiceContext,
  name: string,
  choices: ImportChoicesInput = { languages: {}, roles: {} },
) {
  const { id, runs } = await upload(ctx, name, fixture(name));
  expect(runs).toEqual([{ importId: id, userId: ctx.userId, actor: ctx.actor, phase: "inspect" }]);
  await inspectImport(ctx, id, env.IMPORTS);
  const preview = await previewImportChoices(ctx, id, choices, env.IMPORTS);
  await confirmImport(ctx, id, choices, env.IMPORTS, async () => {});
  const decks = await prepareImportDecks(ctx, id, env.IMPORTS);
  // A retried step writes no second deck.
  expect(await prepareImportDecks(ctx, id, env.IMPORTS)).toEqual(decks);
  const pictures = { stored: 0, skipped: 0 };
  const { progress } = await getImport(ctx, id);
  for (let chunk = 0; chunk < progress.chunks; chunk++) {
    const { pictures: pending } = await writeImportChunk(ctx, id, chunk, decks, env.IMPORTS);
    const done = await attachImportPictures(ctx, id, pending, env.IMPORTS, {
      bucket: env.PRIVATE_IMAGES,
      images: env.IMAGES,
    });
    pictures.stored += done.stored;
    pictures.skipped += done.skipped;
  }
  await finishImport(ctx, id, pictures, env.IMPORTS);
  return { id, preview, result: await getImport(ctx, id) };
}

async function cardsOf(ctx: ServiceContext) {
  return db.select().from(schema.cards).where(eq(schema.cards.userId, ctx.userId));
}

async function card(ctx: ServiceContext, term: string) {
  const [row] = await db
    .select()
    .from(schema.cards)
    .where(and(eq(schema.cards.userId, ctx.userId), eq(schema.cards.term, term)));
  if (!row) throw new Error(`no card ${term}`);
  return row;
}

async function statesOf(cardId: string) {
  return db.select().from(schema.cardStates).where(eq(schema.cardStates.cardId, cardId));
}

async function reviewsOf(cardId: string) {
  return db
    .select()
    .from(schema.reviews)
    .where(eq(schema.reviews.cardId, cardId))
    .orderBy(schema.reviews.reviewedAt);
}

async function objectsUnder(prefix: string) {
  return (await env.IMPORTS.list({ prefix })).objects.length;
}

describe("importing a Mochi export", () => {
  it("writes nested decks, cards, reviews and pictures through the same writer", async () => {
    const ctx = await fresh();
    const { id, preview, result } = await runImport(ctx, "export.mochi");
    expect(preview).toMatchObject({
      added: 12,
      skipped: 1,
      archived: 1,
      reviews: 12,
      pictures: 3,
      audio: 1,
    });
    expect(preview.addedByNoteType["content:one"]).toBe(1);
    expect(preview.decks.map((d) => [d.name, d.cards])).toEqual([
      ["Italian / Lesson 1", 6],
      ["Italian / Lesson 1 / Verbs", 1],
      ["Japanese", 5],
    ]);
    expect(result).toMatchObject({ source: "mochi", status: "done", failure: null });
    expect(result.counts).toMatchObject({ added: 12, reviews: 12, pictures: 3, decks: 3 });

    const gatto = await card(ctx, "il gatto");
    expect(gatto).toMatchObject({ meaning: "the cat", language: "it", importId: id });
    expect(gatto.tags).toEqual(["animals", "lesson one"]);
    expect((await reviewsOf(gatto.id)).map((r) => [r.rating, r.source, r.reviewDayId])).toEqual([
      [3, "import", null],
      [1, "import", null],
      [3, "import", null],
      [3, "import", null],
    ]);
    const [state] = await statesOf(gatto.id);
    expect(state?.due.getTime()).toBe(CREATED + 9 * DAY);
    expect((await card(ctx, "la casa")).meaning).toBeNull();
    expect((await card(ctx, "ciao")).directions).toBe("both");

    const view = await insights(ctx, { period: 0, zone: "UTC" });
    // Grades on 1, 2, 3, 4 and 5 January light those five days, and none of them can count
    // toward a goal: an imported recall was never measured against one.
    const imported = view.activity.days.filter((d) => d.date.startsWith("2026-01"));
    expect(imported).toHaveLength(5);
    expect(imported.every((d) => d.attempts > 0 && !d.satisfied && d.goal === null)).toBe(true);
  });

  it("adds nothing twice, leaves today alone, and archives exactly what it added", async () => {
    const ctx = await fresh();
    const before = await streak(ctx);
    const first = await runImport(ctx, "export.mochi");
    const after = await streak(ctx);
    expect(after.today).toEqual(before.today);
    expect(after.current).toBe(before.current);
    expect((await reviewDraw(ctx, {})).attempts).toBe(0);

    const second = await runImport(ctx, "export.mochi");
    expect(second.preview).toMatchObject({ added: 0, existing: 12, duplicates: 0 });
    // Nothing new has a single side, so the preview does not say one does.
    expect(second.preview.addedByNoteType).toEqual({});
    expect(await cardsOf(ctx)).toHaveLength(12);

    await archiveImport(ctx, first.id);
    expect((await cardsOf(ctx)).filter((c) => c.archivedAt === null)).toHaveLength(0);
  });
});

describe("importing an Anki package", () => {
  it("writes decks, cards, states, reviews and pictures, and deletes the file", async () => {
    const ctx = await fresh();
    const { id, preview, result } = await runImport(ctx, "current.apkg");

    expect(preview).toMatchObject({
      added: 10,
      duplicates: 0,
      existing: 0,
      skipped: 0,
      archived: 1,
      reviews: 11,
      pictures: 2,
      audio: 1,
    });
    expect(preview.decks.map((d) => [d.name, d.cards])).toEqual([
      ["Italian / Grammar", 2],
      ["Italian / Lesson 1", 6],
      ["Japanese", 2],
    ]);
    expect(result).toMatchObject({ status: "done", failure: null });
    expect(result.counts).toMatchObject({
      added: 10,
      reviews: 11,
      pictures: 2,
      picturesSkipped: 0,
      archived: 1,
      decks: 3,
    });

    const decks = await db.select().from(schema.decks).where(eq(schema.decks.userId, ctx.userId));
    expect(decks.map((d) => [d.name, d.defaultLanguage, d.importId]).sort()).toEqual([
      ["Italian / Grammar", "it", id],
      ["Italian / Lesson 1", "it", id],
      ["Japanese", "ja", id],
    ]);

    const gatto = await card(ctx, "il gatto");
    expect(gatto).toMatchObject({
      meaning: "the cat",
      meaningSource: "manual",
      language: "it",
      importId: id,
      createdBy: "user",
    });
    expect(gatto.tags).toEqual(["animals", "lesson::one"]);
    const [image] = await db
      .select()
      .from(schema.cardImages)
      .where(eq(schema.cardImages.cardId, gatto.id));
    expect(image).toMatchObject({ status: "active", description: null, createdBy: "user" });

    expect((await card(ctx, "la casa")).archivedAt).not.toBeNull();

    const row = await db
      .select({ objectKey: schema.imports.objectKey })
      .from(schema.imports)
      .where(eq(schema.imports.id, id));
    expect(await objectsUnder(row[0]?.objectKey as string)).toBe(0);
  });

  it("gives the same result for the legacy and the current container", async () => {
    const legacy = await fresh();
    const current = await fresh();
    await runImport(legacy, "legacy.apkg");
    await runImport(current, "current.apkg");
    const shape = async (ctx: ServiceContext) => {
      const rows = await cardsOf(ctx);
      return Promise.all(
        rows
          .sort((a, b) => a.term.localeCompare(b.term))
          .map(async (c) => ({
            term: c.term,
            meaning: c.meaning,
            pronunciation: c.pronunciation,
            example: c.example,
            notes: c.notes,
            tags: c.tags,
            directions: c.directions,
            archived: c.archivedAt !== null,
            states: (await statesOf(c.id))
              // A new mode is due when it lands, which differs between the two runs.
              .map((s) => ({
                mode: s.mode,
                due: s.state === 0 ? null : s.due.getTime(),
                state: s.state,
              }))
              .sort((a, b) => String(a.mode).localeCompare(String(b.mode))),
            reviews: (await reviewsOf(c.id)).map((r) => [r.mode, r.rating, r.reviewedAt.getTime()]),
          })),
      );
    };
    expect(await shape(legacy)).toEqual(await shape(current));
  });

  it("keeps each card's due date and puts its reviews on their original days", async () => {
    const ctx = await fresh();
    await runImport(ctx, "legacy.apkg");
    const gatto = await card(ctx, "il gatto");
    const [state] = await statesOf(gatto.id);
    expect(state?.due.getTime()).toBe(CREATED + 25 * DAY);
    const reviews = await reviewsOf(gatto.id);
    expect(reviews.map((r) => r.rating)).toEqual([3, 3, 3, 1, 3, 4]);
    expect(
      reviews.every(
        (r) => r.source === "import" && r.reviewDayId === null && r.stateBefore === null,
      ),
    ).toBe(true);
    expect(state?.lastReview?.getTime()).toBe(reviews.at(-1)?.reviewedAt.getTime());

    const view = await insights(ctx, { period: 0, zone: "UTC" });
    // Grades on 11, 12, 13, 14, 15 and 17 January light those six days.
    expect(view.activity.days.filter((d) => d.date.startsWith("2026-01"))).toHaveLength(6);
    expect(view.recall.passed + view.recall.failed).toBeGreaterThan(0);

    const ciao = await card(ctx, "ciao");
    const [memory] = await statesOf(ciao.id);
    expect(memory?.due.getTime()).toBe(CREATED + 60 * DAY);
    expect(JSON.parse(memory?.fsrs ?? "{}")).toMatchObject({
      stability: 30,
      difficulty: 3.5,
      state: 2,
    });
  });

  it("makes a reversed note one card asked both ways, each log on its own mode", async () => {
    const ctx = await fresh();
    await runImport(ctx, "current.apkg");
    const grazie = await card(ctx, "grazie");
    const states = await statesOf(grazie.id);
    expect(states.map((s) => s.mode).sort()).toEqual(["meaning_to_term", "term_to_meaning"]);
    const reviews = await reviewsOf(grazie.id);
    expect(reviews.filter((r) => r.mode === "term_to_meaning").map((r) => r.rating)).toEqual([
      3, 3,
    ]);
    expect(reviews.filter((r) => r.mode === "meaning_to_term").map((r) => r.rating)).toEqual([
      2, 3,
    ]);
    const due = Object.fromEntries(states.map((s) => [s.mode, s.due.getTime()]));
    expect(due).toEqual({
      term_to_meaning: CREATED + 15 * DAY,
      meaning_to_term: CREATED + 16 * DAY,
    });
  });

  it("adds no duplicate on a second import and reports what was already there", async () => {
    const ctx = await fresh();
    const first = await runImport(ctx, "current.apkg");
    const gatto = await card(ctx, "il gatto");
    // The learner's own edit survives, and a field they cleared is filled back in.
    await db
      .update(schema.cards)
      .set({ meaning: "a cat, my edit" })
      .where(eq(schema.cards.id, gatto.id));
    const ciao = await card(ctx, "ciao");
    await db.update(schema.cards).set({ meaning: null }).where(eq(schema.cards.id, ciao.id));
    const before = (await cardsOf(ctx)).length;
    const reviewsBefore = await db
      .select({ n: sql<number>`count(*)` })
      .from(schema.reviews)
      .where(eq(schema.reviews.userId, ctx.userId));

    const second = await runImport(ctx, "legacy.apkg");
    expect(second.preview).toMatchObject({ added: 0, existing: 10, duplicates: 0 });
    expect(second.result.counts).toMatchObject({ added: 0, existing: 10, decks: 0 });
    expect((await cardsOf(ctx)).length).toBe(before);
    expect((await card(ctx, "a cat, my edit".length ? "il gatto" : "")).meaning).toBe(
      "a cat, my edit",
    );
    expect((await card(ctx, "ciao")).meaning).toBe("hello & goodbye");
    const reviewsAfter = await db
      .select({ n: sql<number>`count(*)` })
      .from(schema.reviews)
      .where(eq(schema.reviews.userId, ctx.userId));
    expect(reviewsAfter).toEqual(reviewsBefore);
    expect(first.id).not.toBe(second.id);
  });

  it("skips a term the learner already has in that language and names its deck", async () => {
    const ctx = await fresh();
    const deck = await createDeck(ctx, { name: "Mine", defaultLanguage: "it" });
    await addCards(ctx, [{ deckId: deck.id, term: "Il gatto", meaning: "my cat" }]);
    const { preview, result } = await runImport(ctx, "current.apkg");
    expect(preview.duplicates).toBe(1);
    expect(preview.duplicateExamples).toEqual([{ term: "il gatto", deckName: "Mine" }]);
    expect(result.counts).toMatchObject({ added: 9, duplicates: 1, pictures: 1 });
    expect((await cardsOf(ctx)).filter((c) => c.normalizedTerm === "il gatto")).toHaveLength(1);
  });

  it("follows the learner's language and field choices", async () => {
    const ctx = await fresh();
    const { id } = await upload(ctx, "current.apkg", fixture("current.apkg"));
    await inspectImport(ctx, id, env.IMPORTS);
    const { summary } = await getImport(ctx, id);
    const lesson = summary?.decks.find((d) => d.name === "Italian::Lesson 1")?.key as string;
    const basic = summary?.noteTypes.find((t) => t.name === "Basic")?.key as string;

    await expect(
      previewImportChoices(
        ctx,
        id,
        { languages: {}, roles: { [basic]: ["meaning", "meaning"] } },
        env.IMPORTS,
      ),
    ).rejects.toMatchObject({ code: "invalid" });
    const preview = await previewImportChoices(
      ctx,
      id,
      { languages: { [lesson]: "es" }, roles: { [basic]: ["meaning", "term"] } },
      env.IMPORTS,
    );
    expect(preview.added).toBe(10);
  });

  it("keeps imported reviews out of today's goal, the streak and today's draw", async () => {
    const ctx = await fresh();
    const before = await streak(ctx);
    await runImport(ctx, "current.apkg");
    // Pretend the learner reviewed in Anki this morning.
    await db
      .update(schema.reviews)
      .set({ reviewedAt: new Date() })
      .where(eq(schema.reviews.userId, ctx.userId));
    const after = await streak(ctx);
    expect(after.today).toEqual(before.today);
    expect(after.current).toBe(before.current);
    expect(after.days).toEqual(before.days);
    const draw = await reviewDraw(ctx, {});
    expect(draw.attempts).toBe(0);
    expect(draw.log).toEqual([]);
    // The seven lights sit beside the streak, so they leave imported recalls out too.
    expect((await reviewHistory(ctx, { days: 7 })).days).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it("archives exactly the cards it added, and restore brings back exactly those", async () => {
    const ctx = await fresh();
    const mine = await createDeck(ctx, { name: "Mine", defaultLanguage: "it" });
    const [own] = await addCards(ctx, [{ deckId: mine.id, term: "il topo" }]);
    const { id } = await runImport(ctx, "current.apkg");
    const lessonDeck = (await card(ctx, "il gatto")).deckId;
    // The learner adds a card of their own to an imported deck, and archives one imported card.
    const [addedToImported] = await addCards(ctx, [{ deckId: lessonDeck, term: "il cavallo" }]);
    const cane = await card(ctx, "il cane");
    await archiveCard(ctx, cane.id);

    await archiveImport(ctx, id);
    const active = (await cardsOf(ctx))
      .filter((c) => c.archivedAt === null)
      .map((c) => c.term)
      .sort();
    expect(active).toEqual(["il cavallo", "il topo"]);
    const decks = await db.select().from(schema.decks).where(eq(schema.decks.userId, ctx.userId));
    const byName = Object.fromEntries(decks.map((d) => [d.name, d.archivedAt !== null]));
    expect(byName).toEqual({
      Mine: false,
      "Italian / Lesson 1": false,
      "Italian / Grammar": true,
      Japanese: true,
    });
    expect((await getImport(ctx, id)).archivedAt).not.toBeNull();

    await restoreImport(ctx, id);
    const restored = await cardsOf(ctx);
    expect(restored.find((c) => c.term === "il cane")?.archivedAt).not.toBeNull();
    expect(restored.find((c) => c.term === "la casa")?.archivedAt).not.toBeNull();
    expect(restored.filter((c) => c.archivedAt === null)).toHaveLength(10);
    expect(
      await db
        .select()
        .from(schema.decks)
        .where(and(eq(schema.decks.userId, ctx.userId), isNull(schema.decks.archivedAt))),
    ).toHaveLength(4);
    void own;
    void addedToImported;
  });

  it("audits every write as the learner and lists the import", async () => {
    const ctx = await fresh();
    const { id } = await runImport(ctx, "current.apkg");
    const created = await db
      .select()
      .from(schema.auditLog)
      .where(
        and(
          eq(schema.auditLog.userId, ctx.userId),
          eq(schema.auditLog.entity, "card"),
          eq(schema.auditLog.action, "create"),
        ),
      );
    expect(created).toHaveLength(10);
    expect(created.every((row) => row.actor === "user")).toBe(true);
    const imports = await listImports(ctx);
    expect(imports.map((i: ImportOut | Awaited<ReturnType<typeof getImport>>) => i.id)).toEqual([
      id,
    ]);
    const [entry] = imports;
    expect(JSON.stringify(entry)).not.toContain("imports/");
  });

  it("writes a chunk once even when its step runs again", async () => {
    const ctx = await fresh();
    const { id } = await upload(ctx, "current.apkg", fixture("current.apkg"));
    await inspectImport(ctx, id, env.IMPORTS);
    await confirmImport(ctx, id, { languages: {}, roles: {} }, env.IMPORTS, async () => {});
    const decks = await prepareImportDecks(ctx, id, env.IMPORTS);
    const first = await writeImportChunk(ctx, id, 0, decks, env.IMPORTS);
    const again = await writeImportChunk(ctx, id, 0, decks, env.IMPORTS);
    expect(first.pictures).toHaveLength(2);
    expect(again.pictures).toEqual([]);
    expect((await cardsOf(ctx)).length).toBe(10);
    expect(((await getImport(ctx, id)).counts as ImportCounts).added).toBe(10);
    expect(NOTES_PER_CHUNK).toBeGreaterThan(9);
  });
});

describe("counting what was written", () => {
  it("counts a card with no deck to go into as not added, and every picture as stored or skipped", async () => {
    const ctx = await fresh();
    const { id } = await upload(ctx, "current.apkg", fixture("current.apkg"));
    await inspectImport(ctx, id, env.IMPORTS);
    await confirmImport(ctx, id, { languages: {}, roles: {} }, env.IMPORTS, async () => {});
    const decks = await prepareImportDecks(ctx, id, env.IMPORTS);
    const { summary } = await getImport(ctx, id);
    const japanese = summary?.decks.find((d) => d.name === "Japanese")?.key as string;
    // As if the Japanese deck had gone between making the decks and writing the cards.
    const { [japanese]: _gone, ...rest } = decks;
    const { pictures } = await writeImportChunk(ctx, id, 0, rest, env.IMPORTS);
    expect((await cardsOf(ctx)).length).toBe(8);
    expect(((await getImport(ctx, id)).counts as ImportCounts).added).toBe(8);

    const totals = await attachImportPictures(
      ctx,
      id,
      [...pictures, { cardId: "not-a-card-of-this-import", name: "gatto.png" }],
      env.IMPORTS,
      { bucket: env.PRIVATE_IMAGES, images: env.IMAGES },
    );
    expect(totals.stored + totals.skipped).toBe(pictures.length + 1);
    expect(totals.skipped).toBeGreaterThanOrEqual(1);
  });
});

describe("nextWriteStep", () => {
  it("writes chunks, stores their pictures, then finishes", () => {
    expect(nextWriteStep({ chunk: 0, chunks: 2, pending: 0, steps: 2 })).toBe("cards");
    expect(nextWriteStep({ chunk: 1, chunks: 2, pending: 120, steps: 3 })).toBe("pictures");
    expect(nextWriteStep({ chunk: 2, chunks: 2, pending: 20, steps: 9 })).toBe("pictures");
    expect(nextWriteStep({ chunk: 2, chunks: 2, pending: 0, steps: 10 })).toBe("finish");
  });
  it("hands over to a new run before the step budget runs out", () => {
    expect(nextWriteStep({ chunk: 5, chunks: 90, pending: 0, steps: 897 }, 900)).toBe("cards");
    expect(nextWriteStep({ chunk: 5, chunks: 90, pending: 0, steps: 898 }, 900)).toBe("hand over");
    expect(nextWriteStep({ chunk: 5, chunks: 90, pending: 40, steps: 898 }, 900)).toBe("hand over");
    expect(nextWriteStep({ chunk: 90, chunks: 90, pending: 0, steps: 899 }, 900)).toBe("finish");
  });
});

describe("the upload", () => {
  it("joins parts into the exact file", async () => {
    const ctx = await fresh();
    const bytes = new Uint8Array(IMPORT_PART_BYTES * 2 + 1234).map((_, i) => i % 251);
    const { id, runs } = await upload(ctx, "big.apkg", bytes);
    expect(runs).toHaveLength(1);
    expect((await getImport(ctx, id)).status).toBe("inspecting");
    const [row] = await db.select().from(schema.imports).where(eq(schema.imports.id, id));
    const stored = new Uint8Array(
      await ((await env.IMPORTS.get(row?.objectKey as string)) as R2ObjectBody).arrayBuffer(),
    );
    expect(stored.length).toBe(bytes.length);
    expect(stored[IMPORT_PART_BYTES * 2 + 1000]).toBe(bytes[IMPORT_PART_BYTES * 2 + 1000]);
  });

  it("treats a second complete as the same upload", async () => {
    const ctx = await fresh();
    const bytes = fixture("current.apkg");
    const { id } = await upload(ctx, "current.apkg", bytes);
    await db.update(schema.imports).set({ status: "uploading" }).where(eq(schema.imports.id, id));
    const [row] = await db.select().from(schema.imports).where(eq(schema.imports.id, id));
    await db
      .update(schema.imports)
      .set({ uploadId: "gone", parts: [{ partNumber: 1, etag: "x" }] })
      .where(eq(schema.imports.id, id));
    expect(row?.objectKey).toBeTruthy();
    const again = await completeImportUpload(ctx, id, env.IMPORTS, async () => {});
    expect(again.status).toBe("inspecting");
  });

  it("refuses a part of the wrong size and a file with parts missing", async () => {
    const ctx = await fresh();
    const started = await startImport(
      ctx,
      { fileName: "two.apkg", byteSize: IMPORT_PART_BYTES + 10 },
      env.IMPORTS,
    );
    await expect(
      uploadImportPart(ctx, started.id, 1, new ArrayBuffer(5), 5, env.IMPORTS),
    ).rejects.toMatchObject({ code: "invalid" });
    await expect(
      uploadImportPart(ctx, started.id, 3, new ArrayBuffer(10), 10, env.IMPORTS),
    ).rejects.toMatchObject({ code: "invalid" });
    await uploadImportPart(ctx, started.id, 2, new ArrayBuffer(10), 10, env.IMPORTS);
    await expect(
      completeImportUpload(ctx, started.id, env.IMPORTS, async () => {}),
    ).rejects.toMatchObject({
      code: "invalid",
      details: { missing: [1] },
    });
  });

  it("keeps imports private to their learner", async () => {
    const owner = await fresh();
    const other = await fresh();
    const started = await startImport(owner, { fileName: "x.apkg", byteSize: 10 }, env.IMPORTS);
    await expect(getImport(other, started.id)).rejects.toMatchObject({ code: "not_found" });
    await expect(cancelImport(other, started.id, env.IMPORTS)).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("fails a file that is not an Anki package and deletes it", async () => {
    const ctx = await fresh();
    const bytes = new TextEncoder().encode("this is a text file renamed to apkg");
    const { id } = await upload(ctx, "notes.apkg", bytes);
    const [row] = await db.select().from(schema.imports).where(eq(schema.imports.id, id));
    const failure = await inspectImport(ctx, id, env.IMPORTS).then(
      () => null,
      (err) => failureOf(err),
    );
    expect(failure).toBe("unrecognized");
    await failImport(db, id, "unrecognized", env.IMPORTS);
    expect(await getImport(ctx, id)).toMatchObject({ status: "failed", failure: "unrecognized" });
    expect(await env.IMPORTS.head(row?.objectKey as string)).toBeNull();
  });

  it("cancels before writing, and expires imports left waiting", async () => {
    const ctx = await fresh();
    const { id } = await upload(ctx, "current.apkg", fixture("current.apkg"));
    await inspectImport(ctx, id, env.IMPORTS);
    const [row] = await db.select().from(schema.imports).where(eq(schema.imports.id, id));
    expect(await objectsUnder(row?.objectKey as string)).toBeGreaterThan(1);
    expect(await cancelImport(ctx, id, env.IMPORTS)).toMatchObject({ status: "cancelled" });
    expect(await objectsUnder(row?.objectKey as string)).toBe(0);

    const waiting = await startImport(ctx, { fileName: "later.apkg", byteSize: 100 }, env.IMPORTS);
    await db
      .update(schema.imports)
      .set({ updatedAt: new Date(Date.now() - 4 * DAY) })
      .where(eq(schema.imports.id, waiting.id));
    const points: AnalyticsEngineDataPoint[] = [];
    const analytics = {
      writeDataPoint: (point?: AnalyticsEngineDataPoint) => points.push(point ?? {}),
    };
    expect(await expireImports(db, env.IMPORTS, new Date(), analytics)).toBeGreaterThanOrEqual(1);
    expect(await getImport(ctx, waiting.id)).toMatchObject({
      status: "failed",
      failure: "expired",
    });
    expect(points).toContainEqual(
      expect.objectContaining({
        indexes: ["import_finished"],
        blobs: [expect.stringMatching(/:failed$/)],
      }),
    );
  });
});

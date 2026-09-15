import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join as joinPath } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { deflateSync, crc32 as nodeCrc32 } from "node:zlib";
import {
  type ExportStartInput,
  IMPORT_PART_BYTES,
  type ImportChoicesInput,
  LymiFileManifest,
  type ReviewMode,
} from "@lymi/core";
import { and, eq } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Db, schema } from "../db";
import { anki } from "../imports/anki";
import { bytesSource, openZip, readZipEntry } from "../imports/files";
import { uploadCardImage } from "./card-images";
import { addCards, archiveCard } from "./cards";
import type { ServiceContext } from "./context";
import { archiveDeck, createDeck } from "./decks";
import {
  EXPORT_STALL_MS,
  type ExportRunParams,
  expireExports,
  exportFile,
  failExport,
  finishExport,
  getExport,
  listExports,
  type MediaStep,
  startExport,
  writeExportData,
  writeExportMedia,
} from "./exports";
import {
  attachImportPictures,
  completeImportUpload,
  confirmImport,
  finishImport,
  getImport,
  inspectImport,
  prepareImportDecks,
  previewImportChoices,
  startImport,
  uploadImportPart,
  writeImportChunk,
} from "./imports";
import { join } from "./members";
import { gradeCard } from "./review";
import { learner, type TestBindings, testDb } from "./test-db";

let db: Db;
let env: TestBindings;
let dispose: () => Promise<void>;
const dir = mkdtempSync(joinPath(tmpdir(), "lymi-exports-"));

beforeAll(async () => {
  ({ db, env, dispose } = await testDb());
}, 60_000);
afterAll(async () => {
  rmSync(dir, { recursive: true, force: true });
  await dispose();
});

// Each test builds a library, exports it and often imports it again, which a busy CI runner takes well past the default.
const DAY = 86_400_000;
let learners = 0;
const fresh = (name = "Learner") => {
  learners++;
  return learner(db, `export-learner-${learners}`, `${name} ${learners}`);
};

/** A solid-colour PNG, as in the picture tests. */
function png(width: number, height: number) {
  const row = [0, ...Array.from({ length: width }, () => [200, 120, 40, 255]).flat()];
  const raw = Buffer.from(Array.from({ length: height }, () => row).flat());
  const chunk = (kind: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(kind, "ascii"), data]);
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(nodeCrc32(body), 8 + data.length);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  return new Uint8Array(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", header),
      chunk("IDAT", deflateSync(raw)),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}

const storage = () => ({ bucket: env.EXPORTS, pictures: env.PRIVATE_IMAGES, audio: env.AUDIO });

/** Everything the Workflow would do, step by step, then the downloaded bytes. */
async function runExport(ctx: ServiceContext, input: ExportStartInput) {
  const runs: ExportRunParams[] = [];
  const started = await startExport(ctx, input, async (params) => {
    runs.push(params);
  });
  expect(runs).toEqual([{ exportId: started.id, userId: ctx.userId, actor: ctx.actor }]);
  expect(started).toMatchObject({ status: "exporting", downloadUrl: null });
  const data = await writeExportData(ctx, started.id, storage());
  let step: MediaStep = { segment: 1, offset: data.offset, after: null, number: 0 };
  let missing = 0;
  for (let done = data.media === 0; !done; ) {
    const written = await writeExportMedia(ctx, started.id, step, storage());
    step = {
      segment: written.segment,
      offset: written.offset,
      after: written.after,
      number: written.number,
    };
    missing += written.missing;
    done = written.done;
  }
  await finishExport(
    ctx,
    started.id,
    { segment: step.segment, offset: step.offset, missing },
    env.EXPORTS,
  );
  const file = await exportFile(ctx, started.id, env.EXPORTS);
  const chunks: Uint8Array[] = [];
  for await (const stream of file.streams()) {
    chunks.push(new Uint8Array(await new Response(stream).arrayBuffer()));
  }
  const bytes = new Uint8Array(Buffer.concat(chunks));
  expect(bytes.length).toBe(file.byteSize);
  return { id: started.id, bytes, file, view: await getExport(ctx, started.id) };
}

/** An import of bytes the way the app sends them, run to the end. */
async function runImport(ctx: ServiceContext, name: string, bytes: Uint8Array) {
  const choices: ImportChoicesInput = { languages: {}, roles: {} };
  const started = await startImport(ctx, { fileName: name, byteSize: bytes.length }, env.IMPORTS);
  for (let part = 1; (part - 1) * IMPORT_PART_BYTES < bytes.length; part++) {
    const slice = bytes.slice((part - 1) * IMPORT_PART_BYTES, part * IMPORT_PART_BYTES);
    await uploadImportPart(ctx, started.id, part, slice.buffer, slice.length, env.IMPORTS);
  }
  await completeImportUpload(ctx, started.id, env.IMPORTS, async () => {});
  await inspectImport(ctx, started.id, env.IMPORTS);
  const preview = await previewImportChoices(ctx, started.id, choices, env.IMPORTS);
  await confirmImport(ctx, started.id, choices, env.IMPORTS, async () => {});
  const decks = await prepareImportDecks(ctx, started.id, env.IMPORTS);
  const pictures = { stored: 0, skipped: 0 };
  const { progress } = await getImport(ctx, started.id);
  for (let chunk = 0; chunk < progress.chunks; chunk++) {
    const { pictures: pending } = await writeImportChunk(
      ctx,
      started.id,
      chunk,
      decks,
      env.IMPORTS,
    );
    const done = await attachImportPictures(ctx, started.id, pending, env.IMPORTS, {
      bucket: env.PRIVATE_IMAGES,
      images: env.IMAGES,
    });
    pictures.stored += done.stored;
    pictures.skipped += done.skipped;
  }
  await finishImport(ctx, started.id, pictures, env.IMPORTS);
  return { preview, result: await getImport(ctx, started.id) };
}

const both: ReviewMode[] = [
  { cue: "term", target: "meaning" },
  { cue: "meaning", target: "term" },
];

/** A small library with every card shape: both text modes, a picture mode, pictures, history. */
async function library(ctx: ServiceContext) {
  const italian = await createDeck(ctx, {
    name: "Italian",
    defaultLanguage: "it",
    reviewModes: both,
  });
  const signs = await createDeck(ctx, { name: "Signs", description: "Road signs" });
  const outcomes = await addCards(ctx, [
    {
      deckId: italian.id,
      term: "il gatto",
      meaning: "the cat",
      pronunciation: "il ˈɡat.to",
      example: "Il gatto dorme.",
      exampleSource: "ai",
      notes: "Masculine.\nPlural: i gatti",
      tags: ["animals", "lesson one"],
      source: "Lesson 14",
    },
    { deckId: italian.id, term: "la casa", meaning: "the house" },
    { deckId: italian.id, term: "hello", meaning: "ciao", language: "en" },
    {
      deckId: signs.id,
      term: "stop",
      meaning: "come to a halt",
      reviewModes: [
        { cue: "term", target: "meaning" },
        { cue: "image", target: "meaning" },
      ],
    },
  ]);
  const cards = outcomes.map((outcome) => {
    if (outcome.status !== "added") throw new Error("card not added");
    return outcome.card;
  });
  const [gatto, casa, , stop] = cards as [
    (typeof cards)[0],
    (typeof cards)[0],
    (typeof cards)[0],
    (typeof cards)[0],
  ];
  const pictures = { bucket: env.PRIVATE_IMAGES, images: env.IMAGES };
  await uploadCardImage(
    ctx,
    gatto.id,
    png(40, 30),
    { version: null, description: "An orange animal asleep" },
    pictures,
  );
  await uploadCardImage(
    ctx,
    stop.id,
    png(30, 30),
    { version: null, description: "A red octagon" },
    pictures,
  );
  const now = Date.now();
  for (const [days, rating] of [
    [20, 3],
    [14, 1],
    [13, 3],
    [6, 4],
  ] as const) {
    await gradeCard(ctx, {
      cardId: gatto.id,
      mode: both[0],
      rating,
      reviewedAt: new Date(now - days * DAY),
    });
  }
  await gradeCard(ctx, {
    cardId: gatto.id,
    mode: both[1],
    rating: 3,
    reviewedAt: new Date(now - 3 * DAY),
  });
  await gradeCard(ctx, {
    cardId: stop.id,
    mode: { cue: "image", target: "meaning" },
    rating: 3,
    reviewedAt: new Date(now - 2 * DAY),
  });
  await archiveCard(ctx, casa.id);
  const old = await createDeck(ctx, { name: "Old list", defaultLanguage: "it" });
  await addCards(ctx, [{ deckId: old.id, term: "vecchio", meaning: "old" }]);
  await archiveDeck(ctx, old.id);
  return { italian, signs, gatto, casa, stop };
}

async function entries(bytes: Uint8Array) {
  const file = bytesSource(bytes);
  const zip = await openZip(file);
  return {
    names: [...zip.keys()].sort(),
    read: async (name: string) => {
      const entry = zip.get(name);
      if (!entry) throw new Error(`no entry ${name}`);
      return readZipEntry(file, entry, 256 * 1024 * 1024);
    },
  };
}

async function snapshot(ctx: ServiceContext) {
  const decks = await db.select().from(schema.decks).where(eq(schema.decks.userId, ctx.userId));
  const cards = await db.select().from(schema.cards).where(eq(schema.cards.userId, ctx.userId));
  return Promise.all(
    cards
      .sort((a, b) => a.term.localeCompare(b.term))
      .map(async (card) => {
        const states = await db
          .select()
          .from(schema.cardStates)
          .where(
            and(eq(schema.cardStates.cardId, card.id), eq(schema.cardStates.userId, ctx.userId)),
          );
        const reviews = await db
          .select()
          .from(schema.reviews)
          .where(and(eq(schema.reviews.cardId, card.id), eq(schema.reviews.userId, ctx.userId)))
          .orderBy(schema.reviews.reviewedAt);
        const [image] = await db
          .select()
          .from(schema.cardImages)
          .where(
            and(eq(schema.cardImages.cardId, card.id), eq(schema.cardImages.status, "active")),
          );
        return {
          deck: decks.find((deck) => deck.id === card.deckId)?.name,
          term: card.term,
          meaning: card.meaning,
          pronunciation: card.pronunciation,
          example: card.example,
          notes: card.notes,
          language: card.language,
          tags: card.tags,
          source: card.source,
          meaningSource: card.meaningSource,
          exampleSource: card.exampleSource,
          reviewModes: card.directions ? card.reviewModeKeys : null,
          archived: card.archivedAt !== null,
          picture: image
            ? { description: image.description, width: image.width, height: image.height }
            : null,
          states: states
            .filter((state) => state.state !== 0)
            .map((state) => ({ mode: state.mode, state: state.state, due: state.due.getTime() }))
            .sort((a, b) => String(a.mode).localeCompare(String(b.mode))),
          reviews: reviews.map((review) => [
            review.mode,
            review.rating,
            review.reviewedAt.getTime(),
          ]),
        };
      }),
  );
}

describe("exporting the library as a Lymi zip", () => {
  it("imports into an empty account with every deck, card, tag, picture, mode, due date and review", async () => {
    const owner = await fresh("Owner");
    await library(owner);
    const { bytes, view } = await runExport(owner, { format: "lymi" });
    expect(view).toMatchObject({
      status: "done",
      format: "lymi",
      deckId: null,
      downloadUrl: `/api/exports/${view.id}/file`,
      counts: { decks: 3, cards: 5, reviews: 6, pictures: 2, sounds: 0 },
    });
    expect(view.fileName).toMatch(/^lymi-library-\d{4}-\d{2}-\d{2}\.zip$/);

    const zip = await entries(bytes);
    expect(zip.names.filter((name) => !name.startsWith("media/"))).toEqual([
      "cards.jsonl",
      "lymi.json",
    ]);
    expect(zip.names.filter((name) => name.startsWith("media/"))).toHaveLength(2);
    const manifest = LymiFileManifest.parse(
      JSON.parse(new TextDecoder().decode(await zip.read("lymi.json"))),
    );
    expect(manifest.decks.map((deck) => deck.name).sort()).toEqual([
      "Italian",
      "Old list",
      "Signs",
    ]);

    const copy = await fresh("Copy");
    const { preview, result } = await runImport(copy, "lymi-library.zip", bytes);
    expect(result).toMatchObject({ source: "lymi", status: "done" });
    expect(preview).toMatchObject({
      added: 5,
      archived: 1,
      reviews: 6,
      pictures: 2,
      duplicates: 0,
    });
    expect(result.counts).toMatchObject({ added: 5, pictures: 2, picturesSkipped: 0, decks: 3 });

    const before = await snapshot(owner);
    const after = await snapshot(copy);
    expect(after).toEqual(before);
    expect(after.find((card) => card.term === "stop")?.reviewModes).toEqual([
      "term_to_meaning",
      "image_to_meaning",
    ]);

    const decks = await db.select().from(schema.decks).where(eq(schema.decks.userId, copy.userId));
    expect(
      decks
        .map((deck) => [
          deck.name,
          deck.description,
          deck.defaultLanguage,
          deck.directions,
          deck.archivedAt !== null,
        ])
        .sort(),
    ).toEqual([
      ["Italian", null, "it", "both", false],
      ["Old list", null, "it", "recognition", true],
      ["Signs", "Road signs", null, "recognition", false],
    ]);
  }, 60_000);

  it("writes one deck, and a second request while it is written returns the same export", async () => {
    const owner = await fresh("Owner");
    const { italian } = await library(owner);
    const first = await startExport(owner, { format: "lymi", deckId: italian.id }, async () => {});
    const again = await startExport(owner, { format: "lymi", deckId: italian.id }, async () => {
      throw new Error("no second run");
    });
    expect(again.id).toBe(first.id);
    await failExport(db, first.id, "internal", env.EXPORTS);

    const { view, bytes } = await runExport(owner, { format: "lymi", deckId: italian.id });
    expect(view).toMatchObject({
      fileName: "italian.zip",
      deckId: italian.id,
      counts: { decks: 1, cards: 3, pictures: 1 },
    });
    const lines = new TextDecoder()
      .decode(await (await entries(bytes)).read("cards.jsonl"))
      .trim()
      .split("\n");
    expect(lines.map((line) => JSON.parse(line).term).sort()).toEqual([
      "hello",
      "il gatto",
      "la casa",
    ]);
  }, 60_000);
});

describe("exporting an Anki package", () => {
  it("writes a sound legacy collection that the Anki importer reads back with its schedule", async () => {
    const owner = await fresh("Owner");
    const { gatto } = await library(owner);
    const { bytes, view } = await runExport(owner, { format: "anki" });
    expect(view).toMatchObject({
      fileName: expect.stringMatching(/\.apkg$/),
      counts: { cards: 5, reviews: 5, pictures: 2 },
    });

    const zip = await entries(bytes);
    expect(zip.names).toEqual(["0", "1", "collection.anki2", "collection.anki21", "media", "meta"]);
    const media = JSON.parse(new TextDecoder().decode(await zip.read("media")));
    expect(Object.values(media).sort()).toEqual(expect.arrayContaining([`lymi-${gatto.id}.webp`]));

    const path = joinPath(dir, `${view.id}.anki21`);
    writeFileSync(path, await zip.read("collection.anki21"));
    const sqlite = new DatabaseSync(path, { readOnly: true });
    expect(sqlite.prepare("pragma integrity_check").all()).toEqual([{ integrity_check: "ok" }]);
    const note = sqlite
      .prepare(
        "select n.flds, n.tags, n.guid, count(c.id) as cards from notes n join cards c on c.nid = n.id where n.guid = ? group by n.id",
      )
      .get(`lymi:${gatto.id}`);
    expect(note?.cards).toBe(2);
    expect(String(note?.tags)).toBe(" animals lesson_one ");
    expect(String(note?.flds).split("\u001f").slice(0, 5)).toEqual([
      "il gatto",
      "the cat",
      "il ˈɡat.to",
      "Il gatto dorme.",
      "Masculine.<br>Plural: i gatti",
    ]);
    expect(sqlite.prepare("select count(*) as n from revlog").get()?.n).toBe(5);
    // The archived card is asked both ways and the archived deck's card once: three suspended.
    expect(sqlite.prepare("select count(*) as n from cards where queue = -1").get()?.n).toBe(3);
    sqlite.close();

    // Lymi's own Anki reader takes it back: both modes, the log on each, due dates within a day.
    const { summary, notes } = await anki.inspect(bytesSource(bytes));
    const cards = [...notes].flatMap((n) => anki.cards(n, summary, { languages: {}, roles: {} }));
    expect(cards.map((card) => card.fields.term).sort()).toEqual([
      "hello",
      "il gatto",
      "la casa",
      "stop",
      "vecchio",
    ]);
    const imported = cards.find((card) => card.fields.term === "il gatto");
    expect(imported?.modes.sort()).toEqual(["meaning_to_term", "term_to_meaning"]);
    expect(imported?.tags).toEqual(["animals", "lesson_one"]);
    const states = await db
      .select()
      .from(schema.cardStates)
      .where(
        and(eq(schema.cardStates.cardId, gatto.id), eq(schema.cardStates.userId, owner.userId)),
      );
    for (const progress of imported?.progress ?? []) {
      const state = states.find((s) => s.mode === progress.mode);
      expect(progress.reviews.length).toBe(progress.mode === "term_to_meaning" ? 4 : 1);
      expect(Math.abs((progress.due?.getTime() ?? 0) - (state?.due.getTime() ?? 0))).toBeLessThan(
        DAY,
      );
    }
  }, 60_000);
});

describe("a shared deck's export", () => {
  it("holds the deck's cards and only the member's own history", async () => {
    const owner = await fresh("Owner");
    const { italian, gatto } = await library(owner);
    const member = await fresh("Member");
    await join(member, italian.id);
    await gradeCard(member, {
      cardId: gatto.id,
      mode: both[0],
      rating: 2,
      reviewedAt: new Date(Date.now() - DAY),
    });

    const { bytes, view } = await runExport(member, { format: "lymi", deckId: italian.id });
    expect(view.counts).toMatchObject({ cards: 3, reviews: 1 });
    const lines = new TextDecoder()
      .decode(await (await entries(bytes)).read("cards.jsonl"))
      .trim()
      .split("\n");
    const card = lines.map((line) => JSON.parse(line)).find((c) => c.term === "il gatto");
    expect(
      card.states.flatMap((s: { reviews: { rating: number }[] }) => s.reviews.map((r) => r.rating)),
    ).toEqual([2]);

    const anki = await runExport(member, { format: "anki", deckId: italian.id });
    expect(anki.view.counts).toMatchObject({ reviews: 1 });
  }, 60_000);
});

describe("who can reach an export", () => {
  it("is the learner who asked, until the window ends, and the files are then deleted", async () => {
    const owner = await fresh("Owner");
    const { italian } = await library(owner);
    const stranger = await fresh("Stranger");
    await expect(
      startExport(stranger, { format: "anki", deckId: italian.id }, async () => {}),
    ).rejects.toThrow(/not found/i);

    const { id, view } = await runExport(owner, { format: "anki", deckId: italian.id });
    await expect(exportFile(stranger, id, env.EXPORTS)).rejects.toThrow(/not found/i);
    await expect(getExport(stranger, id)).rejects.toThrow(/not found/i);
    expect((await listExports(stranger)).map((item) => item.id)).not.toContain(id);

    const expiresAt = new Date(view.expiresAt as Date);
    await expect(exportFile(owner, id, env.EXPORTS, expiresAt)).rejects.toThrow(/not found/i);
    const [row] = await db.select().from(schema.exportFiles).where(eq(schema.exportFiles.id, id));
    const prefix = row?.objectKey as string;
    expect((await env.EXPORTS.list({ prefix })).objects.length).toBeGreaterThan(0);
    expect((await env.EXPORTS.list({ prefix: `${prefix}.records/` })).objects).toHaveLength(0);

    await expireExports(db, env.EXPORTS, new Date(expiresAt.getTime() + 1));
    expect((await env.EXPORTS.list({ prefix })).objects).toHaveLength(0);
    expect(await getExport(owner, id)).toMatchObject({ status: "expired", downloadUrl: null });
  }, 60_000);

  it("gives up on an export that stalled and deletes what it wrote", async () => {
    const owner = await fresh("Owner");
    await library(owner);
    const started = await startExport(owner, { format: "lymi" }, async () => {});
    await writeExportData(owner, started.id, storage());
    const [row] = await db
      .select()
      .from(schema.exportFiles)
      .where(eq(schema.exportFiles.id, started.id));
    await expireExports(db, env.EXPORTS, new Date(Date.now() + EXPORT_STALL_MS + 60_000));
    expect((await env.EXPORTS.list({ prefix: row?.objectKey as string })).objects).toHaveLength(0);
    expect(await getExport(owner, started.id)).toMatchObject({
      status: "failed",
      failure: "internal",
    });
  }, 60_000);

  it("audits the request and the finished file for Activity", async () => {
    const owner = await fresh("Owner");
    await library(owner);
    const { id } = await runExport(owner, { format: "anki" });
    const audit = await db
      .select()
      .from(schema.auditLog)
      .where(and(eq(schema.auditLog.entity, "export"), eq(schema.auditLog.entityId, id)));
    expect(audit.map((row) => [row.action, row.actor]).sort()).toEqual([
      ["complete", "user"],
      ["create", "user"],
    ]);
    expect(JSON.stringify(audit.map((row) => row.payload))).not.toMatch(/exports\//);
  }, 60_000);
});

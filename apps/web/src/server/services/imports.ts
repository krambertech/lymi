import {
  type Actor,
  arrivesKnown,
  emptyImportCounts,
  guessLanguage,
  IMPORT_PART_BYTES,
  type ImportChoicesInput,
  type ImportCounts,
  type ImportFailure,
  type ImportStartInput,
  newId,
  sourceOfFileName,
} from "@lymi/core";
import { and, desc, eq, inArray, isNull, lt, or, sql } from "@lymi/core/db";
import type { Import } from "@lymi/core/schema";
import type { TextProvider } from "../ai";
import { type Db, schema } from "../db";
import type { ImportChoices, SourceAdapter } from "../imports/adapter";
import { anki } from "../imports/anki";
import { ImportFileError, type RandomAccess, r2Source } from "../imports/files";
import { lymi } from "../imports/lymi";
import { mochi } from "../imports/mochi";
import { noji } from "../imports/noji";
import { quizlet } from "../imports/quizlet";
import { type AnalyticsWriter, track } from "./analytics";
import { auditStatement, auditStatementWhen } from "./audit";
import type { CardImageStorage } from "./card-images";
import { notFound, type ServiceContext, ServiceError } from "./context";
import { detectDeckLanguages, TERMS_PER_DECK } from "./import-languages";
import {
  type AttachedMedia,
  attachPictures,
  type MediaTotals,
  noteChunkKey,
  ownedImport,
  type PendingPicture,
  prepareDecks,
  previewImport,
  type StoredSummary,
  writeChunk,
} from "./import-writer";

export { archiveImport, ownedImport, restoreImport } from "./import-writer";

/** Every source Lymi can import, tried in order. */
// Quizlet claims text by its extension alone, so it stays last.
const ADAPTERS = [anki, mochi, noji, lymi, quizlet] as SourceAdapter<unknown>[];

/** Notes per stored chunk: one chunk is one Workflow step and one D1 batch. */
export const NOTES_PER_CHUNK = 500;

/** An import still waiting on the learner past this is given up and its file deleted. */
export const IMPORT_EXPIRY_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * A write with no step landing for this long has stalled. Every step moves `updated_at`, and the
 * longest a step can take is four ten-minute attempts with their backoff.
 */
export const IMPORT_STALL_MS = 60 * 60 * 1000;

/** Starts a Workflow run: `inspect` reads the file, `write` writes it after confirmation. */
export type StartRun = (params: ImportRunParams) => Promise<void>;
export type ImportRunParams = {
  importId: string;
  userId: string;
  actor: Actor;
  phase: "inspect" | "write";
  /** A write run that carries on from an earlier one: the next chunk, its pictures and totals. */
  resume?: ImportResume | undefined;
};

export type ImportResume = {
  chunk: number;
  pending: PendingPicture[];
  pictures: MediaTotals;
  /** Pictures and recordings handled so far; absent in a run handed over before it was kept. */
  handled?: number | undefined;
};

/** Pictures stored per Workflow step. */
export const PICTURES_PER_STEP = 50;

/**
 * Steps one write run takes before it hands over to a new run. Lymi is on Cloudflare's paid
 * plan, which caps an instance at 10,000 steps; a collection with many pictures can pass that,
 * so a run stops short and the next run starts where it stopped.
 */
export const STEPS_PER_RUN = 9000;

/** What a write run does next, from where it is and how many steps it has taken. */
export function nextWriteStep(
  state: { chunk: number; chunks: number; pending: number; steps: number },
  budget = STEPS_PER_RUN,
): "pictures" | "cards" | "finish" | "hand over" {
  if (state.pending === 0 && state.chunk >= state.chunks) return "finish";
  // Room is kept for the hand-over itself and for a failure step.
  if (state.steps + 2 >= budget) return "hand over";
  return state.pending > 0 ? "pictures" : "cards";
}

function adapterFor(source: string): SourceAdapter<unknown> {
  const adapter = ADAPTERS.find((a) => a.source === source);
  if (!adapter) throw new ServiceError("invalid", "This import's source is not supported");
  return adapter;
}

function partCount(byteSize: number) {
  return Math.max(1, Math.ceil(byteSize / IMPORT_PART_BYTES));
}

/** An import as the API and app see it: no object keys, no upload ids. */
export function presentImport(row: Import) {
  return {
    id: row.id,
    source: row.source,
    fileName: row.fileName,
    byteSize: row.byteSize,
    status: row.status,
    failure: row.failure,
    summary: (row.summary as StoredSummary | null) ?? null,
    choices: (row.choices as ImportChoices | null) ?? null,
    // Counts added since an import finished read as none.
    counts: row.counts ? { ...emptyImportCounts(), ...(row.counts as ImportCounts) } : null,
    progress: {
      written: row.written,
      chunks: row.chunks,
      media: { done: row.mediaDone, total: row.mediaTotal },
    },
    upload: {
      partBytes: IMPORT_PART_BYTES,
      parts: partCount(row.byteSize),
      received: new Set((row.parts ?? []).map((p) => p.partNumber)).size,
    },
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    finishedAt: row.finishedAt,
    archivedAt: row.archivedAt,
  };
}
export type ImportView = ReturnType<typeof presentImport>;

export async function listImports(ctx: ServiceContext) {
  const rows = await ctx.db
    .select()
    .from(schema.imports)
    .where(eq(schema.imports.userId, ctx.userId))
    .orderBy(desc(schema.imports.createdAt))
    .limit(100);
  return rows.map(presentImport);
}

export async function getImport(ctx: ServiceContext, id: string) {
  return presentImport(await ownedImport(ctx, id));
}

/** Opens an upload. The file arrives in parts of `IMPORT_PART_BYTES`, each its own request. */
export async function startImport(ctx: ServiceContext, input: ImportStartInput, uploads: R2Bucket) {
  const { db, userId, actor } = ctx;
  const id = newId();
  // A random key names neither the learner nor the file.
  const objectKey = `imports/${crypto.randomUUID()}`;
  const upload = await uploads.createMultipartUpload(objectKey);
  await db.batch([
    db.insert(schema.imports).values({
      id,
      userId,
      source: sourceOfFileName(input.fileName),
      fileName: input.fileName,
      byteSize: input.byteSize,
      objectKey,
      uploadId: upload.uploadId,
      parts: [],
      createdBy: actor,
    }),
    auditStatement(ctx, { entity: "import", action: "create", id }),
  ]);
  return getImport(ctx, id);
}

/** Stores one part. Parts may repeat; the last copy of a part number wins. */
export async function uploadImportPart(
  ctx: ServiceContext,
  id: string,
  partNumber: number,
  body: ReadableStream | ArrayBuffer,
  length: number,
  uploads: R2Bucket,
) {
  const row = await ownedImport(ctx, id);
  if (row.status !== "uploading" || !row.objectKey || !row.uploadId) {
    throw new ServiceError("conflict", "This import is not waiting for its file.");
  }
  const parts = partCount(row.byteSize);
  if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > parts) {
    throw new ServiceError("invalid", `Send parts numbered 1 to ${parts}.`);
  }
  const expected =
    partNumber < parts ? IMPORT_PART_BYTES : row.byteSize - IMPORT_PART_BYTES * (parts - 1);
  if (length !== expected) {
    throw new ServiceError("invalid", `Part ${partNumber} must be exactly ${expected} bytes.`);
  }
  const upload = uploads.resumeMultipartUpload(row.objectKey, row.uploadId);
  const part = await upload.uploadPart(partNumber, body).catch(() => {
    throw new ServiceError("unavailable", "That part didn’t arrive. Send it again.");
  });
  await ctx.db.run(sql`update imports
    set parts = json_insert(coalesce(parts, '[]'), '$[#]', json(${JSON.stringify({ partNumber: part.partNumber, etag: part.etag })})),
      updated_at = ${Date.now()}
    where id = ${id} and status = 'uploading'`);
  return getImport(ctx, id);
}

/** Joins the parts into the file and starts reading it. */
export async function completeImportUpload(
  ctx: ServiceContext,
  id: string,
  uploads: R2Bucket,
  start: StartRun,
) {
  const row = await ownedImport(ctx, id);
  if (row.status !== "uploading") return getImport(ctx, id);
  if (!row.objectKey || !row.uploadId)
    throw new ServiceError("conflict", "This import has no upload.");
  const byNumber = new Map((row.parts ?? []).map((p) => [p.partNumber, p]));
  const parts = [...byNumber.values()].sort((a, b) => a.partNumber - b.partNumber);
  if (parts.length !== partCount(row.byteSize)) {
    throw new ServiceError("invalid", "Some parts of the file haven’t arrived yet.", {
      missing: Array.from({ length: partCount(row.byteSize) }, (_, i) => i + 1).filter(
        (n) => !byNumber.has(n),
      ),
    });
  }
  const joined = await uploads
    .resumeMultipartUpload(row.objectKey, row.uploadId)
    .complete(parts)
    .then(
      () => true,
      () => false,
    );
  // A second request can find the parts already joined by the first, which is not a failure.
  const head = await uploads.head(row.objectKey);
  if (!joined && !head) {
    await failImport(ctx.db, id, "upload_incomplete", uploads, ctx.analytics);
    return getImport(ctx, id);
  }
  if (head?.size !== row.byteSize) {
    await failImport(ctx.db, id, "upload_incomplete", uploads, ctx.analytics);
    return getImport(ctx, id);
  }
  await ctx.db
    .update(schema.imports)
    .set({ status: "inspecting", uploadId: null, parts: null, updatedAt: new Date() })
    .where(and(eq(schema.imports.id, id), eq(schema.imports.status, "uploading")));
  await start({ importId: id, userId: ctx.userId, actor: ctx.actor, phase: "inspect" });
  return getImport(ctx, id);
}

/** The language most of the learner's active cards are in, for decks whose name says none. */
async function usualLanguage(ctx: ServiceContext): Promise<string | null> {
  const [row] = await ctx.db
    .select({ language: schema.cards.language, n: sql<number>`count(*)` })
    .from(schema.cards)
    .where(and(eq(schema.cards.userId, ctx.userId), isNull(schema.cards.archivedAt)))
    .groupBy(schema.cards.language)
    .orderBy(sql`count(*) desc`)
    .limit(1);
  return row?.language ?? null;
}

/**
 * The inspection step: finds the adapter, reads the file into a summary and stored note
 * chunks, and leaves the import ready for the learner's preview. Along the way it counts each
 * deck's Known cards and samples its terms, so a deck's language is read from its cards when
 * the file and the deck's name don't say.
 */
export async function inspectImport(
  ctx: ServiceContext,
  id: string,
  uploads: R2Bucket,
  provider: TextProvider | null = null,
) {
  const row = await ownedImport(ctx, id);
  if (row.status !== "inspecting" || !row.objectKey) return;
  const file = await r2Source(uploads, row.objectKey);
  const adapter = await detect(file, row.fileName);
  if (!adapter) throw new ImportFileError("unrecognized", "No importer recognises the file");
  const { summary, notes } = await adapter.inspect(file);
  const guessed: ImportChoices = {
    languages: {},
    roles: Object.fromEntries(summary.noteTypes.map((type) => [type.key, type.roles])),
  };
  const now = new Date();
  const known = new Map<string, number>();
  const terms = new Map<string, Set<string>>();
  const typeDecks = new Map<string, Set<string>>();

  let chunk = 0;
  let batch: unknown[] = [];
  const flush = async () => {
    await uploads.put(noteChunkKey(row.objectKey as string, chunk), JSON.stringify(batch), {
      httpMetadata: { contentType: "application/json" },
    });
    chunk++;
    batch = [];
  };
  for (const note of notes) {
    batch.push(note);
    for (const card of adapter.cards(note, summary, guessed)) {
      if (arrivesKnown(card, now)) known.set(card.deckKey, (known.get(card.deckKey) ?? 0) + 1);
      const sample = terms.get(card.deckKey) ?? new Set<string>();
      if (sample.size < TERMS_PER_DECK) terms.set(card.deckKey, sample.add(card.fields.term));
      typeDecks.set(
        card.noteTypeKey,
        (typeDecks.get(card.noteTypeKey) ?? new Set<string>()).add(card.deckKey),
      );
    }
    if (batch.length === NOTES_PER_CHUNK) await flush();
  }
  if (batch.length > 0) await flush();

  // The file's own record wins, then the deck's name, then its cards, then the learner's usual language.
  const named = new Map(
    summary.decks.map((d) => [
      d.key,
      summary.languages?.[d.key] !== undefined
        ? (summary.languages[d.key] ?? null)
        : guessLanguage(d.name),
    ]),
  );
  const detected = await detectDeckLanguages(
    summary.decks
      .filter((d) => named.get(d.key) === null && summary.languages?.[d.key] === undefined)
      .map((d) => ({ key: d.key, name: d.name, terms: [...(terms.get(d.key) ?? [])] })),
    provider,
  );
  const fallback = await usualLanguage(ctx);
  // A deck the cards join keeps its own language; one that isn't the learner's is ignored.
  const targets = await targetDecks(ctx, summary.decks);
  for (const [key, deck] of targets) named.set(key, deck.language);
  const stored: StoredSummary = {
    ...summary,
    decks: summary.decks.map((d) => {
      const { targetDeckId: _, ...rest } = d;
      const target = targets.get(d.key);
      return {
        ...rest,
        known: known.get(d.key) ?? 0,
        ...(target ? { targetDeckId: target.id } : {}),
      };
    }),
    noteTypes: summary.noteTypes.map((type) => ({
      ...type,
      decks: [...(typeDecks.get(type.key) ?? [])],
    })),
    languages: Object.fromEntries(
      summary.decks.map((d) => [
        d.key,
        summary.languages?.[d.key] !== undefined || targets.has(d.key)
          ? (named.get(d.key) ?? null)
          : (named.get(d.key) ?? detected[d.key] ?? fallback),
      ]),
    ),
  };
  await ctx.db
    .update(schema.imports)
    .set({
      source: adapter.source,
      summary: stored,
      chunks: chunk,
      status: "ready",
      updatedAt: new Date(),
    })
    .where(and(eq(schema.imports.id, id), eq(schema.imports.status, "inspecting")));
}

/** The learner's active decks an import names as its target, by the import's deck key. */
async function targetDecks(
  ctx: ServiceContext,
  decks: { key: string; targetDeckId?: string | undefined }[],
) {
  const wanted = decks.filter((d) => d.targetDeckId);
  const found = new Map<string, { id: string; language: string | null }>();
  if (wanted.length === 0) return found;
  const rows = await ctx.db
    .select({ id: schema.decks.id, language: schema.decks.defaultLanguage })
    .from(schema.decks)
    .where(
      and(
        eq(schema.decks.userId, ctx.userId),
        isNull(schema.decks.archivedAt),
        inArray(
          schema.decks.id,
          wanted.map((d) => d.targetDeckId as string),
        ),
      ),
    );
  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const d of wanted) {
    const row = byId.get(d.targetDeckId as string);
    if (row) found.set(d.key, { id: row.id, language: row.language ?? null });
  }
  return found;
}

async function detect(file: RandomAccess, fileName: string) {
  for (const adapter of ADAPTERS) if (await adapter.detect(file, fileName)) return adapter;
  return null;
}

/** The learner's choices checked against what the file holds. */
function checkChoices(summary: StoredSummary, input: ImportChoicesInput): ImportChoices {
  const roles: ImportChoices["roles"] = {};
  for (const type of summary.noteTypes) {
    const chosen = input.roles[type.key] ?? type.roles;
    if (chosen.length !== type.fields.length) {
      throw new ServiceError("invalid", `Give each field of ${type.name} one role.`);
    }
    if (chosen.filter((role) => role === "term").length !== 1) {
      throw new ServiceError("invalid", `Choose one field of ${type.name} as the term.`);
    }
    roles[type.key] = chosen;
  }
  const languages: ImportChoices["languages"] = {};
  for (const deck of summary.decks) {
    languages[deck.key] =
      input.languages[deck.key] !== undefined
        ? (input.languages[deck.key] ?? null)
        : (summary.languages[deck.key] ?? null);
  }
  const keys = new Set(summary.decks.map((deck) => deck.key));
  const skipDecks = [...new Set(input.skipDecks ?? [])].filter((key) => keys.has(key));
  if (keys.size > 0 && skipDecks.length === keys.size) {
    throw new ServiceError("invalid", "Choose at least one deck to import.");
  }
  return { roles, languages, skipDecks };
}

async function readyWork(
  ctx: ServiceContext,
  id: string,
  uploads: R2Bucket,
  input?: ImportChoicesInput,
) {
  const row = await ownedImport(ctx, id);
  const summary = row.summary as StoredSummary | null;
  if (!summary) throw new ServiceError("conflict", "This import hasn’t been read yet.");
  const choices = input
    ? checkChoices(summary, input)
    : ((row.choices as ImportChoices | null) ??
      checkChoices(summary, { roles: {}, languages: {} }));
  return { row, summary, choices, adapter: adapterFor(row.source), bucket: uploads };
}

/** What confirming with these choices would write. */
export async function previewImportChoices(
  ctx: ServiceContext,
  id: string,
  input: ImportChoicesInput,
  uploads: R2Bucket,
) {
  const work = await readyWork(ctx, id, uploads, input);
  if (work.row.status !== "ready") {
    throw new ServiceError("conflict", "This import is no longer waiting for a preview.");
  }
  return previewImport(ctx, work);
}

/** Saves the learner's choices and starts writing. */
export async function confirmImport(
  ctx: ServiceContext,
  id: string,
  input: ImportChoicesInput,
  uploads: R2Bucket,
  start: StartRun,
) {
  const work = await readyWork(ctx, id, uploads, input);
  if (work.row.status !== "ready") return getImport(ctx, id);
  const [claimed] = await ctx.db
    .update(schema.imports)
    .set({
      choices: work.choices,
      status: "importing",
      written: 0,
      mediaTotal: 0,
      mediaDone: 0,
      counts: emptyImportCounts(),
      confirmedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(schema.imports.id, id), eq(schema.imports.status, "ready")))
    .returning({ id: schema.imports.id });
  if (claimed) {
    await start({ importId: id, userId: ctx.userId, actor: ctx.actor, phase: "write" });
    track(ctx.analytics, {
      name: "import_started",
      adapter: work.row.source,
      source: work.row.source,
      card_count: work.summary.decks
        .filter((deck) => !work.choices.skipDecks?.includes(deck.key))
        .reduce((count, deck) => count + deck.cards, 0),
      outcome: "started",
    });
  }
  return getImport(ctx, id);
}

export async function prepareImportDecks(ctx: ServiceContext, id: string, uploads: R2Bucket) {
  return prepareDecks(ctx, await readyWork(ctx, id, uploads));
}

export async function writeImportChunk(
  ctx: ServiceContext,
  id: string,
  chunk: number,
  decks: Record<string, string>,
  uploads: R2Bucket,
) {
  return writeChunk(ctx, await readyWork(ctx, id, uploads), chunk, decks);
}

/**
 * Stores one step's pictures and recordings, then records `handled`, the run's count of them
 * once this step lands, as progress. A retried step records the same count again.
 */
export async function attachImportPictures(
  ctx: ServiceContext,
  id: string,
  pending: PendingPicture[],
  uploads: R2Bucket,
  storage: Partial<CardImageStorage> & { audio?: R2Bucket | undefined },
  handled: number,
): Promise<AttachedMedia> {
  const work = await readyWork(ctx, id, uploads);
  let attached: AttachedMedia;
  if (work.row.objectKey) {
    const file = await r2Source(uploads, work.row.objectKey);
    attached = await attachPictures(ctx, work, file, pending, storage);
  } else {
    const recordings = pending.filter((item) => item.kind === "recording").length;
    attached = {
      stored: 0,
      skipped: pending.length - recordings,
      recordings: { stored: 0, skipped: recordings },
    };
  }
  await ctx.db.run(sql`update imports set media_done = max(media_done, ${handled}),
      updated_at = ${Date.now()}
    where id = ${id} and status = 'importing'`);
  return attached;
}

/** Marks the import done with its picture totals, and deletes the file. */
export async function finishImport(
  ctx: ServiceContext,
  id: string,
  pictures: MediaTotals,
  uploads: R2Bucket,
) {
  const row = await ownedImport(ctx, id);
  if (row.status !== "importing") return;
  const counts = { ...emptyImportCounts(), ...((row.counts as ImportCounts | null) ?? {}) };
  counts.pictures = pictures.stored;
  counts.picturesSkipped = pictures.skipped;
  counts.recordings = pictures.recordings?.stored ?? 0;
  counts.recordingsSkipped = pictures.recordings?.skipped ?? 0;
  const now = new Date();
  const eligible = and(eq(schema.imports.id, id), eq(schema.imports.status, "importing"))!;
  const [, completed] = await ctx.db.batch([
    auditStatementWhen(
      ctx,
      {
        entity: "import",
        action: "complete",
        id,
        details: { added: counts.added, existing: counts.existing, duplicates: counts.duplicates },
      },
      schema.imports,
      eligible,
    ),
    ctx.db
      .update(schema.imports)
      .set({ status: "done", counts, finishedAt: now, updatedAt: now })
      .where(and(eq(schema.imports.id, id), eq(schema.imports.status, "importing")))
      .returning(),
  ]);
  if (!completed.length) return;
  track(ctx.analytics, {
    name: "import_finished",
    adapter: row.source,
    source: row.source,
    card_count: counts.added,
    outcome: "done",
    recordings: counts.recordings,
    recordings_skipped: counts.recordingsSkipped,
    sounds_left_out: counts.soundsLeftOut,
    pictures: counts.pictures,
    pictures_skipped: counts.picturesSkipped,
    ...(row.confirmedAt ? { write_seconds: secondsSince(row.confirmedAt, now) } : {}),
  });
  await deleteImportFiles(uploads, row);
}

/** Whole seconds from `from` to `to`, within what an event's count holds. */
function secondsSince(from: Date, to: Date) {
  return Math.min(1_000_000, Math.max(0, Math.round((to.getTime() - from.getTime()) / 1000)));
}

/** Stops an import with a reason and deletes its file. Cards a failed write already added stay. */
export async function failImport(
  db: Db,
  id: string,
  failure: ImportFailure,
  uploads: R2Bucket,
  analytics?: AnalyticsWriter,
) {
  const [row] = await db.select().from(schema.imports).where(eq(schema.imports.id, id));
  if (!row || row.status === "done" || row.status === "failed" || row.status === "cancelled")
    return;
  const now = new Date();
  const failed = await db
    .update(schema.imports)
    .set({ status: "failed", failure, finishedAt: now, updatedAt: now })
    .where(and(eq(schema.imports.id, id), eq(schema.imports.status, row.status)))
    .returning();
  if (!failed.length) return;
  const card_count = (row.counts as ImportCounts | null)?.added ?? 0;
  track(analytics, {
    name: "import_finished",
    adapter: row.source,
    source: row.source,
    card_count,
    outcome: "failed",
  });
  track(analytics, { name: "import_failed", source: row.source, card_count });
  await deleteImportFiles(uploads, row);
}

/** The learner's way out before anything is written. */
export async function cancelImport(ctx: ServiceContext, id: string, uploads: R2Bucket) {
  const row = await ownedImport(ctx, id);
  if (row.status === "cancelled") return getImport(ctx, id);
  if (!["uploading", "inspecting", "ready"].includes(row.status)) {
    throw new ServiceError(
      "conflict",
      "An import that has started writing cards can be archived instead.",
    );
  }
  const now = new Date();
  await ctx.db.batch([
    ctx.db
      .update(schema.imports)
      .set({ status: "cancelled", finishedAt: now, updatedAt: now })
      .where(
        and(
          eq(schema.imports.id, id),
          inArray(schema.imports.status, ["uploading", "inspecting", "ready"]),
        ),
      ),
    auditStatement(ctx, { entity: "import", action: "cancel", id }),
  ]);
  await deleteImportFiles(uploads, row);
  return getImport(ctx, id);
}

/** Deletes the upload, any unfinished multipart upload and the stored note chunks. */
export async function deleteImportFiles(
  uploads: R2Bucket,
  row: Pick<Import, "objectKey" | "uploadId">,
) {
  if (!row.objectKey) return;
  try {
    if (row.uploadId)
      await uploads
        .resumeMultipartUpload(row.objectKey, row.uploadId)
        .abort()
        .catch(() => {});
    const keys = [row.objectKey];
    let cursor: string | undefined;
    do {
      const page = await uploads.list({
        prefix: `${row.objectKey}.notes/`,
        ...(cursor ? { cursor } : {}),
      });
      keys.push(...page.objects.map((o) => o.key));
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);
    for (let i = 0; i < keys.length; i += 1000) await uploads.delete(keys.slice(i, i + 1000));
  } catch {
    // The expiry sweep tries again; the key itself is never logged.
    console.error("Deleting an import's files failed");
    return;
  }
}

/**
 * Gives up on imports left waiting, so no upload stays in R2, and fails writes that stalled.
 * Run from the cron trigger, which reports any stalled write.
 */
export async function expireImports(
  db: Db,
  uploads: R2Bucket,
  now = new Date(),
  analytics?: AnalyticsWriter,
) {
  const before = (ms: number) => lt(schema.imports.updatedAt, new Date(now.getTime() - ms));
  const stale = await db
    .select()
    .from(schema.imports)
    .where(
      or(
        and(
          inArray(schema.imports.status, ["uploading", "inspecting", "ready"]),
          before(IMPORT_EXPIRY_MS),
        ),
        and(eq(schema.imports.status, "importing"), before(IMPORT_STALL_MS)),
      ),
    )
    .limit(50);
  let stalled = 0;
  for (const row of stale) {
    if (row.status === "importing") stalled++;
    await failImport(
      db,
      row.id,
      row.status === "importing" ? "internal" : "expired",
      uploads,
      analytics,
    );
  }
  return { expired: stale.length - stalled, stalled };
}

/** Turns a step's error into the failure the learner is shown. */
export function failureOf(err: unknown): ImportFailure {
  return err instanceof ImportFileError ? err.failure : "internal";
}

/** The service context a background step acts in: the learner and actor that started the run. */
export function runContext(
  db: Db,
  params: ImportRunParams,
  analytics?: AnalyticsWriter,
): ServiceContext {
  if (!params.userId) throw notFound("Import");
  return { db, userId: params.userId, actor: params.actor, analytics };
}

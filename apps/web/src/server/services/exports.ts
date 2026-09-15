import {
  type Actor,
  deserializeState,
  EXPORT_EXTENSIONS,
  EXPORT_WINDOW_MS,
  type ExportCounts,
  type ExportFailure,
  type ExportStartInput,
  effectiveModes,
  isImageMode,
  LYMI_FILE_VERSION,
  type LymiFileCard,
  type LymiFileDeck,
  type LymiFileManifest,
  type LymiFileReview,
  type LymiFileState,
  modesFromDirections,
  newId,
  type Rating,
} from "@lymi/core";
import { and, asc, desc, eq, getTableColumns, lt, sql } from "@lymi/core/db";
import type { Card, CardImage, Deck, Export } from "@lymi/core/schema";
import { auditStatement } from "../audit";
import { type Db, schema } from "../db";
import { AnkiCollection, ankiPlaceholder, MAX_ANKI_COLLECTION_BYTES } from "../exports/anki";
import {
  centralDirectory,
  Deflater,
  type ZipRecord,
  ZipSegment,
  ZipTooLarge,
} from "../exports/zip";
import { notFound, type ServiceContext, ServiceError } from "./context";
import { dateFormatter } from "./days";
import { deckAccess, memberOf } from "./members";
import { stateMode } from "./modes";
import { effectiveSeriesId } from "./series-access";
import { getSettings } from "./settings";

/** Cards read from D1 per query while the file is written. */
const CARDS_PER_PAGE = 200;

/** Pictures and sounds copied into the file per Workflow step. */
export const MEDIA_PER_STEP = 50;

/** An export still writing past this is given up and its segments deleted. */
export const EXPORT_STALL_MS = 24 * 60 * 60 * 1000;

export type ExportRunParams = { exportId: string; userId: string; actor: Actor };
export type StartExportRun = (params: ExportRunParams) => Promise<void>;

/** Where export files are read from and written to. */
export type ExportStorage = {
  bucket: R2Bucket;
  pictures: R2Bucket | undefined;
  audio: R2Bucket | undefined;
};

/** The file is too large for one step or one zip, so the learner exports per deck instead. */
export class ExportTooLarge extends Error {
  constructor() {
    super("too_large");
    this.name = "ExportTooLarge";
  }
}

export function presentExport(row: Export) {
  return {
    id: row.id,
    format: row.format,
    deckId: row.deckId,
    fileName: row.fileName,
    status: row.status,
    failure: row.failure,
    byteSize: row.status === "done" ? row.byteSize : null,
    counts: (row.counts as ExportCounts | null) ?? null,
    downloadUrl: row.status === "done" ? `/api/exports/${row.id}/file` : null,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    finishedAt: row.finishedAt,
    expiresAt: row.expiresAt,
  };
}
export type ExportView = ReturnType<typeof presentExport>;

export async function ownedExport(ctx: ServiceContext, id: string): Promise<Export> {
  const [row] = await ctx.db
    .select()
    .from(schema.exportFiles)
    .where(and(eq(schema.exportFiles.id, id), eq(schema.exportFiles.userId, ctx.userId)));
  if (!row) throw notFound("Export");
  return row;
}

export async function listExports(ctx: ServiceContext) {
  const rows = await ctx.db
    .select()
    .from(schema.exportFiles)
    .where(eq(schema.exportFiles.userId, ctx.userId))
    .orderBy(desc(schema.exportFiles.createdAt))
    .limit(100);
  return rows.map(presentExport);
}

export async function getExport(ctx: ServiceContext, id: string) {
  return presentExport(await ownedExport(ctx, id));
}

/** A file name from the deck's name, or the library and the learner's day, never the learner's name. */
export function exportFileName(
  deckName: string | null,
  format: keyof typeof EXPORT_EXTENSIONS,
  now: Date,
  zone = "UTC",
) {
  const slug = (deckName ?? "")
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 60);
  const base =
    deckName === null ? `lymi-library-${dateFormatter(zone).format(now)}` : slug || "lymi-deck";
  return `${base}.${EXPORT_EXTENSIONS[format]}`;
}

/**
 * Asks for a file. The same request while one for the same deck and format is still being
 * written returns that one, so a double tap starts one Workflow.
 */
export async function startExport(
  ctx: ServiceContext,
  input: ExportStartInput,
  start: StartExportRun,
) {
  const { db, userId, actor } = ctx;
  const deck = input.deckId ? await deckAccess(ctx, input.deckId) : null;
  const [running] = await db
    .select()
    .from(schema.exportFiles)
    .where(
      and(
        eq(schema.exportFiles.userId, userId),
        eq(schema.exportFiles.format, input.format),
        eq(schema.exportFiles.status, "exporting"),
        deck ? eq(schema.exportFiles.deckId, deck.id) : sql`${schema.exportFiles.deckId} is null`,
      ),
    )
    .limit(1);
  if (running) return presentExport(running);

  const id = newId();
  const now = new Date();
  await db.batch([
    db.insert(schema.exportFiles).values({
      id,
      userId,
      format: input.format,
      deckId: deck?.id ?? null,
      fileName: exportFileName(
        deck?.name ?? null,
        input.format,
        now,
        (await getSettings(ctx)).reviewTimezone ?? "UTC",
      ),
      // A random key names neither the learner nor the deck.
      objectKey: `exports/${crypto.randomUUID()}`,
      createdBy: actor,
    }),
    auditStatement(db, {
      userId,
      actor,
      action: "create",
      entity: "export",
      entityId: id,
      payload: { format: input.format, deckId: deck?.id ?? null },
    }),
  ]);
  await start({ exportId: id, userId, actor });
  return getExport(ctx, id);
}

/** The decks an export covers: one deck, or every deck the learner can see, archived ones too. */
async function scopeDecks(ctx: ServiceContext, row: Export) {
  const { db, userId } = ctx;
  if (row.deckId) {
    const deck = await deckAccess(ctx, row.deckId);
    return [{ ...deck, seriesId: deck.seriesId }];
  }
  return db
    .select({
      ...getTableColumns(schema.decks),
      seriesId: effectiveSeriesId(userId),
    })
    .from(schema.decks)
    .where(memberOf(userId))
    .orderBy(asc(schema.decks.createdAt), asc(schema.decks.id));
}

type ScopeDeck = Omit<Deck, "seriesId"> & { seriesId: string | null };

/** The export's cards in creation order, a page at a time, with the learner's own schedule. */
async function* scopeCards(ctx: ServiceContext, decks: readonly ScopeDeck[]) {
  const { db, userId } = ctx;
  const deckIds = JSON.stringify(decks.map((deck) => deck.id));
  let cursor: { createdAt: number; id: string } | null = null;
  for (;;) {
    const after: ReturnType<typeof sql> | undefined = cursor
      ? sql`(${schema.cards.createdAt} > ${cursor.createdAt} or (${schema.cards.createdAt} = ${cursor.createdAt} and ${schema.cards.id} > ${cursor.id}))`
      : undefined;
    const cards: Card[] = await db
      .select()
      .from(schema.cards)
      .where(and(sql`${schema.cards.deckId} in (select value from json_each(${deckIds}))`, after))
      .orderBy(asc(schema.cards.createdAt), asc(schema.cards.id))
      .limit(CARDS_PER_PAGE);
    if (cards.length === 0) return;
    const last = cards.at(-1) as Card;
    cursor = { createdAt: last.createdAt.getTime(), id: last.id };
    const ids = JSON.stringify(cards.map((card) => card.id));
    const inPage = (column: typeof schema.cardImages.cardId | typeof schema.cardStates.cardId) =>
      sql`${column} in (select value from json_each(${ids}))`;
    const [images, states, reviews] = await Promise.all([
      db
        .select()
        .from(schema.cardImages)
        .where(and(inPage(schema.cardImages.cardId), eq(schema.cardImages.status, "active"))),
      db
        .select()
        .from(schema.cardStates)
        .where(and(inPage(schema.cardStates.cardId), eq(schema.cardStates.userId, userId))),
      db
        .select({ review: schema.reviews })
        .from(schema.reviews)
        .leftJoin(schema.reviewUndos, eq(schema.reviewUndos.reviewId, schema.reviews.id))
        .where(
          and(
            sql`${schema.reviews.cardId} in (select value from json_each(${ids}))`,
            eq(schema.reviews.userId, userId),
            sql`${schema.reviewUndos.reviewId} is null`,
          ),
        )
        .orderBy(asc(schema.reviews.reviewedAt), asc(schema.reviews.id)),
    ]);
    const imageOf = new Map(images.map((image) => [image.cardId, image]));
    const reviewsOf = new Map<string, LymiFileReview[]>();
    for (const { review } of reviews) {
      const list = reviewsOf.get(review.cardStateId) ?? [];
      list.push({
        at: review.reviewedAt.getTime(),
        rating: review.rating as Rating,
        state: review.state,
        elapsedDays: review.elapsedDays,
        scheduledDays: review.scheduledDays,
        stability: review.stabilityAfter,
        difficulty: review.difficultyAfter,
        source: review.source,
      });
      reviewsOf.set(review.cardStateId, list);
    }
    const statesOf = new Map<string, LymiFileState[]>();
    for (const state of states) {
      const fsrs = deserializeState(state.fsrs);
      const list = statesOf.get(state.cardId) ?? [];
      list.push({
        mode: stateMode(state),
        state: state.state,
        due: state.due.getTime(),
        lastReview: state.lastReview?.getTime() ?? null,
        stability: fsrs.stability,
        difficulty: fsrs.difficulty,
        reviews: reviewsOf.get(state.id) ?? [],
      });
      statesOf.set(state.cardId, list);
    }
    yield cards.map((card) => ({
      card,
      image: imageOf.get(card.id) ?? null,
      states: statesOf.get(card.id) ?? [],
    }));
  }
}

type ScopeCard = { card: Card; image: CardImage | null; states: LymiFileState[] };

function fileCard(item: ScopeCard, picture: string | null): LymiFileCard {
  const { card, image } = item;
  return {
    id: card.id,
    deck: card.deckId,
    section: card.sectionId,
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
    reviewModes: card.directions ? effectiveModes(card.directions, card.reviewModeKeys) : null,
    picture:
      image && picture
        ? {
            file: picture,
            description: image.description,
            width: image.width,
            height: image.height,
          }
        : null,
    archivedAt: card.archivedAt?.getTime() ?? null,
    createdAt: card.createdAt.getTime(),
    states: item.states.sort((a, b) => a.mode.localeCompare(b.mode)),
  };
}

/** A sound's file name from its stored key's extension; the key itself never leaves the server. */
function soundName(card: Card) {
  const extension = /\.([a-z0-9]{2,5})$/i.exec(card.audioKey ?? "")?.[1];
  return extension ? `lymi-${card.id}-speech.${extension.toLowerCase()}` : null;
}

const segmentKey = (row: Export, segment: number) => `${row.objectKey}/${segment}`;
const recordsKey = (row: Export, segment: number) => `${row.objectKey}.records/${segment}.json`;

type StoredRecords = { records: ZipRecord[]; media: [string, string][] };

async function putSegment(
  bucket: R2Bucket,
  row: Export,
  segment: number,
  zip: ZipSegment,
  media: [string, string][] = [],
) {
  await bucket.put(segmentKey(row, segment), zip.bytes());
  const stored: StoredRecords = { records: zip.records, media };
  await bucket.put(recordsKey(row, segment), JSON.stringify(stored));
}

/**
 * The first step: every card, schedule and review in one entry, which is the part that has to be
 * whole. Pictures and sounds follow in later steps. Returns where the next segment begins.
 */
export async function writeExportData(ctx: ServiceContext, id: string, storage: ExportStorage) {
  const row = await ownedExport(ctx, id);
  if (row.status !== "exporting" || !row.objectKey) return { offset: 0, media: 0 };
  const decks = (await scopeDecks(ctx, row)) as ScopeDeck[];
  const now = new Date();
  const counts: ExportCounts = {
    decks: decks.length,
    cards: 0,
    reviews: 0,
    pictures: 0,
    sounds: 0,
  };
  const zip = new ZipSegment(0);
  const deckModes = new Map(decks.map((deck) => [deck.id, modesFromDirections(deck.directions)]));

  try {
    if (row.format === "lymi") {
      const lines = new Deflater();
      const encoder = new TextEncoder();
      for await (const page of scopeCards(ctx, decks)) {
        for (const item of page) {
          const card = fileCard(item, item.image ? `media/${item.card.id}.webp` : null);
          counts.cards++;
          counts.reviews += card.states.reduce((sum, state) => sum + state.reviews.length, 0);
          if (card.picture) counts.pictures++;
          await lines.write(encoder.encode(`${JSON.stringify(card)}\n`));
        }
      }
      await lines.close();
      zip.addDeflated("cards.jsonl", lines);
      await zip.add(
        "lymi.json",
        encoder.encode(JSON.stringify(await manifest(ctx, decks, counts, now), null, 2)),
        true,
      );
    } else {
      const collection = new AnkiCollection(
        decks.map((deck) => ({
          key: deck.id,
          name: deck.name,
          description: deck.description,
          archived: deck.archivedAt !== null,
        })),
        now,
      );
      for await (const page of scopeCards(ctx, decks)) {
        for (const item of page) {
          const picture = item.image ? `lymi-${item.card.id}.webp` : null;
          const sound = soundName(item.card);
          const card = fileCard(item, picture);
          const own = card.reviewModes ?? deckModes.get(card.deck) ?? [];
          const modes = own.some((mode) => !isImageMode(mode))
            ? own.filter((mode) => !isImageMode(mode))
            : own;
          await collection.add({ card, modes, picture, sound });
          counts.cards++;
          if (picture) counts.pictures++;
          if (sound) counts.sounds++;
          if (collection.byteLength > MAX_ANKI_COLLECTION_BYTES) throw new ExportTooLarge();
        }
      }
      counts.reviews = collection.reviews;
      const pages = collection.finish();
      const database = new Deflater();
      for (const page of pages) await database.write(page);
      await database.close();
      // Anki's legacy export: the protobuf `meta` naming the legacy container, then the collection.
      await zip.add("meta", new Uint8Array([0x08, 0x02]), false);
      zip.addDeflated("collection.anki21", database);
      const placeholder = new Deflater();
      for (const page of await ankiPlaceholder(now)) await placeholder.write(page);
      await placeholder.close();
      zip.addDeflated("collection.anki2", placeholder);
    }
  } catch (err) {
    if (err instanceof ZipTooLarge) throw new ExportTooLarge();
    throw err;
  }

  await putSegment(storage.bucket, row, 0, zip);
  await ctx.db
    .update(schema.exportFiles)
    .set({ counts, updatedAt: new Date() })
    .where(eq(schema.exportFiles.id, id));
  return { offset: zip.length, media: counts.pictures + counts.sounds };
}

async function manifest(
  ctx: ServiceContext,
  decks: readonly ScopeDeck[],
  counts: ExportCounts,
  now: Date,
): Promise<LymiFileManifest> {
  const deckIds = JSON.stringify(decks.map((deck) => deck.id));
  const [sections, series] = await Promise.all([
    ctx.db
      .select()
      .from(schema.sections)
      .where(sql`${schema.sections.deckId} in (select value from json_each(${deckIds}))`)
      .orderBy(asc(schema.sections.position)),
    ctx.db.select().from(schema.series).where(eq(schema.series.userId, ctx.userId)),
  ]);
  const usedSeries = new Set(decks.map((deck) => deck.seriesId));
  return {
    format: "lymi",
    version: LYMI_FILE_VERSION,
    exportedAt: now.getTime(),
    series: series
      .filter((item) => usedSeries.has(item.id))
      .map((item) => ({ id: item.id, name: item.name, position: item.position })),
    decks: decks.map(
      (deck): LymiFileDeck => ({
        id: deck.id,
        name: deck.name,
        description: deck.description,
        defaultLanguage: deck.defaultLanguage,
        reviewModes: modesFromDirections(deck.directions),
        sectionProgression: deck.sectionProgression,
        series: deck.seriesId,
        sections: sections
          .filter((section) => section.deckId === deck.id)
          .map((section) => ({
            id: section.id,
            name: section.name,
            position: section.position,
            archivedAt: section.archivedAt?.getTime() ?? null,
          })),
        archivedAt: deck.archivedAt?.getTime() ?? null,
        createdAt: deck.createdAt.getTime(),
      }),
    ),
    counts,
  };
}

export type MediaStep = { segment: number; offset: number; after: string | null; number: number };

/**
 * Copies the next pictures and sounds into their own segment. Anki names its media entries by
 * number and lists their names in `media`; a Lymi zip keeps them under `media/`.
 */
export async function writeExportMedia(
  ctx: ServiceContext,
  id: string,
  step: MediaStep,
  storage: ExportStorage,
) {
  const row = await ownedExport(ctx, id);
  if (row.status !== "exporting" || !row.objectKey) {
    return { ...step, done: true, missing: 0 };
  }
  const decks = (await scopeDecks(ctx, row)) as ScopeDeck[];
  const deckIds = JSON.stringify(decks.map((deck) => deck.id));
  const anki = row.format === "anki";
  const rows = await ctx.db
    .select({ card: schema.cards, objectKey: schema.cardImages.objectKey })
    .from(schema.cards)
    .leftJoin(
      schema.cardImages,
      and(eq(schema.cardImages.cardId, schema.cards.id), eq(schema.cardImages.status, "active")),
    )
    .where(
      and(
        sql`${schema.cards.deckId} in (select value from json_each(${deckIds}))`,
        anki
          ? sql`(${schema.cardImages.id} is not null or ${schema.cards.audioKey} is not null)`
          : sql`${schema.cardImages.id} is not null`,
        step.after ? sql`${schema.cards.id} > ${step.after}` : undefined,
      ),
    )
    .orderBy(asc(schema.cards.id))
    .limit(MEDIA_PER_STEP);

  const zip = new ZipSegment(step.offset);
  const media: [string, string][] = [];
  let number = step.number;
  let missing = 0;
  const copy = async (bucket: R2Bucket | undefined, key: string, name: string) => {
    const object = bucket ? await bucket.get(key) : null;
    if (!object) {
      missing++;
      return;
    }
    const bytes = new Uint8Array(await object.arrayBuffer());
    if (anki) {
      const entry = String(number++);
      await zip.add(entry, bytes, false);
      media.push([entry, name]);
    } else {
      await zip.add(name, bytes, false);
    }
  };
  try {
    for (const { card, objectKey } of rows) {
      if (objectKey)
        await copy(
          storage.pictures,
          objectKey,
          anki ? `lymi-${card.id}.webp` : `media/${card.id}.webp`,
        );
      const sound = anki ? soundName(card) : null;
      if (sound && card.audioKey) await copy(storage.audio, card.audioKey, sound);
    }
  } catch (err) {
    if (err instanceof ZipTooLarge) throw new ExportTooLarge();
    throw err;
  }
  await putSegment(storage.bucket, row, step.segment, zip, media);
  // A long run of pictures is still progress, so the stall sweep leaves it alone.
  await ctx.db
    .update(schema.exportFiles)
    .set({ updatedAt: new Date() })
    .where(eq(schema.exportFiles.id, id));
  return {
    segment: step.segment + 1,
    offset: step.offset + zip.length,
    after: rows.at(-1)?.card.id ?? step.after,
    number,
    done: rows.length < MEDIA_PER_STEP,
    missing,
  };
}

/** Writes the central directory, marks the file downloadable for its window, and audits it. */
export async function finishExport(
  ctx: ServiceContext,
  id: string,
  end: { segment: number; offset: number; missing: number },
  bucket: R2Bucket,
) {
  const row = await ownedExport(ctx, id);
  if (row.status !== "exporting" || !row.objectKey) return;
  const records: ZipRecord[] = [];
  const media: [string, string][] = [];
  for (let segment = 0; segment < end.segment; segment++) {
    const object = await bucket.get(recordsKey(row, segment));
    if (!object) throw new ServiceError("unavailable", "An export segment is missing");
    const stored = (await object.json()) as StoredRecords;
    records.push(...stored.records);
    media.push(...stored.media);
  }
  const zip = new ZipSegment(end.offset);
  try {
    if (row.format === "anki") {
      await zip.add(
        "media",
        new TextEncoder().encode(JSON.stringify(Object.fromEntries(media))),
        true,
      );
    }
    records.push(...zip.records);
    const directory = centralDirectory(records, end.offset + zip.length);
    zip.chunks.push(directory);
    zip.length += directory.length;
  } catch (err) {
    if (err instanceof ZipTooLarge) throw new ExportTooLarge();
    throw err;
  }
  await bucket.put(segmentKey(row, end.segment), zip.bytes());

  const counts = (row.counts as ExportCounts | null) ?? null;
  const now = new Date();
  await ctx.db.batch([
    ctx.db
      .update(schema.exportFiles)
      .set({
        status: "done",
        segments: end.segment + 1,
        byteSize: end.offset + zip.length,
        finishedAt: now,
        expiresAt: new Date(now.getTime() + EXPORT_WINDOW_MS),
        updatedAt: now,
      })
      .where(and(eq(schema.exportFiles.id, id), eq(schema.exportFiles.status, "exporting"))),
    auditStatement(ctx.db, {
      userId: ctx.userId,
      actor: ctx.actor,
      action: "complete",
      entity: "export",
      entityId: id,
      payload: { format: row.format, deckId: row.deckId, ...counts, missing: end.missing },
    }),
  ]);
  await deleteObjects(bucket, `${row.objectKey}.records/`);
}

/** Stops an export with a reason and deletes what it wrote. */
export async function failExport(db: Db, id: string, failure: ExportFailure, bucket: R2Bucket) {
  const [row] = await db.select().from(schema.exportFiles).where(eq(schema.exportFiles.id, id));
  if (row?.status !== "exporting") return;
  const now = new Date();
  await db
    .update(schema.exportFiles)
    .set({ status: "failed", failure, objectKey: null, finishedAt: now, updatedAt: now })
    .where(and(eq(schema.exportFiles.id, id), eq(schema.exportFiles.status, "exporting")));
  await deleteFiles(bucket, row);
}

async function deleteObjects(bucket: R2Bucket, prefix: string) {
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix, ...(cursor ? { cursor } : {}) });
    const keys = page.objects.map((object) => object.key);
    if (keys.length > 0) await bucket.delete(keys);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
}

async function deleteFiles(bucket: R2Bucket, row: Export) {
  if (!row.objectKey) return;
  try {
    await deleteObjects(bucket, `${row.objectKey}/`);
    await deleteObjects(bucket, `${row.objectKey}.records/`);
  } catch {
    // The sweep tries again; the key itself is never logged.
    console.error("Deleting an export's files failed");
  }
}

/** Deletes files past their window and gives up on exports that stalled. Run from the cron trigger. */
export async function expireExports(db: Db, bucket: R2Bucket, now = new Date()) {
  const expired = await db
    .select()
    .from(schema.exportFiles)
    .where(and(eq(schema.exportFiles.status, "done"), lt(schema.exportFiles.expiresAt, now)))
    .limit(50);
  for (const row of expired) {
    await deleteFiles(bucket, row);
    await db
      .update(schema.exportFiles)
      .set({ status: "expired", objectKey: null, updatedAt: now })
      .where(eq(schema.exportFiles.id, row.id));
  }
  const stalled = await db
    .select({ id: schema.exportFiles.id })
    .from(schema.exportFiles)
    .where(
      and(
        eq(schema.exportFiles.status, "exporting"),
        lt(schema.exportFiles.updatedAt, new Date(now.getTime() - EXPORT_STALL_MS)),
      ),
    )
    .limit(50);
  for (const row of stalled) await failExport(db, row.id, "internal", bucket);
  return expired.length + stalled.length;
}

/** The finished file's segments in order, for the learner who asked for it, within its window. */
export async function exportFile(
  ctx: ServiceContext,
  id: string,
  bucket: R2Bucket,
  now = new Date(),
) {
  const row = await ownedExport(ctx, id);
  if (
    row.status !== "done" ||
    !row.objectKey ||
    row.byteSize === null ||
    (row.expiresAt && row.expiresAt.getTime() <= now.getTime())
  ) {
    throw notFound("Export file");
  }
  const segments = row.segments;
  return {
    fileName: row.fileName,
    format: row.format,
    byteSize: row.byteSize,
    async *streams(): AsyncGenerator<ReadableStream<Uint8Array>> {
      for (let segment = 0; segment < segments; segment++) {
        const object = await bucket.get(segmentKey(row, segment));
        if (!object) throw new ServiceError("unavailable", "The export's file is incomplete");
        yield object.body;
      }
    },
  };
}

/** Turns a step's error into the failure the learner is shown. */
export function exportFailureOf(err: unknown): ExportFailure {
  return err instanceof ExportTooLarge ? "too_large" : "internal";
}

/** The service context a background step acts in. */
export function exportRunContext(db: Db, params: ExportRunParams): ServiceContext {
  return { db, userId: params.userId, actor: params.actor };
}

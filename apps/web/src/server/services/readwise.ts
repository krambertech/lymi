import { CARD_LIMITS, languageKey } from "@lymi/core";
import { and, desc, eq, inArray, isNotNull, isNull, lt, lte, or } from "@lymi/core/db";
import type { ReadwiseBook, ReadwiseConnection } from "@lymi/core/schema";
import type { TextProvider } from "../ai";
import { schema } from "../db";
import {
  type ReadwiseApi,
  type ReadwiseExportBook,
  ReadwiseLimited,
  ReadwiseRefused,
} from "../readwise/api";
import { termOf } from "../readwise/terms";
import { openToken, sealToken } from "../readwise/token";
import { track } from "./analytics";
import { runBatch, runInBatches, type Statement, selectIn } from "./batch";
import { addCards, type ServerCardInput } from "./cards";
import { type ServiceContext, ServiceError } from "./context";
import type { EnrichmentQueue } from "./enrichment";
import { detectDeckLanguages } from "./import-languages";

export type ReadwiseDeps = {
  api: ReadwiseApi;
  /** The auth secret, which the token key is derived from. */
  secret: string;
  languages: TextProvider | null;
  enrichment: EnrichmentQueue | null;
};

const HOUR = 60 * 60 * 1000;
// A highlight synced while a pull runs can carry an earlier time; the overlap reads it again.
const OVERLAP = 2 * 60 * 1000;
/** Pages one pull reads. */
const PAGES_PER_PULL = 10;
/** Highlights read per new book to tell its language. */
const SAMPLE = 12;
const MANUAL_PULL_GAP = 30 * 1000;
/** How long a pull holds the connection; a pull that dies mid-way frees it when this runs out. */
const LEASE = 5 * 60 * 1000;
const PULLS_PER_RUN = 25;

/** The connection as it is the learner's to see: never the token itself. */
export type ReadwiseView = {
  tokenHint: string;
  status: ReadwiseConnection["status"];
  lastPull: { at: Date; highlights: number; cards: number; skipped: number } | null;
  /** Each language one of the learner's decks teaches, with the deck its highlights go to. */
  languages: { language: string; deckId: string | null }[];
  books: {
    id: string;
    title: string;
    author: string | null;
    language: string | null;
    followed: boolean;
    highlights: number;
  }[];
};

/** Readwise's context: the system writing for the learner, named as the app behind it. */
export function readwiseContext(ctx: ServiceContext): ServiceContext {
  return { ...ctx, actor: "system", client: "readwise", clientName: "Readwise" };
}

async function connectionOf(ctx: ServiceContext) {
  const [row] = await ctx.db
    .select()
    .from(schema.readwiseConnections)
    .where(eq(schema.readwiseConnections.userId, ctx.userId));
  return row ?? null;
}

/** Each language the learner's own decks teach, with the most recently changed deck first. */
async function learnedLanguages(ctx: ServiceContext): Promise<Map<string, string[]>> {
  const decks = await ctx.db
    .select({ id: schema.decks.id, language: schema.decks.defaultLanguage })
    .from(schema.decks)
    .where(
      and(
        eq(schema.decks.userId, ctx.userId),
        isNull(schema.decks.archivedAt),
        isNotNull(schema.decks.defaultLanguage),
      ),
    )
    .orderBy(desc(schema.decks.updatedAt));
  const byLanguage = new Map<string, string[]>();
  for (const deck of decks) {
    const key = languageKey(deck.language);
    if (!key) continue;
    byLanguage.set(key, [...(byLanguage.get(key) ?? []), deck.id]);
  }
  return byLanguage;
}

export async function getReadwise(ctx: ServiceContext): Promise<ReadwiseView | null> {
  const row = await connectionOf(ctx);
  if (!row) return null;
  const [books, learned] = await Promise.all([
    ctx.db
      .select()
      .from(schema.readwiseBooks)
      .where(eq(schema.readwiseBooks.userId, ctx.userId))
      .orderBy(desc(schema.readwiseBooks.highlights)),
    learnedLanguages(ctx),
  ]);
  return {
    tokenHint: row.tokenHint,
    status: row.status,
    lastPull: row.lastPullAt
      ? {
          at: row.lastPullAt,
          highlights: row.lastPullHighlights,
          cards: row.lastPullCards,
          skipped: row.lastPullSkipped,
        }
      : null,
    languages: [...learned.entries()].map(([language, decks]) => {
      const chosen = row.decks[language];
      return { language, deckId: chosen && decks.includes(chosen) ? chosen : null };
    }),
    books: books.map((b) => ({
      id: b.bookId,
      title: b.title,
      author: b.author,
      language: b.language ? languageKey(b.language) : null,
      followed: b.followed,
      highlights: b.highlights,
    })),
  };
}

/** A call to Readwise during connect; an outage or rate limit is the learner's to retry. */
async function reaching<T>(work: Promise<T>): Promise<T> {
  try {
    return await work;
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError("unavailable", "Readwise didn't answer. Try again in a minute.");
  }
}

async function readToken(deps: ReadwiseDeps, token: string): Promise<string> {
  const clean = token.trim();
  if (!(await reaching(deps.api.accepts(clean)))) {
    throw new ServiceError(
      "invalid",
      "Readwise didn't accept that token",
      undefined,
      "readwise_refused",
    );
  }
  return clean;
}

/** Each book's language, read from its highlights' text in one model call. */
async function bookLanguages(
  deps: ReadwiseDeps,
  books: { id: string; title: string; texts: string[] }[],
): Promise<Map<string, string>> {
  const found = await detectDeckLanguages(
    books
      .filter((b) => b.texts.length > 0)
      .map((b) => ({ key: b.id, name: b.title, terms: b.texts.slice(0, SAMPLE) })),
    deps.languages,
  );
  return new Map(Object.entries(found));
}

/**
 * Stores the token and, the first time, reads the learner's books, finds each one's language and
 * follows those in a language one of their decks teaches. A second paste only replaces the token.
 */
export async function connectReadwise(
  ctx: ServiceContext,
  deps: ReadwiseDeps,
  token: string,
): Promise<ReadwiseView> {
  const accepted = await readToken(deps, token);
  const sealed = await sealToken(deps.secret, accepted);
  const hint = accepted.slice(-4);
  const now = new Date();
  const existing = await connectionOf(ctx);
  if (existing) {
    await ctx.db
      .update(schema.readwiseConnections)
      .set({
        tokenCipher: sealed,
        tokenHint: hint,
        status: "active",
        nextPullAt: now,
        updatedAt: now,
      })
      .where(eq(schema.readwiseConnections.userId, ctx.userId));
  } else {
    const [summaries, recent, learned] = await Promise.all([
      reaching(deps.api.books(accepted)),
      reaching(deps.api.recentHighlights(accepted)),
      learnedLanguages(ctx),
    ]);
    const texts = new Map<string, string[]>();
    for (const h of recent) texts.set(h.bookId, [...(texts.get(h.bookId) ?? []), h.text]);
    const languages = await bookLanguages(
      deps,
      summaries.map((b) => ({ id: b.id, title: b.title ?? "", texts: texts.get(b.id) ?? [] })),
    );
    const decks = Object.fromEntries(
      [...learned.entries()].flatMap(([language, ids]) => (ids[0] ? [[language, ids[0]]] : [])),
    );
    await runInBatches(ctx.db, [
      [
        ctx.db.insert(schema.readwiseConnections).values({
          userId: ctx.userId,
          tokenCipher: sealed,
          tokenHint: hint,
          status: "active",
          decks,
          pulledThrough: now,
          nextPullAt: new Date(now.getTime() + HOUR),
        }),
      ],
      ...summaries.map((b) => {
        const language = languages.get(b.id) ?? null;
        return [
          ctx.db.insert(schema.readwiseBooks).values({
            userId: ctx.userId,
            bookId: b.id,
            title: (b.title ?? "").slice(0, CARD_LIMITS.source),
            author: b.author ?? null,
            language,
            followed: Boolean(language && decks[languageKey(language)]),
            everFollowed: Boolean(language && decks[languageKey(language)]),
            highlights: b.num_highlights ?? 0,
          }),
        ];
      }),
    ]);
  }
  const view = await getReadwise(ctx);
  if (!view) throw new Error("The Readwise connection was not saved");
  track(ctx.analytics, {
    name: "readwise_connected",
    books: view.books.length,
    followed: view.books.filter((b) => b.followed).length,
    languages: view.languages.length,
    reconnected: Boolean(existing),
  });
  return view;
}

/** Follows or unfollows books, sets the language Lymi could not tell, and picks each language's deck. */
export async function updateReadwise(
  ctx: ServiceContext,
  input: {
    books?:
      | { id: string; followed?: boolean | undefined; language?: string | undefined }[]
      | undefined;
    decks?: Record<string, string> | undefined;
  },
): Promise<{ view: ReadwiseView; followed: boolean }> {
  const row = await connectionOf(ctx);
  if (!row) throw new ServiceError("not_found", "Readwise is not connected");
  const learned = await learnedLanguages(ctx);
  // An archived deck is no deck: a book of its language is not followed into it.
  const decks = Object.fromEntries(await activeDecks(ctx, { ...row.decks, ...input.decks }));
  for (const [language, deckId] of Object.entries(input.decks ?? {})) {
    if (!learned.get(language)?.includes(deckId)) {
      throw new ServiceError("invalid", "Choose one of your own decks in that language");
    }
  }
  const patches = input.books ?? [];
  for (const patch of patches) {
    if (patch.language !== undefined && !learned.has(patch.language)) {
      throw new ServiceError("invalid", "Choose a language one of your decks teaches");
    }
  }
  const current = new Map(
    (
      await selectIn(
        patches.map((b) => b.id),
        (ids) =>
          ctx.db
            .select()
            .from(schema.readwiseBooks)
            .where(
              and(
                eq(schema.readwiseBooks.userId, ctx.userId),
                inArray(schema.readwiseBooks.bookId, ids),
              ),
            ),
      )
    ).map((b) => [b.bookId, b]),
  );
  const now = new Date();
  let newlyFollowed = false;
  const writes: Statement[] = [];
  if (input.decks) {
    writes.push(
      ctx.db
        .update(schema.readwiseConnections)
        .set({ decks, updatedAt: now })
        .where(eq(schema.readwiseConnections.userId, ctx.userId)),
    );
  }
  for (const patch of patches) {
    const before = current.get(patch.id);
    if (!before) continue;
    const language = patch.language ?? before.language;
    // Telling Lymi a book's language follows it, when one of the learner's decks takes that language.
    const followed =
      patch.followed ?? (patch.language ? Boolean(decks[patch.language]) : before.followed);
    // Only a first follow reads back to connecting; a book turned back on brings new highlights.
    const first = followed && !before.everFollowed;
    newlyFollowed ||= first;
    writes.push(
      ctx.db
        .update(schema.readwiseBooks)
        .set({
          language,
          followed,
          pending: before.pending || first,
          everFollowed: before.everFollowed || followed,
          updatedAt: now,
        })
        .where(
          and(
            eq(schema.readwiseBooks.userId, ctx.userId),
            eq(schema.readwiseBooks.bookId, patch.id),
          ),
        ),
    );
  }
  await runBatch(ctx.db, writes);
  const view = await getReadwise(ctx);
  if (!view) throw new Error("The Readwise connection disappeared");
  // A new deck for a language lets a book waiting on it catch up now.
  const waiting =
    Boolean(input.decks) &&
    (
      await ctx.db
        .select({ bookId: schema.readwiseBooks.bookId })
        .from(schema.readwiseBooks)
        .where(
          and(eq(schema.readwiseBooks.userId, ctx.userId), eq(schema.readwiseBooks.pending, true)),
        )
        .limit(1)
    ).length > 0;
  return { view, followed: newlyFollowed || waiting };
}

/** Lymi forgets the token and the books; the cards a pull added are ordinary cards and stay. */
export async function disconnectReadwise(ctx: ServiceContext): Promise<void> {
  const row = await connectionOf(ctx);
  if (!row) return;
  await ctx.db.batch([
    ctx.db.delete(schema.readwiseBooks).where(eq(schema.readwiseBooks.userId, ctx.userId)),
    ctx.db
      .delete(schema.readwiseConnections)
      .where(eq(schema.readwiseConnections.userId, ctx.userId)),
  ]);
  track(ctx.analytics, { name: "readwise_disconnected" });
}

export type PullResult = {
  outcome: "done" | "refused" | "limited" | "failed";
  highlights: number;
  cards: number;
  skipped: number;
  duplicates: number;
};

const sourceOf = (book: Pick<ReadwiseBook, "title" | "author">) =>
  (book.author ? `${book.title} · ${book.author}` : book.title).slice(0, CARD_LIMITS.source);

/** Reads pages of highlights updated after `since`, carrying on from `cursor`, up to the page cap. */
async function readPages(
  deps: ReadwiseDeps,
  token: string,
  input: { since: Date; cursor?: string | null; bookIds?: string[] },
) {
  const books: ReadwiseExportBook[] = [];
  let cursor = input.cursor ?? undefined;
  for (let page = 0; page < PAGES_PER_PULL; page++) {
    const read = await deps.api.exportPage(token, {
      updatedAfter: input.since,
      cursor,
      bookIds: input.bookIds,
    });
    books.push(...read.books);
    if (!read.cursor) return { books, cursor: null };
    cursor = read.cursor;
  }
  return { books, cursor: cursor ?? null };
}

const live = (book: ReadwiseExportBook) =>
  book.highlights.filter((h) => !h.is_deleted && !h.is_discard && h.text.trim());

async function pull(
  ctx: ServiceContext,
  deps: ReadwiseDeps,
  row: ReadwiseConnection,
  started: Date,
): Promise<{ result: PullResult; cursor: string | null }> {
  const token = await openToken(deps.secret, row.tokenCipher);
  if (!token) throw new ReadwiseRefused();
  const [read, changed] = await Promise.all([
    readPages(deps, token, { since: row.pulledThrough, cursor: row.pullCursor }),
    deps.api.books(token, row.pulledThrough),
  ]);

  const known = new Map(
    (
      await ctx.db
        .select()
        .from(schema.readwiseBooks)
        .where(eq(schema.readwiseBooks.userId, ctx.userId))
    ).map((b) => [b.bookId, b]),
  );
  // A book whose language could not be read before is read again with its new highlights.
  const unread = read.books.filter(
    (b) => !b.is_deleted && (known.get(b.user_book_id)?.language ?? null) === null,
  );
  const languages = await bookLanguages(
    deps,
    unread.map((b) => ({
      id: b.user_book_id,
      title: b.readable_title ?? b.title ?? "",
      texts: b.highlights.filter((h) => !h.is_deleted).map((h) => h.text),
    })),
  );
  const decks = await activeDecks(ctx, row.decks);
  const placed: ReadwiseBook[] = unread.flatMap((b) => {
    const language = languages.get(b.user_book_id) ?? null;
    const before = known.get(b.user_book_id);
    if (before && !language) return [];
    // A book newly known to be in a language the learner studies is followed without asking.
    const followed = Boolean(language && decks.get(languageKey(language)));
    return [
      {
        userId: ctx.userId,
        bookId: b.user_book_id,
        title: (b.readable_title ?? b.title ?? "").slice(0, CARD_LIMITS.source),
        author: b.author ?? null,
        language,
        followed,
        pending: followed,
        everFollowed: followed,
        highlights: before?.highlights ?? live(b).length,
        createdAt: before?.createdAt ?? started,
        updatedAt: started,
      },
    ];
  });
  for (const b of placed) known.set(b.bookId, b);

  // A book followed since the last pull brings every highlight since connecting, not just new ones.
  // A book without a live deck stays pending, so choosing a deck later still brings its highlights.
  const catching = [...known.values()]
    .filter((b) => b.pending && b.followed && decks.get(languageKey(b.language)))
    .map((b) => b.bookId);
  const caught = catching.length
    ? await readPages(deps, token, { since: row.createdAt, bookIds: catching })
    : { books: [], cursor: null };
  const books = [...read.books.filter((b) => !catching.includes(b.user_book_id)), ...caught.books];

  const highlights = books.flatMap((book) => {
    const followed = known.get(book.user_book_id);
    const deckId = followed?.followed ? decks.get(languageKey(followed.language)) : undefined;
    if (!followed || !deckId || book.is_deleted) return [];
    return live(book).map((h) => ({ highlight: h, book: followed, deckId }));
  });
  const externalIds = highlights.map((h) => `readwise:${h.highlight.id}`);
  const carded = new Set(
    (
      await selectIn(externalIds, (ids) =>
        ctx.db
          .select({ externalId: schema.cards.externalId })
          .from(schema.cards)
          .where(and(eq(schema.cards.userId, ctx.userId), inArray(schema.cards.externalId, ids))),
      )
    ).map((c) => c.externalId),
  );

  let skipped = 0;
  const inputs: ServerCardInput[] = [];
  for (const { highlight, book, deckId } of highlights) {
    const externalId = `readwise:${highlight.id}`;
    if (carded.has(externalId)) continue;
    const found = termOf(highlight);
    if (found.kind === "passage") {
      skipped += 1;
      continue;
    }
    inputs.push({
      deckId,
      term: found.term,
      ...(found.example ? { example: found.example, exampleSource: "lesson" as const } : {}),
      ...(found.notes ? { notes: found.notes, notesSource: "manual" as const } : {}),
      source: sourceOf(book),
      enrich: true,
      externalId,
    });
  }
  const outcomes = await addCards(ctx, inputs, deps.enrichment, { fromReadwise: true });

  const counted = changed.filter((b) => known.has(b.id) && b.num_highlights != null);
  const where = (bookId: string) =>
    and(eq(schema.readwiseBooks.userId, ctx.userId), eq(schema.readwiseBooks.bookId, bookId));
  await runInBatches(ctx.db, [
    ...placed.map((b) => [
      ctx.db
        .insert(schema.readwiseBooks)
        .values(b)
        .onConflictDoUpdate({
          target: [schema.readwiseBooks.userId, schema.readwiseBooks.bookId],
          set: {
            language: b.language,
            followed: b.followed,
            pending: b.pending,
            everFollowed: b.everFollowed,
            updatedAt: started,
          },
        }),
    ]),
    // A catch-up that stopped at the page cap stays pending and carries on next time.
    ...(caught.cursor
      ? []
      : catching.map((id) => [
          ctx.db.update(schema.readwiseBooks).set({ pending: false }).where(where(id)),
        ])),
    ...counted.map((b) => [
      ctx.db
        .update(schema.readwiseBooks)
        .set({ highlights: b.num_highlights ?? 0 })
        .where(where(b.id)),
    ]),
  ]);

  return {
    result: {
      outcome: "done",
      highlights: inputs.length + skipped,
      cards: outcomes.filter((o) => o.status === "added").length,
      skipped,
      duplicates: outcomes.filter((o) => o.status === "skipped").length,
    },
    cursor: read.cursor,
  };
}

/** Each language's chosen deck, kept only while it is still one of the learner's own. */
async function activeDecks(ctx: ServiceContext, chosen: Record<string, string>) {
  const learned = await learnedLanguages(ctx);
  return new Map(
    Object.entries(chosen).filter(([language, deckId]) => learned.get(language)?.includes(deckId)),
  );
}

/** Runs one pull and records how it went; Readwise's refusal or rate limit is an outcome, not a throw. */
async function runPull(
  ctx: ServiceContext,
  deps: ReadwiseDeps,
  trigger: "schedule" | "manual",
): Promise<PullResult | null> {
  const started = new Date();
  const [row] = await ctx.db
    .update(schema.readwiseConnections)
    .set({ pullingUntil: new Date(started.getTime() + LEASE) })
    .where(
      and(
        eq(schema.readwiseConnections.userId, ctx.userId),
        or(
          isNull(schema.readwiseConnections.pullingUntil),
          lt(schema.readwiseConnections.pullingUntil, started),
        ),
      ),
    )
    .returning();
  // Another pull holds the connection; whatever this one would read, that one reads.
  if (!row) return null;
  const write = (values: Partial<ReadwiseConnection>) =>
    ctx.db
      .update(schema.readwiseConnections)
      .set({ ...values, pullingUntil: null, updatedAt: new Date() })
      .where(eq(schema.readwiseConnections.userId, ctx.userId));
  let result: PullResult;
  try {
    const read = await pull(readwiseContext(ctx), deps, row, started);
    result = read.result;
    // A pull stopped at the page cap leaves its cursor; the time moves once the reading is done.
    const from = row.pullCursorFrom ?? started;
    await write({
      pulledThrough: read.cursor ? row.pulledThrough : new Date(from.getTime() - OVERLAP),
      pullCursor: read.cursor,
      pullCursorFrom: read.cursor ? from : null,
      nextPullAt: new Date(started.getTime() + HOUR),
      lastPullAt: started,
      lastPullHighlights: result.highlights,
      lastPullCards: result.cards,
      lastPullSkipped: result.skipped,
    });
  } catch (error) {
    const none = { highlights: 0, cards: 0, skipped: 0, duplicates: 0 };
    if (error instanceof ReadwiseRefused) {
      result = { outcome: "refused", ...none };
      await write({ status: "refused" });
    } else if (error instanceof ReadwiseLimited) {
      result = { outcome: "limited", ...none };
      await write({ nextPullAt: new Date(started.getTime() + error.retryAfter * 1000) });
    } else {
      track(ctx.analytics, { name: "readwise_pulled", trigger, outcome: "failed", ...none });
      // A cursor Readwise no longer knows would fail every pull; start again from `pulledThrough`.
      await write({
        nextPullAt: new Date(started.getTime() + HOUR),
        pullCursor: null,
        pullCursorFrom: null,
      });
      throw error;
    }
  }
  track(ctx.analytics, { name: "readwise_pulled", trigger, ...result });
  return result;
}

/**
 * Pull now, from Settings, or right after a book is followed. A second press within half a minute
 * only reads the result back; a newly followed book does not wait for that.
 */
export async function pullReadwiseNow(
  ctx: ServiceContext,
  deps: ReadwiseDeps,
  { followed = false }: { followed?: boolean } = {},
): Promise<ReadwiseView> {
  const row = await connectionOf(ctx);
  if (!row) throw new ServiceError("not_found", "Readwise is not connected");
  const recent = row.lastPullAt && Date.now() - row.lastPullAt.getTime() < MANUAL_PULL_GAP;
  if (row.status === "active" && (followed || !recent)) {
    try {
      await runPull(ctx, deps, "manual");
    } catch {
      throw new ServiceError("unavailable", "Readwise didn't answer. Try again in a minute.");
    }
  }
  const view = await getReadwise(ctx);
  if (!view) throw new Error("The Readwise connection disappeared");
  return view;
}

/**
 * The cron's share: every connection due for its hourly pull, each claimed first so a slow run and
 * the next tick never pull the same learner twice. One learner's failure leaves the others alone.
 */
export async function pullDueReadwise(
  db: ServiceContext["db"],
  forLearner: (userId: string) => {
    deps: ReadwiseDeps;
    analytics: ServiceContext["analytics"];
  },
  at: Date,
): Promise<{ pulled: number; failed: number }> {
  const due = await db
    .select()
    .from(schema.readwiseConnections)
    .where(
      and(
        eq(schema.readwiseConnections.status, "active"),
        lte(schema.readwiseConnections.nextPullAt, at),
      ),
    )
    .limit(PULLS_PER_RUN);
  let pulled = 0;
  let failed = 0;
  for (const row of due) {
    const claim = await db
      .update(schema.readwiseConnections)
      .set({ nextPullAt: new Date(at.getTime() + HOUR) })
      .where(
        and(
          eq(schema.readwiseConnections.userId, row.userId),
          eq(schema.readwiseConnections.nextPullAt, row.nextPullAt),
        ),
      )
      .returning({ userId: schema.readwiseConnections.userId });
    if (claim.length === 0) continue;
    const { deps, analytics } = forLearner(row.userId);
    const ctx: ServiceContext = { db, userId: row.userId, actor: "system", analytics };
    try {
      if (await runPull(ctx, deps, "schedule")) pulled += 1;
    } catch (error) {
      failed += 1;
      console.error(JSON.stringify({ job: "readwise", userId: row.userId, error: String(error) }));
    }
  }
  return { pulled, failed };
}

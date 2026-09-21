import {
  type CardFilter,
  type CardSearchInput,
  type CardSortField,
  type DateComparator,
  type IdComparator,
  modeOf,
  modeOfStateDirection,
  type NumberComparator,
  normaliseTerm,
  REVIEW_MODE_KEYS,
  type ReviewMode,
  type ReviewModeKey,
  resolveDateValue,
  SLIPPING_LAPSES,
  SLIPPING_REVIEWS,
  type StringComparator,
} from "@lymi/core";
import {
  and,
  count,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  or,
  type SQL,
  type SQLWrapper,
  sql,
} from "@lymi/core/db";
import { notesToText } from "@lymi/core/notes";
import type { Card } from "@lymi/core/schema";
import { schema } from "../db";
import { selectIn } from "./batch";
import { type CardView, editionText, inEdition, presentCards } from "./card-view";
import { foldForSearch, matchesSearch } from "./cards";
import { type ServiceContext, ServiceError } from "./context";
import { memberOf } from "./members";
import { askedSql } from "./modes";
import { countedReviewsWhere, lapsesSql, reviewCountSql, slippingHaving } from "./slipping";

export const SEARCH_LIMIT = 200;
/** The most rows one search reads before matching text in memory. */
export const SEARCH_SCAN_LIMIT = 5000;

/** The learner's own record of one card, overall or in one review mode. */
export type ReviewRecord = {
  reviewCount: number;
  lapses: number;
  lastRating: number | null;
  lastReviewedAt: Date | null;
  dueAt: Date | null;
  slipping: boolean;
};
export type CardReviewStats = ReviewRecord & { modes: (ReviewRecord & { mode: ReviewMode })[] };

export type CardSearchHit = { card: CardView; deckName: string; stats?: CardReviewStats };

/** One page of a search: the cards, where the next page starts, and how many match in all. */
export type CardSearchPage = { cards: CardSearchHit[]; next: string | null; total: number };

type TextField = "meaning" | "example" | "pronunciation" | "notes" | "source";
type ScanRow = Pick<Card, "id" | "deckId" | "normalizedTerm" | "tags" | TextField>;
type Check = (row: ScanRow) => boolean;
type SortKey = { field: CardSortField; direction: "asc" | "desc"; expr: SQL };

/**
 * Cards matching a search, a page at a time, each with the name of the deck it is in.
 *
 * Every filter field compiles to SQL except text comparisons on the meaning, example,
 * pronunciation, notes, source and tags: SQLite's `lower()` and LIKE fold ASCII only, so those
 * are folded with the duplicate-key rule and matched in memory, as the free-text query is. The
 * term compares in SQL against its stored folded key. When anything matches in memory, the
 * search scans at most SEARCH_SCAN_LIMIT rows from the cursor, a page can come back short with
 * a `next` that carries the scan on, and `total` counts matches among the first
 * SEARCH_SCAN_LIMIT rows. Otherwise both are exact.
 *
 * Review counts come from one aggregate over the learner's own accepted grades, joined once:
 * never another member's, never an undone grade, and only since `filter.reviews.since` and in
 * `filter.reviews.mode` when given. Stats and the review sorts count the same reviews.
 *
 * Active means the card and its deck are both unarchived. `archived` returns only cards archived
 * on their own, in a deck that is still active, because those are the ones restore brings back.
 */
export async function searchCards(
  ctx: ServiceContext,
  search: CardSearchInput,
): Promise<CardSearchPage> {
  const { db, userId } = ctx;
  const now = new Date();
  const limit = Math.min(Math.max(search.limit ?? 50, 1), SEARCH_LIMIT);
  const needle = foldForSearch(search.query ?? "");
  const filter = withShorthands(search);
  const window = {
    since: filter.reviews?.since ? resolveDateValue(filter.reviews.since, now) : null,
    mode: filter.reviews?.mode ?? null,
  };

  const scope = and(
    memberOf(userId),
    search.archived
      ? and(isNotNull(schema.cards.archivedAt), isNull(schema.decks.archivedAt))
      : and(isNull(schema.cards.archivedAt), isNull(schema.decks.archivedAt)),
  );

  const reviewStats = db
    .select({
      cardId: schema.reviews.cardId,
      reviewCount: reviewCountSql.as("review_count"),
      lapses: lapsesSql.as("lapses"),
      // The latest grade rides in the low bits, so one aggregate yields both when and what.
      lastKey: sql<number>`max(${schema.reviews.reviewedAt} * 8 + ${schema.reviews.rating})`.as(
        "last_key",
      ),
      slipping: sql<number>`case when ${slippingHaving} then 1 else 0 end`.as("slipping"),
    })
    .from(schema.reviews)
    .innerJoin(schema.cards, eq(schema.cards.id, schema.reviews.cardId))
    .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
    .leftJoin(schema.reviewUndos, eq(schema.reviewUndos.reviewId, schema.reviews.id))
    .where(and(countedReviewsWhere(userId), scope, windowWhere(window)))
    .groupBy(schema.reviews.cardId)
    .as("review_stats");
  const cardDue = db
    .select({
      cardId: schema.cardStates.cardId,
      dueAt: sql<number>`min(${schema.cardStates.due})`.as("due_at"),
    })
    .from(schema.cardStates)
    .innerJoin(schema.cards, eq(schema.cards.id, schema.cardStates.cardId))
    .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
    .where(and(eq(schema.cardStates.userId, userId), scope, sql.raw(askedSql())))
    .groupBy(schema.cardStates.cardId)
    .as("card_due");

  let usesReviews = false;
  let usesDue = false;
  const reviewCount = sql`coalesce(${reviewStats.reviewCount}, 0)`;
  const lapses = sql`coalesce(${reviewStats.lapses}, 0)`;
  const review = {
    count: reviewCount,
    lapses,
    lapseRate: sql`(case when ${reviewCount} > 0 then ${lapses} * 1.0 / ${reviewCount} end)`,
    lastRating: sql`(${reviewStats.lastKey} % 8)`,
    lastReviewedAt: sql`(${reviewStats.lastKey} / 8)`,
    slipping: sql`coalesce(${reviewStats.slipping}, 0)`,
  };
  const reviewExpr = (name: keyof typeof review) => {
    usesReviews = true;
    return review[name];
  };
  const dueExpr = () => {
    usesDue = true;
    return sql`${cardDue.dueAt}`;
  };

  // Compile the filter: SQL where it can run in SQL, a check in memory where it cannot.
  const where: SQL[] = [];
  const checks: Check[] = [];
  const at = (value: string) => resolveDateValue(value, now).getTime();
  if (filter.deckId) where.push(...idConditions(schema.cards.deckId, filter.deckId));
  if (filter.sectionId) where.push(...idConditions(schema.cards.sectionId, filter.sectionId));
  if (filter.language) where.push(...idConditions(schema.cards.language, filter.language));
  if (filter.term) where.push(...termConditions(filter.term));
  for (const field of ["meaning", "example", "pronunciation", "notes", "source"] as const) {
    const comparator = filter[field];
    if (!comparator) continue;
    const { null: empty, ...rest } = comparator;
    if (empty !== undefined) where.push(blank(schema.cards[field], empty));
    const test = stringTest(rest);
    if (test) {
      const read = field === "notes" ? (text: string) => notesToText(text) : (text: string) => text;
      checks.push((row) => test(foldForSearch(read(row[field] ?? ""))));
    }
  }
  if (filter.tags) {
    const { some, every } = filter.tags;
    const someTest = some && stringTest(some);
    const everyTest = every && stringTest(every);
    checks.push((row) => {
      const tags = row.tags.map(foldForSearch);
      return (
        (!someTest || tags.some(someTest)) && (!everyTest || tags.every((tag) => everyTest(tag)))
      );
    });
  }
  for (const field of ["meaningSource", "exampleSource", "pronunciationSource"] as const) {
    const comparator = filter[field];
    if (comparator) where.push(...idConditions(schema.cards[field], comparator));
  }
  if (filter.enrichmentStatus) {
    where.push(...idConditions(schema.cards.enrichmentStatus, filter.enrichmentStatus));
  }
  if (filter.createdAt)
    where.push(...dateConditions(sql`${schema.cards.createdAt}`, filter.createdAt, at));
  if (filter.updatedAt)
    where.push(...dateConditions(sql`${schema.cards.updatedAt}`, filter.updatedAt, at));
  if (filter.dueAt) where.push(...dateConditions(dueExpr(), filter.dueAt, at));
  if (filter.reviews) {
    const {
      count: counted,
      lapses: lapsed,
      lapseRate,
      lastRating,
      lastReviewedAt,
      slipping,
    } = filter.reviews;
    if (counted) where.push(...numberConditions(reviewExpr("count"), counted));
    if (lapsed) where.push(...numberConditions(reviewExpr("lapses"), lapsed));
    if (lapseRate) where.push(...numberConditions(reviewExpr("lapseRate"), lapseRate));
    if (lastRating) where.push(...numberConditions(reviewExpr("lastRating"), lastRating));
    if (lastReviewedAt) {
      where.push(...dateConditions(reviewExpr("lastReviewedAt"), lastReviewedAt, at));
    }
    if (slipping) where.push(sql`${reviewExpr("slipping")} = ${slipping.eq ? 1 : 0}`);
  }

  const sortExpr: Record<CardSortField, () => SQL> = {
    createdAt: () => sql`${schema.cards.createdAt}`,
    archivedAt: () => sql`${schema.cards.archivedAt}`,
    term: () => sql`${schema.cards.normalizedTerm}`,
    lapses: () => reviewExpr("lapses"),
    lapseRate: () => reviewExpr("lapseRate"),
    lastReviewedAt: () => reviewExpr("lastReviewedAt"),
    dueAt: dueExpr,
  };
  const sort: SortKey[] = (
    search.sort ?? [{ field: search.archived ? "archivedAt" : "createdAt", direction: "desc" }]
  ).map((key) => ({ ...key, expr: sortExpr[key.field]() }));
  const signature = sort.map((key) => `${key.field}:${key.direction}`).join(",");
  const cursor = decodeCursor(search.after, signature, sort.length);
  const idDirection = sort[0]?.direction ?? "desc";
  const orderBy = [
    ...sort.map((key) => sql`${key.expr} ${sql.raw(key.direction)} nulls last`),
    sql`${schema.cards.id} ${sql.raw(idDirection)}`,
  ];
  // Up to three sort keys, selected raw so the cursor carries exactly what SQL compares.
  const sortValue = (index: number) => sql<CursorValue>`${sort[index]?.expr ?? sql`null`}`;
  const sortValues = { s0: sortValue(0), s1: sortValue(1), s2: sortValue(2) };
  const fromCursor = cursor ? afterCursor(sort, cursor, idDirection) : undefined;
  const matching = and(scope, ...where);
  const next = (values: Record<"s0" | "s1" | "s2", CursorValue>, id: string) =>
    encodeCursor(signature, [values.s0, values.s1, values.s2].slice(0, sort.length), id);

  const deckOf = eq(schema.decks.id, schema.cards.deckId);
  // A dynamic query's joins add to it in place, so the selection keeps its type.
  const joined = <T extends object>(query: T): T => {
    const from = query as unknown as { leftJoin: (table: unknown, on: SQL) => unknown };
    if (usesReviews) from.leftJoin(reviewStats, eq(reviewStats.cardId, schema.cards.id));
    if (usesDue) from.leftJoin(cardDue, eq(cardDue.cardId, schema.cards.id));
    return query;
  };

  const present = async (rows: { card: Card; deckName: string }[]) => {
    const [cards, stats] = await Promise.all([
      presentCards(
        db,
        rows.map((row) => row.card),
        userId,
      ),
      search.stats
        ? reviewStatsFor(
            ctx,
            rows.map((row) => row.card.id),
            window,
          )
        : undefined,
    ]);
    return rows.map((row, index) => ({
      card: cards[index] as CardView,
      deckName: row.deckName,
      ...(stats ? { stats: stats.get(row.card.id) ?? emptyStats() } : {}),
    }));
  };

  if (!needle && checks.length === 0) {
    const [rows, counted] = await Promise.all([
      joined(
        db
          .select({ card: schema.cards, deckName: schema.decks.name, ...sortValues })
          .from(schema.cards)
          .innerJoin(schema.decks, deckOf)
          .$dynamic(),
      )
        .where(and(matching, fromCursor))
        .orderBy(...orderBy)
        .limit(limit + 1),
      joined(
        db.select({ total: count() }).from(schema.cards).innerJoin(schema.decks, deckOf).$dynamic(),
      ).where(matching),
    ]);
    const page = rows.slice(0, limit);
    const last = page.at(-1);
    return {
      cards: await present(page),
      next: rows.length > limit && last ? next(last, last.card.id) : null,
      total: counted[0]?.total ?? 0,
    };
  }

  // Only the fields the in-memory match reads, so a scan of thousands of rows stays small.
  const scan = (condition: SQL | undefined) =>
    joined(
      db
        .select({
          id: schema.cards.id,
          deckId: schema.cards.deckId,
          normalizedTerm: schema.cards.normalizedTerm,
          meaning: schema.cards.meaning,
          example: schema.cards.example,
          pronunciation: schema.cards.pronunciation,
          notes: schema.cards.notes,
          source: schema.cards.source,
          tags: schema.cards.tags,
          ...sortValues,
        })
        .from(schema.cards)
        .innerJoin(schema.decks, deckOf)
        .$dynamic(),
    )
      .where(condition)
      .orderBy(...orderBy)
      .limit(SEARCH_SCAN_LIMIT + 1);
  const passing = async (rows: Awaited<ReturnType<typeof scan>>) => {
    const read = rows.slice(0, SEARCH_SCAN_LIMIT);
    // The free text matches the edition the learner reads the deck in, the words on their screen.
    const editions = needle ? await editionText(db, userId, read) : new Map();
    return read.filter(
      (row) =>
        checks.every((check) => check(row)) &&
        (!needle || matchesSearch(inEdition(row, editions.get(row.id)), needle)),
    );
  };

  const [scanned, fromStart] = await Promise.all([
    scan(and(matching, fromCursor)),
    cursor ? scan(matching) : undefined,
  ]);
  const [found, all] = await Promise.all([
    passing(scanned),
    fromStart ? passing(fromStart) : undefined,
  ]);
  const hits = found.slice(0, limit);
  const lastHit = hits.at(-1);
  const lastRead = scanned.at(SEARCH_SCAN_LIMIT - 1);
  const nextCursor =
    found.length > limit && lastHit
      ? next(lastHit, lastHit.id)
      : scanned.length > SEARCH_SCAN_LIMIT && lastRead
        ? next(lastRead, lastRead.id)
        : null;

  const order = new Map(hits.map((hit, index) => [hit.id, index]));
  const rows = await selectIn(
    hits.map((hit) => hit.id),
    (ids) =>
      db
        .select({ card: schema.cards, deckName: schema.decks.name })
        .from(schema.cards)
        .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
        .where(inArray(schema.cards.id, ids)),
  );
  rows.sort((a, b) => (order.get(a.card.id) ?? 0) - (order.get(b.card.id) ?? 0));
  return { cards: await present(rows), next: nextCursor, total: (all ?? found).length };
}

/** The flat shorthands, which the query string and older callers use, as filter fields. */
function withShorthands(search: CardSearchInput): CardFilter {
  const filter: CardFilter = { ...search.filter };
  const also = (key: "deckId" | "sectionId" | "language", value: string | undefined) => {
    if (value === undefined) return;
    if (filter[key]) {
      throw new ServiceError("invalid", `Give ${key} once, as a shorthand or in filter.`);
    }
    filter[key] = { eq: value };
  };
  also("deckId", search.deckId);
  also("sectionId", search.sectionId);
  also("language", search.language);
  if (search.term !== undefined) {
    if (filter.term)
      throw new ServiceError("invalid", "Give term once, as a shorthand or in filter.");
    filter.term = { eq: search.term };
  }
  return filter;
}

type Window = { since: Date | null; mode: ReviewModeKey | null };

const reviewModeKey = sql`coalesce(${schema.reviews.mode}, case ${schema.reviews.direction} when 'recognition' then 'term_to_meaning' when 'production' then 'meaning_to_term' else ${schema.reviews.direction} end)`;

function windowWhere(window: Window, { mode = true } = {}) {
  return and(
    window.since ? gte(schema.reviews.reviewedAt, window.since) : undefined,
    mode && window.mode ? sql`${reviewModeKey} = ${window.mode}` : undefined,
  );
}

const inList = (values: readonly unknown[]) =>
  sql`(select value from json_each(${JSON.stringify(values)}))`;

/** A comparator on an id, a language tag or an enum. `neq` and `nin` keep cards with none. */
function idConditions(column: SQLWrapper, comparator: IdComparator): SQL[] {
  const out: SQL[] = [];
  if (comparator.eq !== undefined) out.push(sql`${column} = ${comparator.eq}`);
  if (comparator.neq !== undefined) {
    out.push(sql`(${column} is null or ${column} <> ${comparator.neq})`);
  }
  if (comparator.in) out.push(sql`${column} in ${inList(comparator.in)}`);
  if (comparator.nin)
    out.push(sql`(${column} is null or ${column} not in ${inList(comparator.nin)})`);
  if (comparator.null !== undefined) {
    out.push(comparator.null ? sql`${column} is null` : sql`${column} is not null`);
  }
  return out;
}

/** The term compares its stored folded key, so it runs in SQL and `eq` is the duplicate rule. */
function termConditions(comparator: StringComparator): SQL[] {
  const key = schema.cards.normalizedTerm;
  const fold = normaliseTerm;
  const out: SQL[] = [];
  if (comparator.eq !== undefined) out.push(sql`${key} = ${fold(comparator.eq)}`);
  if (comparator.neq !== undefined) out.push(sql`${key} <> ${fold(comparator.neq)}`);
  if (comparator.in) out.push(sql`${key} in ${inList(comparator.in.map(fold))}`);
  if (comparator.nin) out.push(sql`${key} not in ${inList(comparator.nin.map(fold))}`);
  if (comparator.contains !== undefined) {
    out.push(sql`instr(${key}, ${fold(comparator.contains)}) > 0`);
  }
  if (comparator.notContains !== undefined) {
    const part = fold(comparator.notContains);
    out.push(part ? sql`instr(${key}, ${part}) = 0` : sql`0`);
  }
  if (comparator.startsWith !== undefined) {
    const part = fold(comparator.startsWith);
    out.push(sql`substr(${key}, 1, length(${part})) = ${part}`);
  }
  if (comparator.endsWith !== undefined) {
    const part = fold(comparator.endsWith);
    out.push(part ? sql`substr(${key}, -length(${part})) = ${part}` : sql`1`);
  }
  if (comparator.null !== undefined)
    out.push(comparator.null ? sql`${key} = ''` : sql`${key} <> ''`);
  return out;
}

/** Empty means null or only whitespace. */
function blank(column: SQLWrapper, empty: boolean): SQL {
  const trimmed = sql`trim(coalesce(${column}, ''), ' ' || char(9) || char(10) || char(13))`;
  return empty ? sql`${trimmed} = ''` : sql`${trimmed} <> ''`;
}

/** The comparisons besides `null`, on text already folded. Undefined when there are none. */
function stringTest(
  comparator: Omit<StringComparator, "null"> & { null?: boolean | undefined },
): ((text: string) => boolean) | undefined {
  const tests: ((text: string) => boolean)[] = [];
  const fold = foldForSearch;
  if (comparator.eq !== undefined) {
    const value = fold(comparator.eq);
    tests.push((text) => text === value);
  }
  if (comparator.neq !== undefined) {
    const value = fold(comparator.neq);
    tests.push((text) => text !== value);
  }
  if (comparator.in) {
    const values = new Set(comparator.in.map(fold));
    tests.push((text) => values.has(text));
  }
  if (comparator.nin) {
    const values = new Set(comparator.nin.map(fold));
    tests.push((text) => !values.has(text));
  }
  if (comparator.contains !== undefined) {
    const value = fold(comparator.contains);
    tests.push((text) => text.includes(value));
  }
  if (comparator.notContains !== undefined) {
    const value = fold(comparator.notContains);
    tests.push((text) => !text.includes(value));
  }
  if (comparator.startsWith !== undefined) {
    const value = fold(comparator.startsWith);
    tests.push((text) => text.startsWith(value));
  }
  if (comparator.endsWith !== undefined) {
    const value = fold(comparator.endsWith);
    tests.push((text) => text.endsWith(value));
  }
  if (comparator.null !== undefined) {
    const empty = comparator.null;
    tests.push((text) => (text === "") === empty);
  }
  return tests.length > 0 ? (text) => tests.every((test) => test(text)) : undefined;
}

function numberConditions(expr: SQL, comparator: NumberComparator): SQL[] {
  const out: SQL[] = [];
  if (comparator.eq !== undefined) out.push(sql`${expr} = ${comparator.eq}`);
  if (comparator.neq !== undefined)
    out.push(sql`(${expr} is null or ${expr} <> ${comparator.neq})`);
  if (comparator.lt !== undefined) out.push(sql`${expr} < ${comparator.lt}`);
  if (comparator.lte !== undefined) out.push(sql`${expr} <= ${comparator.lte}`);
  if (comparator.gt !== undefined) out.push(sql`${expr} > ${comparator.gt}`);
  if (comparator.gte !== undefined) out.push(sql`${expr} >= ${comparator.gte}`);
  if (comparator.in) out.push(sql`${expr} in ${inList(comparator.in)}`);
  if (comparator.nin) out.push(sql`(${expr} is null or ${expr} not in ${inList(comparator.nin)})`);
  return out;
}

function dateConditions(
  expr: SQL,
  comparator: DateComparator,
  at: (value: string) => number,
): SQL[] {
  const out: SQL[] = [];
  if (comparator.eq !== undefined) out.push(sql`${expr} = ${at(comparator.eq)}`);
  if (comparator.lt !== undefined) out.push(sql`${expr} < ${at(comparator.lt)}`);
  if (comparator.lte !== undefined) out.push(sql`${expr} <= ${at(comparator.lte)}`);
  if (comparator.gt !== undefined) out.push(sql`${expr} > ${at(comparator.gt)}`);
  if (comparator.gte !== undefined) out.push(sql`${expr} >= ${at(comparator.gte)}`);
  if (comparator.null !== undefined) {
    out.push(comparator.null ? sql`${expr} is null` : sql`${expr} is not null`);
  }
  return out;
}

type CursorValue = number | string | null;

/** Opaque to callers: the sort it belongs to, the sort values of the last card, and its id. */
function encodeCursor(signature: string, values: CursorValue[], id: string): string {
  const bytes = new TextEncoder().encode(JSON.stringify([signature, values, id]));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeCursor(
  cursor: string | undefined,
  signature: string,
  keys: number,
): { values: CursorValue[]; id: string } | null {
  if (!cursor) return null;
  const invalid = () =>
    new ServiceError("invalid", "Pass the `next` value from the previous page as `after`.");
  let parsed: unknown;
  try {
    const binary = atob(cursor.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw invalid();
  }
  if (!Array.isArray(parsed) || parsed.length !== 3) throw invalid();
  const [sorted, values, id] = parsed as [unknown, unknown, unknown];
  if (typeof sorted !== "string" || typeof id !== "string" || !Array.isArray(values)) {
    throw invalid();
  }
  if (sorted !== signature) {
    throw new ServiceError(
      "invalid",
      "This `after` came from a search with a different sort. Page with the sort it came from.",
    );
  }
  if (
    values.length !== keys ||
    !values.every((v) => v === null || typeof v === "number" || typeof v === "string")
  ) {
    throw invalid();
  }
  return { values: values as CursorValue[], id };
}

/** Rows after the cursor in the sort's order, where a missing value sorts last either way. */
function afterCursor(
  sort: SortKey[],
  cursor: { values: CursorValue[]; id: string },
  idDirection: "asc" | "desc",
): SQL | undefined {
  const branches: (SQL | undefined)[] = [];
  const same: SQL[] = [];
  sort.forEach((key, index) => {
    const value = cursor.values[index] ?? null;
    if (value !== null) {
      const beyond = key.direction === "desc" ? sql`<` : sql`>`;
      branches.push(and(...same, sql`(${key.expr} ${beyond} ${value} or ${key.expr} is null)`));
      same.push(sql`${key.expr} = ${value}`);
    } else {
      same.push(sql`${key.expr} is null`);
    }
  });
  const beyondId = idDirection === "desc" ? sql`<` : sql`>`;
  branches.push(and(...same, sql`${schema.cards.id} ${beyondId} ${cursor.id}`));
  return or(...branches);
}

type Tally = { reviewCount: number; lapses: number; lastKey: number | null; dueAt: number | null };

function record({ reviewCount, lapses, lastKey, dueAt }: Tally): ReviewRecord {
  return {
    reviewCount,
    lapses,
    lastRating: lastKey === null ? null : lastKey % 8,
    lastReviewedAt: lastKey === null ? null : new Date(Math.floor(lastKey / 8)),
    dueAt: dueAt === null ? null : new Date(dueAt),
    slipping: lapses >= SLIPPING_LAPSES && reviewCount >= SLIPPING_REVIEWS,
  };
}

function emptyStats(): CardReviewStats {
  return { ...record({ reviewCount: 0, lapses: 0, lastKey: null, dueAt: null }), modes: [] };
}

/**
 * The review record of each card on a page, per mode and overall, in two queries for the page.
 * The breakdown counts every mode since the window's start; the overall record counts the
 * window's mode only, when it names one, so it agrees with the filter and the sort.
 */
async function reviewStatsFor(
  { db, userId }: ServiceContext,
  cardIds: string[],
  window: Window,
): Promise<Map<string, CardReviewStats>> {
  const [graded, states] = await Promise.all([
    selectIn(cardIds, (ids) =>
      db
        .select({
          cardId: schema.reviews.cardId,
          mode: sql<string>`${reviewModeKey}`,
          reviewCount: reviewCountSql,
          lapses: lapsesSql,
          lastKey: sql<number>`max(${schema.reviews.reviewedAt} * 8 + ${schema.reviews.rating})`,
        })
        .from(schema.reviews)
        .leftJoin(schema.reviewUndos, eq(schema.reviewUndos.reviewId, schema.reviews.id))
        .where(
          and(
            countedReviewsWhere(userId),
            inArray(schema.reviews.cardId, ids),
            windowWhere(window, { mode: false }),
          ),
        )
        .groupBy(schema.reviews.cardId, reviewModeKey),
    ),
    selectIn(cardIds, (ids) =>
      db
        .select({
          cardId: schema.cardStates.cardId,
          mode: schema.cardStates.mode,
          direction: schema.cardStates.direction,
          due: sql<number>`${schema.cardStates.due}`,
        })
        .from(schema.cardStates)
        .innerJoin(schema.cards, eq(schema.cards.id, schema.cardStates.cardId))
        .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
        .where(
          and(
            eq(schema.cardStates.userId, userId),
            inArray(schema.cardStates.cardId, ids),
            sql.raw(askedSql()),
          ),
        ),
    ),
  ]);

  const tallies = new Map<string, Map<ReviewModeKey, Tally>>();
  const tally = (cardId: string, mode: ReviewModeKey) => {
    const modes = tallies.get(cardId) ?? new Map<ReviewModeKey, Tally>();
    tallies.set(cardId, modes);
    const entry = modes.get(mode) ?? { reviewCount: 0, lapses: 0, lastKey: null, dueAt: null };
    modes.set(mode, entry);
    return entry;
  };
  for (const row of graded) {
    const entry = tally(row.cardId, row.mode as ReviewModeKey);
    entry.reviewCount = Number(row.reviewCount);
    entry.lapses = Number(row.lapses ?? 0);
    entry.lastKey = row.lastKey === null ? null : Number(row.lastKey);
  }
  for (const row of states) {
    const mode = row.mode ?? modeOfStateDirection(row.direction);
    tally(row.cardId, mode).dueAt = Number(row.due);
  }

  const out = new Map<string, CardReviewStats>();
  for (const [cardId, modes] of tallies) {
    const ordered = REVIEW_MODE_KEYS.flatMap((key) => {
      const entry = modes.get(key);
      return entry ? [{ key, entry }] : [];
    });
    const counted = ordered.filter(({ key }) => !window.mode || key === window.mode);
    const overall = counted.reduce<Tally>(
      (sum, { entry }) => ({
        reviewCount: sum.reviewCount + entry.reviewCount,
        lapses: sum.lapses + entry.lapses,
        lastKey: max(sum.lastKey, entry.lastKey),
        dueAt: min(sum.dueAt, entry.dueAt),
      }),
      { reviewCount: 0, lapses: 0, lastKey: null, dueAt: null },
    );
    out.set(cardId, {
      ...record(overall),
      modes: ordered.map(({ key, entry }) => ({ mode: modeOf(key), ...record(entry) })),
    });
  }
  return out;
}

const max = (a: number | null, b: number | null) =>
  a === null ? b : b === null ? a : Math.max(a, b);
const min = (a: number | null, b: number | null) =>
  a === null ? b : b === null ? a : Math.min(a, b);

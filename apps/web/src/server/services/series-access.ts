import { and, eq, sql } from "@lymi/core/db";
import { schema } from "../db";
import { notFound, type ServiceContext } from "./context";

/** The caller's own series, active or archived. A member or stranger gets not found. */
export async function ownedSeries({ db, userId }: ServiceContext, id: string) {
  const [row] = await db
    .select()
    .from(schema.series)
    .where(and(eq(schema.series.id, id), eq(schema.series.userId, userId)));
  if (!row) throw notFound("Series");
  return row;
}

/** The caller's own active series; an archived one is not found, since nothing can be put in it. */
export async function activeSeries(ctx: ServiceContext, id: string) {
  const row = await ownedSeries(ctx, id);
  if (row.archivedAt) throw notFound("Series");
  return row;
}

/**
 * The effective series of a deck row: the owner's active series, or null for a member and while
 * the series is archived. Every deck read uses this, so a member never learns a series exists.
 */
export function effectiveSeriesId(userId: string) {
  return sql<string | null>`(
    select series.id from series
    where series.id = decks.series_id and series.user_id = ${userId}
      and decks.user_id = ${userId} and series.archived_at is null
  )`;
}

/**
 * Where a deck sorts: its place in the caller's active series, or 0 for every other deck, which
 * Library then orders by creation date as it did before series existed.
 */
export function deckOrder(userId: string) {
  return sql<number>`case when ${effectiveSeriesId(userId)} is null then 0 else decks.position end`;
}

/** The place after the last deck in a series. */
export async function nextDeckPosition({ db, userId }: ServiceContext, seriesId: string) {
  const [row] = await db
    .select({ next: sql<number>`coalesce(max(${schema.decks.position}), -1) + 1` })
    .from(schema.decks)
    .where(and(eq(schema.decks.userId, userId), eq(schema.decks.seriesId, seriesId)));
  return row?.next ?? 0;
}

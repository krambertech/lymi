import type { Directions, Rating, ReviewModeKey } from "@lymi/core";
import {
  drawableCount as countDrawable,
  type DayWindow,
  type DrawCard,
  type DrawLogEntry,
  type DrawMode,
  dayWindow,
  deserializeState,
  drawKey,
  effectiveModes,
  isImageMode,
  retrievability,
} from "@lymi/core";
import {
  alias,
  and,
  asc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  ne,
  or,
  sql,
} from "@lymi/core/db";
import type { Card } from "@lymi/core/schema";
import { schema } from "../db";
import type { ServiceContext } from "./context";
import { memberOf } from "./members";
import { askedSql, stateMode } from "./modes";
import { waitingCardsSql } from "./sections";
import { slippingCardIds } from "./slipping";

/**
 * What `draw` in core needs, loaded from D1: every mode that could be reviewed today and
 * today's log in every scope. Rules live in core; this file only gathers rows. ADR 0019.
 */

/**
 * The order a card's modes are introduced in. A list the learner ordered is kept; a list that
 * only the legacy `directions` gives starts with meaning → term, which teaches more (ADR 0019).
 */
const TEXT_DEFAULT: readonly ReviewModeKey[] = ["meaning_to_term", "term_to_meaning"];
function modeOrder(
  card: { directions: Directions | null; reviewModeKeys: ReviewModeKey[] | null },
  deckDirections: Directions,
): ReviewModeKey[] {
  if (card.directions && card.reviewModeKeys) {
    return effectiveModes(card.directions, card.reviewModeKeys);
  }
  const directions = card.directions ?? deckDirections;
  if (directions === "both") return [...TEXT_DEFAULT];
  return [directions === "recognition" ? "term_to_meaning" : "meaning_to_term"];
}

/** Cards of the caller's own decks in their active series; a member's copy of a deck never matches. */
function inSeries(userId: string, seriesId: string) {
  return and(
    eq(schema.decks.seriesId, seriesId),
    eq(schema.decks.userId, userId),
    sql`exists (select 1 from series where series.id = ${seriesId} and series.user_id = ${userId} and series.archived_at is null)`,
  );
}

/** Every state asked now, as the counts, stats and reminders share it. */
const asked = sql.raw(askedSql());

/** What the queue needs of a state row beyond the rules, by `drawKey`. */
export interface DrawState {
  id: string;
  mode: ReviewModeKey;
  state: number;
  fsrs: string;
}

export interface DrawInputs {
  day: DayWindow;
  cards: DrawCard[];
  log: DrawLogEntry[];
  states: Map<string, DrawState>;
  /** Often-forgotten card ids among the loaded cards. */
  slipping: Set<string>;
}

export interface DrawOptions {
  now?: Date | undefined;
  /** The review zone. Callers resolve it, so a count never writes a setting. */
  zone: string;
  deckId?: string | undefined;
  /** Only the decks of the caller's own active series. */
  seriesId?: string | undefined;
  sectionId?: string | undefined;
  /** Also load slipping cards whatever their due, for the slipping round. */
  slipping?: boolean | undefined;
}

interface ModeRow {
  id: string;
  direction: string;
  mode: ReviewModeKey | null;
  state: number;
  due: Date;
  fsrs: string;
  createdAt: Date;
}

function toDrawMode(row: ModeRow, card: { term: string; meaning: string | null }, day: DayWindow) {
  const key = stateMode(row);
  // A picture mode is asked only while its picture exists, so its cue is the row's presence.
  const cue = isImageMode(key) ? "picture" : key === "meaning_to_term" ? card.meaning : card.term;
  const r = retrievability(deserializeState(row.fsrs), day.start);
  const mode: DrawMode = {
    mode: key,
    state: row.state,
    due: row.due,
    retrievability: Math.min(1, Math.max(0, Number.isFinite(r) ? r : 0)),
    added: row.createdAt,
    hasCue: (cue ?? "").trim().length > 0,
  };
  return mode;
}

/**
 * The modes the rules read: every asked state due before the day ends, plus every state
 * reviewed today, since a return is due by attempts rather than by the clock. Each brings the
 * card's other asked states along, so core can introduce modes one at a time. Only what the
 * rules need is loaded; `cardsById` fetches content for the cards a draw returns.
 */
export async function drawInputs(ctx: ServiceContext, opts: DrawOptions): Promise<DrawInputs> {
  const { db, userId } = ctx;
  const now = opts.now ?? new Date();
  const day = dayWindow(now, opts.zone);
  const sibling = alias(schema.cardStates, "sibling");
  // Joined in this one query, so its whole-history aggregate runs once per draw.
  const slip = slippingCardIds(ctx, day).as("slip");
  const modeColumns = {
    id: schema.cardStates.id,
    direction: schema.cardStates.direction,
    mode: schema.cardStates.mode,
    state: schema.cardStates.state,
    due: schema.cardStates.due,
    fsrs: schema.cardStates.fsrs,
    createdAt: schema.cardStates.createdAt,
  };
  const siblingColumns = {
    id: sibling.id,
    direction: sibling.direction,
    mode: sibling.mode,
    state: sibling.state,
    due: sibling.due,
    fsrs: sibling.fsrs,
    createdAt: sibling.createdAt,
  };

  // A locked section's cards wait, except one the learner already started: progress never hides.
  const waiting = await waitingCardsSql(ctx, opts.deckId);

  const where = and(
    eq(schema.cardStates.userId, userId),
    memberOf(userId),
    isNull(schema.cards.archivedAt),
    isNull(schema.decks.archivedAt),
    asked,
    or(
      lt(schema.cardStates.due, day.end),
      gte(schema.cardStates.lastReview, day.start),
      opts.slipping ? isNotNull(slip.id) : undefined,
    ),
    opts.deckId ? eq(schema.cards.deckId, opts.deckId) : undefined,
    opts.seriesId ? inSeries(userId, opts.seriesId) : undefined,
    opts.sectionId ? eq(schema.cards.sectionId, opts.sectionId) : undefined,
    waiting ? sql`not (${waiting})` : undefined,
  );
  const siblingOn = and(
    eq(sibling.cardId, schema.cardStates.cardId),
    eq(sibling.userId, userId),
    ne(sibling.id, schema.cardStates.id),
    sql.raw(askedSql("sibling.direction")),
  );

  const candidateRows = db
    .select({
      card: {
        id: schema.cards.id,
        deckId: schema.cards.deckId,
        term: schema.cards.term,
        meaning: schema.cards.meaning,
        directions: schema.cards.directions,
        reviewModeKeys: schema.cards.reviewModeKeys,
      },
      deckDirections: schema.decks.directions,
      state: modeColumns,
      sibling: siblingColumns,
      slipping: slip.id,
    })
    .from(schema.cardStates)
    .innerJoin(schema.cards, eq(schema.cards.id, schema.cardStates.cardId))
    .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
    .leftJoin(sibling, siblingOn)
    .leftJoin(slip, eq(slip.id, schema.cardStates.cardId))
    .where(where);

  const [candidates, log] = await Promise.all([
    candidateRows,
    db
      .select({
        cardId: schema.reviews.cardId,
        direction: schema.reviews.direction,
        mode: schema.reviews.mode,
        rating: schema.reviews.rating,
        state: schema.reviews.state,
        reviewedAt: schema.reviews.reviewedAt,
      })
      .from(schema.reviews)
      .leftJoin(schema.reviewUndos, eq(schema.reviewUndos.reviewId, schema.reviews.id))
      .where(
        and(
          eq(schema.reviews.userId, userId),
          gte(schema.reviews.reviewedAt, day.start),
          lt(schema.reviews.reviewedAt, day.end),
          isNull(schema.reviewUndos.reviewId),
          // Recalls imported from another app are history, not today's attempts.
          ne(schema.reviews.source, "import"),
        ),
      )
      .orderBy(asc(schema.reviews.reviewedAt), asc(schema.reviews.id)),
  ]);

  const cards = new Map<
    string,
    DrawCard & { byMode: Map<ReviewModeKey, DrawMode>; order: ReviewModeKey[] }
  >();
  const states = new Map<string, DrawState>();
  const take = (
    entry: { byMode: Map<ReviewModeKey, DrawMode> },
    row: ModeRow,
    card: { id: string; term: string; meaning: string | null },
  ) => {
    const mode = toDrawMode(row, card, day);
    const key = mode.mode as ReviewModeKey;
    if (entry.byMode.has(key)) return;
    entry.byMode.set(key, mode);
    states.set(drawKey(card.id, key), {
      id: row.id,
      mode: key,
      state: row.state,
      fsrs: row.fsrs,
    });
  };
  for (const row of candidates) {
    const card = row.card;
    const entry = cards.get(card.id) ?? {
      cardId: card.id,
      deckId: card.deckId,
      modes: [],
      slipping: row.slipping !== null,
      byMode: new Map<ReviewModeKey, DrawMode>(),
      order: modeOrder(card, row.deckDirections),
    };
    take(entry, row.state, card);
    if (row.sibling?.id) take(entry, row.sibling as ModeRow, card);
    cards.set(card.id, entry);
  }

  return {
    day,
    cards: [...cards.values()].map(({ byMode, order, ...card }) => ({
      ...card,
      // A state asked now but missing from the list is one an older list left; it goes last.
      modes: [...order, ...byMode.keys()]
        .filter((key, i, all) => all.indexOf(key) === i)
        .flatMap((key) => byMode.get(key) ?? []),
    })),
    log: log.map((r) => ({
      cardId: r.cardId,
      mode: stateMode(r),
      rating: r.rating as Rating,
      stateBefore: r.state,
      at: r.reviewedAt,
    })),
    states,
    slipping: new Set(candidates.flatMap((row) => (row.slipping ? [row.card.id] : []))),
  };
}

/** Card content for the cards a draw returned, in one query per fifty ids. */
export async function cardsById(ctx: ServiceContext, ids: string[]): Promise<Map<string, Card>> {
  const out = new Map<string, Card>();
  for (let i = 0; i < ids.length; i += 50) {
    const rows = await ctx.db
      .select()
      .from(schema.cards)
      .where(inArray(schema.cards.id, ids.slice(i, i + 50)));
    for (const row of rows) out.set(row.id, row);
  }
  return out;
}

/** Cards that can be reviewed now. The queue's total, exhaustion and the reminder count. */
export async function drawableCount(
  ctx: ServiceContext,
  opts: DrawOptions & { deckId?: undefined },
): Promise<number> {
  const { cards, log, day } = await drawInputs(ctx, opts);
  return countDrawable(cards, log, day);
}

/** The same count for each section of one deck, keyed by section id. */
export async function drawableBySection(
  ctx: ServiceContext,
  deckId: string,
  zone: string,
): Promise<Map<string, number>> {
  const { cards, log, day } = await drawInputs(ctx, { deckId, zone });
  const placed = await ctx.db
    .select({ id: schema.cards.id, sectionId: schema.cards.sectionId })
    .from(schema.cards)
    .where(and(eq(schema.cards.deckId, deckId), isNotNull(schema.cards.sectionId)));
  const sectionOf = new Map(placed.map((row) => [row.id, row.sectionId]));
  const bySection = new Map<string, DrawCard[]>();
  for (const card of cards) {
    const sectionId = sectionOf.get(card.cardId);
    if (sectionId) bySection.set(sectionId, [...(bySection.get(sectionId) ?? []), card]);
  }
  return new Map(
    [...bySection].map(([sectionId, list]) => [sectionId, countDrawable(list, log, day)]),
  );
}

/** The same count for every deck at once, as Library and Today show them. */
export async function drawableByDeck(
  ctx: ServiceContext,
  opts: DrawOptions,
): Promise<Map<string, number>> {
  const { cards, log, day } = await drawInputs(ctx, opts);
  const counts = new Map<string, number>();
  for (const deckId of new Set(cards.map((c) => c.deckId))) {
    counts.set(deckId, countDrawable(cards, log, day, { deckId }));
  }
  return counts;
}

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
  /** Slipping card ids, when the options asked for them. */
  slipping: Set<string>;
}

export interface DrawOptions {
  now?: Date | undefined;
  /** The review zone. Callers resolve it, so a count never writes a setting. */
  zone: string;
  deckId?: string | undefined;
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
  // Joined only for the slipping round, so its whole-history aggregate runs in this one query.
  const slip = slippingCardIds(ctx).as("slip");
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
      slipping: opts.slipping ? slip.id : sql<string | null>`null`,
    })
    .from(schema.cardStates)
    .innerJoin(schema.cards, eq(schema.cards.id, schema.cardStates.cardId))
    .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
    .leftJoin(sibling, siblingOn)
    .$dynamic();
  const candidatesQuery = (
    opts.slipping
      ? candidateRows.leftJoin(slip, eq(slip.id, schema.cardStates.cardId))
      : candidateRows
  ).where(where);

  const [candidates, log] = await Promise.all([
    candidatesQuery,
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

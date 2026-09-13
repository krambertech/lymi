import type { Direction, DrawLogEntry, GradeInput, ReviewModeKey } from "@lymi/core";
import {
  deserializeState,
  drawableCount,
  drawKey,
  drawOrder,
  legacyDirection,
  missed,
  modeKey,
  modeOf,
  modesFromDirections,
  newId,
  preview,
  schedule,
  serializeState,
  stateDirection,
} from "@lymi/core";
import { and, eq, gte } from "@lymi/core/db";
import { audit } from "../audit";
import { schema } from "../db";
import { presentCards } from "./card-view";
import { notFound, type ServiceContext } from "./context";
import { dateFormatter } from "./days";
import { cardsById, drawInputs } from "./draw";
import { memberOf } from "./members";
import {
  type DayProgress,
  openDay,
  reviewZone,
  type StateBefore,
  settleDay,
  streak as streakSummary,
} from "./review-days";
import { getSettings } from "./settings";

/**
 * The order today's review takes: what `draw` would serve if every grade succeeded, ADR 0019.
 * The scheduler preview stays available to API clients even though the first-party review UI
 * keeps it out of sight.
 */
export async function reviewQueue(
  ctx: ServiceContext,
  opts: { deckId?: string | undefined; limit?: number | undefined } = {},
) {
  const limit = Math.min(opts.limit ?? 50, 200);
  const now = new Date();
  const zone = await reviewZone(ctx);
  const scope = { deckId: opts.deckId };
  const { cards, log, day, states } = await drawInputs(ctx, { ...scope, now, zone });
  const order = drawOrder(cards, log, day, scope, limit);
  const content = await presentContent(ctx, [...new Set(order.map((d) => d.cardId))]);

  const items = order.flatMap((drawn) => {
    const state = states.get(drawKey(drawn.cardId, drawn.mode));
    const card = content.get(drawn.cardId);
    if (!state || !card) return [];
    const next = preview(deserializeState(state.fsrs), now);
    const direction = legacyDirection(state.mode);
    return [
      {
        card,
        mode: modeOf(state.mode),
        // An older app reads only `direction`, so a picture mode leaves it out rather than let
        // that app grade the text sibling.
        ...(direction ? { direction } : {}),
        stateId: state.id,
        fsrsState: state.state,
        next: {
          1: next[1].toISOString(),
          2: next[2].toISOString(),
          3: next[3].toISOString(),
          4: next[4].toISOString(),
        },
      },
    ];
  });

  return { total: drawableCount(cards, log, day, scope), items };
}

/**
 * What a client needs to draw for itself: the day, the goal, the cards at the front of the
 * order with every mode they are asked in, and today's log in every scope. A card with a
 * return pending is included whatever the limit, since the client holds it in hand.
 */
export async function reviewDraw(
  ctx: ServiceContext,
  opts: { deckId?: string | undefined; limit?: number | undefined; zone?: string | undefined },
) {
  const limit = Math.min(opts.limit ?? 100, 500);
  const now = new Date();
  const zone = await reviewZone(ctx, opts.zone);
  const settings = await getSettings(ctx);
  const scope = { deckId: opts.deckId };
  const { cards, log, day, states } = await drawInputs(ctx, { ...scope, now, zone });

  const include = new Set(drawOrder(cards, log, day, scope, limit).map((d) => d.cardId));
  const latest = new Map<string, DrawLogEntry>();
  for (const entry of log) latest.set(drawKey(entry.cardId, entry.mode), entry);
  for (const entry of latest.values()) {
    if (missed(entry.rating, entry.stateBefore)) include.add(entry.cardId);
  }
  const position = new Map([...include].map((cardId, index) => [cardId, index]));
  const content = await presentContent(ctx, [...include]);

  return {
    day: { date: day.date, zone, start: day.start, end: day.end },
    goal: settings.dailyGoal,
    attempts: log.length,
    total: drawableCount(cards, log, day, scope),
    cards: cards
      .filter((card) => include.has(card.cardId))
      .sort((a, b) => (position.get(a.cardId) ?? 0) - (position.get(b.cardId) ?? 0))
      .flatMap((card) => {
        const modes = card.modes.flatMap((mode) => {
          const state = states.get(drawKey(card.cardId, mode.mode));
          if (!state) return [];
          const direction = legacyDirection(state.mode);
          return [
            {
              mode: modeOf(state.mode),
              ...(direction ? { direction } : {}),
              stateId: state.id,
              fsrsState: mode.state,
              due: mode.due,
              retrievability: mode.retrievability,
              added: mode.added,
              hasCue: mode.hasCue,
            },
          ];
        });
        const row = content.get(card.cardId);
        return row && modes.length > 0 ? [{ card: row, modes }] : [];
      }),
    log: log.map((entry) => ({
      cardId: entry.cardId,
      mode: modeOf(entry.mode as ReviewModeKey),
      ...(legacyDirection(entry.mode as ReviewModeKey)
        ? { direction: legacyDirection(entry.mode as ReviewModeKey) as Direction }
        : {}),
      rating: entry.rating,
      stateBefore: entry.stateBefore,
      at: entry.at,
    })),
  };
}

/** The cards a draw returned, as the API shows them, by id. */
async function presentContent(ctx: ServiceContext, ids: string[]) {
  const rows = await cardsById(ctx, ids);
  const views = await presentCards(ctx.db, [...rows.values()]);
  return new Map(views.map((view) => [view.id, view]));
}

/**
 * Apply one grade. Only the learner grades; integrations never reach this function.
 * Idempotent enough for offline replay: a review older than the state's last review is a no-op.
 * Every accepted grade is one attempt toward the learner-local day it happened on, fixed now.
 */
export async function gradeCard(ctx: ServiceContext, input: GradeInput) {
  const { db, userId, actor } = ctx;
  const { cardId, rating } = input;
  const key = gradedMode(input);
  const direction = stateDirection(key);
  const reviewedAt = input.reviewedAt ?? new Date();

  const [row] = await db
    .select({ state: schema.cardStates })
    .from(schema.cardStates)
    .innerJoin(schema.cards, eq(schema.cards.id, schema.cardStates.cardId))
    .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
    .where(
      and(
        eq(schema.cardStates.cardId, cardId),
        eq(schema.cardStates.userId, userId),
        eq(schema.cardStates.direction, direction),
        memberOf(userId),
      ),
    );
  if (!row) throw notFound("Card");
  const state = row.state;

  const zone = await reviewZone(ctx, input.timezone);
  const settings = await getSettings(ctx);
  const date = dateFormatter(zone).format(reviewedAt);

  if (state.lastReview && state.lastReview.getTime() >= reviewedAt.getTime()) {
    const [existing] = await db
      .select()
      .from(schema.reviewDays)
      .where(and(eq(schema.reviewDays.userId, userId), eq(schema.reviewDays.date, date)));
    const day: DayProgress = existing
      ? await settleDay(ctx, existing, "check")
      : { date, attempts: 0, goal: settings.dailyGoal, outcome: "open" };
    return {
      ok: true as const,
      duplicate: true as const,
      due: state.due.toISOString(),
      state: state.state,
      reviewId: null,
      day,
    };
  }

  const result = schedule(deserializeState(state.fsrs), rating, reviewedAt);
  const reviewDay = await openDay(ctx, date, zone, settings.dailyGoal);
  const reviewId = newId();
  const before: StateBefore = {
    fsrs: state.fsrs,
    due: state.due.getTime(),
    state: state.state,
    lastReview: state.lastReview?.getTime() ?? null,
  };

  await db.batch([
    db
      .update(schema.cardStates)
      .set({
        due: result.card.due,
        state: result.card.state,
        fsrs: serializeState(result.card),
        lastReview: reviewedAt,
        updatedAt: new Date(),
      })
      .where(eq(schema.cardStates.id, state.id)),
    db.insert(schema.reviews).values({
      id: reviewId,
      userId,
      cardId,
      cardStateId: state.id,
      direction,
      mode: key,
      rating,
      state: result.log.state,
      elapsedDays: result.log.elapsedDays,
      scheduledDays: result.log.scheduledDays,
      stabilityAfter: result.card.stability,
      difficultyAfter: result.card.difficulty,
      reviewedAt,
      source: "web",
      reviewDayId: reviewDay.id,
      stateBefore: JSON.stringify(before),
    }),
  ]);
  await audit(db, {
    userId,
    actor,
    action: "grade",
    entity: "review",
    entityId: cardId,
    payload: { rating, direction, mode: key },
  });

  return {
    ok: true as const,
    duplicate: false as const,
    due: result.card.due.toISOString(),
    state: result.card.state,
    reviewId,
    day: await settleDay(ctx, reviewDay, "grade"),
  };
}

/** The mode a grade names. A legacy direction maps to the text mode it always meant. */
function gradedMode(input: GradeInput): ReviewModeKey {
  if (input.mode) return modeKey(input.mode);
  const [key] = modesFromDirections(input.direction ?? "recognition");
  return key as ReviewModeKey;
}

/**
 * Reviews per day for the last `days` days in the learner's timezone, oldest first. Feeds
 * the seven lights. `tzOffset` is minutes, as Date.getTimezoneOffset reports it.
 */
export async function reviewHistory(
  ctx: ServiceContext,
  opts: { days?: number | undefined; tzOffset?: number | undefined } = {},
) {
  const { db, userId } = ctx;
  const days = Math.min(Math.max(opts.days ?? 7, 1), 90);
  const tz = opts.tzOffset ?? 0;
  const now = new Date();
  const localNow = new Date(now.getTime() - tz * 60_000);
  const startLocal = Date.UTC(
    localNow.getUTCFullYear(),
    localNow.getUTCMonth(),
    localNow.getUTCDate() - (days - 1),
  );
  const start = new Date(startLocal + tz * 60_000);

  const rows = await db
    .select({ reviewedAt: schema.reviews.reviewedAt })
    .from(schema.reviews)
    .where(and(eq(schema.reviews.userId, userId), gte(schema.reviews.reviewedAt, start)));

  const counts = new Array<number>(days).fill(0);
  for (const r of rows) {
    const i = Math.floor((r.reviewedAt.getTime() - tz * 60_000 - startLocal) / 86_400_000);
    if (i >= 0 && i < days) counts[i] = (counts[i] ?? 0) + 1;
  }

  // The run is the goal streak, the same one the streak endpoint reports.
  const { current: streak } = await streakSummary(ctx);
  return { days: counts, streak };
}

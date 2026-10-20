import type { Direction, DrawLogEntry, GradeInput, ReviewModeKey, Round } from "@lymi/core";
import {
  CHOSEN_LIMIT,
  chosenOrder,
  countedRating,
  deserializeState,
  drawableCount,
  drawKey,
  drawOrder,
  exampleReadings,
  languageSupport,
  legacyDirection,
  markedTerm,
  missed,
  modeKey,
  modeOf,
  modesFromDirections,
  preview,
  roundOrder,
  schedule,
  serializeState,
  stateDirection,
  termReading,
} from "@lymi/core";
import { CARD_STATES } from "@lymi/core/analytics";
import { and, eq, gte, ne } from "@lymi/core/db";
import { schema } from "../db";
import { track } from "./analytics";
import { recordFirstReview } from "./analytics-review";
import { audit } from "./audit";
import { presentCards } from "./card-view";
import { notFound, type ServiceContext, ServiceError } from "./context";
import { dateFormatter } from "./days";
import { cardsById, drawInputs } from "./draw";
import { deckAccess, memberOf } from "./members";
import {
  type DayProgress,
  openDay,
  reviewZone,
  type StateBefore,
  settleDay,
  streak as streakSummary,
} from "./review-days";
import { openReadySections, visibleSection } from "./sections";
import { activeSeries } from "./series-access";
import { getSettings } from "./settings";

/**
 * The order today's review takes: what `draw` would serve if every grade succeeded, ADR 0019.
 * The scheduler preview stays available to API clients even though the first-party review UI
 * keeps it out of sight.
 */
export async function reviewQueue(
  ctx: ServiceContext,
  opts: {
    deckId?: string | undefined;
    seriesId?: string | undefined;
    sectionId?: string | undefined;
    limit?: number | undefined;
    round?: Round | undefined;
    /** Cards the learner chose in one deck: review the started ones, due ones first. */
    cardIds?: readonly string[] | undefined;
  } = {},
) {
  const { round, deckId, seriesId, sectionId, cardIds } = opts;
  if (cardIds && (!deckId || round || seriesId || sectionId)) {
    throw new ServiceError("invalid", "Chosen cards review one deck, without a round or section");
  }
  if (cardIds && cardIds.length > CHOSEN_LIMIT) {
    throw new ServiceError("invalid", `Choose at most ${CHOSEN_LIMIT} cards`);
  }
  // Chosen cards are fetched once, so they come whole up to the cap rather than a page at a time.
  const limit = Math.min(opts.limit ?? (cardIds ? CHOSEN_LIMIT : 50), 200);
  const now = new Date();
  const zone = await reviewZone(ctx);
  if (seriesId) await activeSeries(ctx, seriesId);
  if (sectionId) await visibleSection(ctx, sectionId, deckId);
  if (cardIds && deckId) await deckAccess(ctx, deckId);
  const { cards, log, day, states, slipping } = await drawInputs(ctx, {
    deckId,
    sectionId,
    seriesId,
    now,
    zone,
    slipping: round === "slipping",
    everyState: !!cardIds,
  });
  const chosen = cardIds ? new Set(cardIds) : null;
  const order = chosen
    ? chosenOrder(cards, log, chosen)
    : round
      ? roundOrder(cards, log, day, { deckId, round, slipping })
      : drawOrder(cards, log, day, { deckId }, limit);
  const front = order.slice(0, limit);
  const content = await presentContent(ctx, [...new Set(front.map((d) => d.cardId))]);

  const items = front.flatMap((drawn) => {
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
        slipping: slipping.has(drawn.cardId),
      },
    ];
  });

  const total = chosen
    ? Math.min(order.length, limit)
    : round
      ? order.length
      : drawableCount(cards, log, day, { deckId });
  return { total, items };
}

/** How many cards each Today round holds right now, across every deck. */
export async function reviewRounds(ctx: ServiceContext, opts: { zone?: string | undefined } = {}) {
  const zone = await reviewZone(ctx, opts.zone);
  const { cards, log, day, slipping } = await drawInputs(ctx, { zone, slipping: true });
  const count = (round: Round) => roundOrder(cards, log, day, { round, slipping }).length;
  return { forgotten: count("forgotten"), new: count("new"), slipping: count("slipping") };
}

/**
 * What a client needs to draw for itself: the day, the goal, the cards at the front of the
 * order with every mode they are asked in, and today's log in every scope. A card with a
 * return pending is included whatever the limit, since the client holds it in hand.
 */
export async function reviewDraw(
  ctx: ServiceContext,
  opts: {
    deckId?: string | undefined;
    seriesId?: string | undefined;
    sectionId?: string | undefined;
    limit?: number | undefined;
    zone?: string | undefined;
  },
) {
  const limit = Math.min(opts.limit ?? 100, 500);
  const now = new Date();
  const zone = await reviewZone(ctx, opts.zone);
  const settings = await getSettings(ctx);
  if (opts.seriesId) await activeSeries(ctx, opts.seriesId);
  if (opts.sectionId) await visibleSection(ctx, opts.sectionId, opts.deckId);
  // The series or section narrows the rows loaded, so the rules need no scope of their own for it.
  const scope = { deckId: opts.deckId };
  const { cards, log, day, states, slipping } = await drawInputs(ctx, {
    ...scope,
    seriesId: opts.seriesId,
    sectionId: opts.sectionId,
    now,
    zone,
  });

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
    // Lets a client take an archived deck out of `total` without guessing what lies behind the front.
    decks: Object.fromEntries(
      (opts.deckId ? [opts.deckId] : [...new Set(cards.map((c) => c.deckId))]).map((deckId) => [
        deckId,
        drawableCount(cards, log, day, { deckId }),
      ]),
    ),
    cards: cards
      .filter((card) => include.has(card.cardId))
      .sort((a, b) => (position.get(a.cardId) ?? 0) - (position.get(b.cardId) ?? 0))
      .flatMap((card) => {
        const modes = card.modes.flatMap((mode) => {
          const state = states.get(drawKey(card.cardId, mode.mode));
          if (!state) return [];
          const direction = legacyDirection(state.mode);
          const next = preview(deserializeState(state.fsrs), now);
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
              next: {
                1: next[1].toISOString(),
                2: next[2].toISOString(),
                3: next[3].toISOString(),
                4: next[4].toISOString(),
              },
            },
          ];
        });
        const row = content.get(card.cardId);
        return row && modes.length > 0
          ? [{ card: row, modes, slipping: slipping.has(card.cardId) }]
          : [];
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
  const rows = [...(await cardsById(ctx, ids)).values()];
  const views = await presentCards(ctx.db, rows, ctx.userId);
  return new Map(views.map((view) => [view.id, view]));
}

/** Where review drew the term's reading: over the cue until the card is Known, else only after the reveal. */
function readingShown(key: ReviewModeKey, state: number): "cue" | "answer" {
  return modeOf(key).cue === "term" && state !== 2 ? "cue" : "answer";
}

/** Where the term's reading showed and how the example's faded, with the language whose engine drew them. */
function readingsDrawn(
  card: { language: string | null },
  reading: "cue" | "answer" | null,
  faded: ReturnType<typeof fadedReadings>,
) {
  const language = languageSupport(card.language)?.tag;
  if (!language || (reading === null && !("example_readings" in faded))) return faded;
  return { ...(reading ? { reading } : {}), ...faded, reading_language: language };
}

/** How many readings the card's example draws, and how many the grader saw fade, when it says. */
function fadedReadings(example: string | null, faded: number | undefined) {
  if (faded === undefined) return {};
  const { readings } = exampleReadings(example);
  return readings ? { example_readings: readings, readings_faded: Math.min(faded, readings) } : {};
}

/**
 * Apply one grade. Only the learner grades; integrations never reach this function.
 * Idempotent enough for offline replay: a review older than the state's last review is a no-op.
 * Every accepted grade is one attempt toward the learner-local day it happened on, fixed now.
 */
export async function gradeCard(
  ctx: ServiceContext,
  input: GradeInput,
  /**
   * What the grader draws on the term, so `review_graded` can say where: a reading over it, which a
   * phone before 0.0.2 lacks, and stress marks in place, which a phone before 0.0.4 lacks.
   */
  draws: { over: boolean; inPlace: boolean } = { over: true, inPlace: true },
) {
  const { db, userId } = ctx;
  const { cardId } = input;
  const key = gradedMode(input);
  const direction = stateDirection(key);
  const reviewedAt = input.reviewedAt ?? new Date();

  const [row] = await db
    .select({
      state: schema.cardStates,
      deckId: schema.cards.deckId,
      sectionId: schema.cards.sectionId,
      progression: schema.decks.sectionProgression,
      term: schema.cards.term,
      language: schema.cards.language,
      pronunciation: schema.cards.pronunciation,
      example: schema.cards.example,
    })
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
  // A grade is what makes a section ready, so an automatic deck opens the next one here, retries too.
  const advance = () =>
    row.sectionId && row.progression === "automatic"
      ? openReadySections(ctx, row.deckId)
      : Promise.resolve();

  const zone = await reviewZone(ctx, input.timezone);
  const settings = await getSettings(ctx);
  const date = dateFormatter(zone).format(reviewedAt);
  const repeat = !!state.lastReview && dateFormatter(zone).format(state.lastReview) === date;
  const rating = countedRating(input.rating, repeat);

  const duplicate = async () => {
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
  };
  if (state.lastReview && state.lastReview.getTime() >= reviewedAt.getTime()) {
    // A replayed grade may be the one whose opening never landed, so it looks again.
    await advance();
    return duplicate();
  }

  const result = schedule(deserializeState(state.fsrs), rating, reviewedAt);
  const reviewDay = await openDay(ctx, date, zone, settings.dailyGoal);
  // Named by the grade itself, so a copy that raced past the check above collides and rolls back.
  const reviewId = await gradeReviewId(state.id, reviewedAt);
  const before: StateBefore = {
    fsrs: state.fsrs,
    due: state.due.getTime(),
    state: state.state,
    lastReview: state.lastReview?.getTime() ?? null,
  };

  const stored = await db
    .batch([
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
        aid: input.aid ?? null,
        recallMs: input.recallMs ?? null,
        gradeMs: input.gradeMs ?? null,
      }),
    ])
    .then(
      () => true,
      (err: unknown) => {
        if (isUniqueViolation(err)) return false;
        throw err;
      },
    );
  if (!stored) return duplicate();
  track(ctx.analytics, {
    name: "review_graded",
    mode: key,
    grade: rating,
    ...(CARD_STATES[state.state] ? { state: CARD_STATES[state.state] } : {}),
    ...(input.aid ? { aid: input.aid } : {}),
    ...readingsDrawn(
      row,
      (termReading(row) ? draws.over : markedTerm(row) !== null && draws.inPlace)
        ? readingShown(key, state.state)
        : null,
      fadedReadings(row.example, input.readingsFaded),
    ),
  });
  recordFirstReview(ctx, row.deckId, { id: reviewId, reviewedAt });
  // Readiness only moves when a card leaves New or becomes Known, so other grades skip the check.
  if (state.state === 0 || result.card.state === 2) await advance();
  await audit(ctx, {
    entity: "review",
    action: "grade",
    id: cardId,
    details: { rating, direction, mode: key, ...(input.aid ? { aid: input.aid } : {}) },
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

/** Time-sortable like `newId`, with the card state's hash in place of randomness. */
async function gradeReviewId(cardStateId: string, reviewedAt: Date): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(cardStateId)),
  );
  const time = reviewedAt.getTime().toString(36).padStart(9, "0");
  let hash = "";
  for (const b of digest.subarray(0, 10)) hash += (b % 36).toString(36);
  return time + hash;
}

function isUniqueViolation(err: unknown): boolean {
  for (let e = err; e instanceof Error; e = e.cause) {
    if (e.message.includes("UNIQUE constraint failed")) return true;
  }
  return false;
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
    .where(
      and(
        eq(schema.reviews.userId, userId),
        gte(schema.reviews.reviewedAt, start),
        // The lights sit beside the goal streak, which an imported recall never counts toward.
        ne(schema.reviews.source, "import"),
      ),
    );

  const counts = new Array<number>(days).fill(0);
  for (const r of rows) {
    const i = Math.floor((r.reviewedAt.getTime() - tz * 60_000 - startLocal) / 86_400_000);
    if (i >= 0 && i < days) counts[i] = (counts[i] ?? 0) + 1;
  }

  // The run is the goal streak, the same one the streak endpoint reports.
  const { current: streak } = await streakSummary(ctx);
  return { days: counts, streak };
}

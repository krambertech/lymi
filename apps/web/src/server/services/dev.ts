import { type Actor, emptyState, type Rating, schedule, serializeState } from "@lymi/core";
import { and, asc, desc, eq, inArray, isNull, sql } from "@lymi/core/db";
import { schema } from "../db";
import type { Persona, PersonaCard } from "../dev/personas";
import { addCards } from "./cards";
import type { ServiceContext } from "./context";
import { archiveDeck, asked, createDeck, listDecks } from "./decks";
import { updateSettings } from "./settings";

const DAY = 86_400_000;
/** A day holds what a learner does in one sitting, so the lights grade evenly across a week. */
const MIN_REVIEWS_PER_DAY = 8;
const MAX_REVIEWS_PER_DAY = 24;

/**
 * Local development only. Puts a persona's data under an account, empties an account, and
 * moves cards' due dates so a screen can be looked at in a chosen state. Decks and cards go
 * in through the same services the app and the API use, so they carry audit rows and
 * scheduling state like real ones; the review history is then simulated in memory with the
 * real scheduler and written back, because a month of grades one request at a time is too
 * slow to be a tool anyone reaches for.
 */

export interface DevCounts {
  decks: number;
  cards: number;
  due: number;
  reviews: number;
}

export async function devCounts({ db, userId }: ServiceContext): Promise<DevCounts> {
  const decks = await listDecks({ db, userId, actor: "system" });
  const [reviews = { n: 0 }] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.reviews)
    .where(eq(schema.reviews.userId, userId));
  return {
    decks: decks.length,
    cards: decks.reduce((n, d) => n + d.total, 0),
    due: decks.reduce((n, d) => n + d.due, 0),
    reviews: reviews.n,
  };
}

/** Everything the account holds in the product: decks, cards, states, reviews, audit, settings. */
export async function resetAccount({ db, userId }: ServiceContext): Promise<void> {
  await db.batch([
    db.delete(schema.reviews).where(eq(schema.reviews.userId, userId)),
    db.delete(schema.cardStates).where(eq(schema.cardStates.userId, userId)),
    db.delete(schema.cards).where(eq(schema.cards.userId, userId)),
    db.delete(schema.decks).where(eq(schema.decks.userId, userId)),
    db.delete(schema.series).where(eq(schema.series.userId, userId)),
    db.delete(schema.auditLog).where(eq(schema.auditLog.userId, userId)),
    db.delete(schema.userSettings).where(eq(schema.userSettings.userId, userId)),
  ]);
}

/**
 * Seed a persona's data under the account in `ctx`. The account is emptied first, so the
 * result is the same whoever was there before. Deterministic: the same persona seeds the
 * same grades every time.
 */
export async function seedPersona(ctx: ServiceContext, persona: Persona): Promise<DevCounts> {
  const { db, userId } = ctx;
  await resetAccount(ctx);
  await updateSettings(ctx, { appLanguage: persona.appLanguage });

  const now = new Date();
  const introducedAt = new Map<string, Date>();
  const toArchive: string[] = [];

  for (const deck of persona.decks) {
    const created = await createDeck(
      { db, userId, actor: "user" },
      {
        name: deck.name,
        description: deck.description ?? null,
        defaultLanguage: deck.defaultLanguage,
        directions: deck.directions ?? "recognition",
      },
    );
    // Cards go in grouped by actor so the audit log says who added which.
    const byActor = new Map<Actor, PersonaCard[]>();
    for (const card of deck.cards) {
      const actor = card.createdBy ?? "user";
      byActor.set(actor, [...(byActor.get(actor) ?? []), card]);
    }
    for (const [actor, cards] of byActor) {
      const outcomes = await addCards(
        { db, userId, actor },
        cards.map((c) => ({
          deckId: created.id,
          term: c.term,
          ...(c.meaning !== undefined && { meaning: c.meaning }),
          ...(c.example !== undefined && { example: c.example }),
          ...(c.pronunciation !== undefined && { pronunciation: c.pronunciation }),
          ...(c.notes !== undefined && { notes: c.notes }),
          ...(c.language !== undefined && { language: c.language }),
          ...(c.tags !== undefined && { tags: c.tags }),
          ...(c.source !== undefined && { source: c.source }),
          ...(c.meaningSource !== undefined && { meaningSource: c.meaningSource }),
          ...(c.exampleSource !== undefined && { exampleSource: c.exampleSource }),
        })),
      );
      outcomes.forEach((outcome, i) => {
        if (outcome.status !== "added") return;
        const spec = cards[i];
        const daysAgo = spec?.introducedDaysAgo ?? deck.introducedDaysAgo;
        introducedAt.set(outcome.card.id, new Date(now.getTime() - daysAgo * DAY - 60_000));
        if (spec?.archived) toArchive.push(outcome.card.id);
      });
    }
    if (deck.archived) await archiveDeck({ db, userId, actor: "user" }, created.id);
  }

  await backdate(ctx, introducedAt);
  await simulateReviews(ctx, introducedAt, persona.reviewDays, now, hashSeed(persona.id));
  if (toArchive.length > 0) {
    await db
      .update(schema.cards)
      .set({ archivedAt: now, updatedAt: now })
      .where(inArray(schema.cards.id, toArchive));
  }
  await setDue(ctx, persona.dueNow);
  return devCounts(ctx);
}

/** Creation timestamps to the day the persona says, so Activity and arrivals read right. */
async function backdate({ db }: ServiceContext, introducedAt: Map<string, Date>) {
  const statements: unknown[] = [...introducedAt].flatMap(([cardId, at]) => [
    db
      .update(schema.cards)
      .set({ createdAt: at, updatedAt: at })
      .where(eq(schema.cards.id, cardId)),
    db
      .update(schema.cardStates)
      .set({ due: at, createdAt: at, updatedAt: at, fsrs: serializeState(emptyState(at)) })
      .where(eq(schema.cardStates.cardId, cardId)),
    db.update(schema.auditLog).set({ createdAt: at }).where(eq(schema.auditLog.entityId, cardId)),
  ]);
  await runBatched(db, statements);
}

/**
 * Replay the persona's review days through the real scheduler. On each day, every card that
 * exists and is due gets one grade, drawn from a seeded generator so the history is stable
 * across seeds. Only the states and the append-only review rows are written; simulated
 * grades are not audited, because Activity is for what integrations did.
 */
async function simulateReviews(
  { db, userId }: ServiceContext,
  introducedAt: Map<string, Date>,
  reviewDays: number[],
  now: Date,
  seed: number,
) {
  if (reviewDays.length === 0 || introducedAt.size === 0) return;
  const states = await db
    .select()
    .from(schema.cardStates)
    .where(eq(schema.cardStates.userId, userId))
    .orderBy(asc(schema.cardStates.createdAt), asc(schema.cardStates.id));

  const rng = mulberry32(seed);
  const live = states.map((s) => ({
    row: s,
    card: emptyState(introducedAt.get(s.cardId) ?? s.createdAt),
    reviewed: 0,
  }));
  const reviews: (typeof schema.reviews.$inferInsert)[] = [];

  // Reviews land at the same clock time as the seed, half an hour earlier, so each one sits
  // in the local day it belongs to whatever the learner's timezone.
  for (const daysAgo of [...new Set(reviewDays)].sort((a, b) => b - a)) {
    const at = new Date(now.getTime() - daysAgo * DAY - 30 * 60_000);
    const existing = live.filter(
      (e) => (introducedAt.get(e.row.cardId)?.getTime() ?? 0) <= at.getTime(),
    );
    // The cards due, oldest first, up to one sitting's worth. When the scheduler left the day
    // short, the cards nearest to due fill it: a listed review day is a day the learner
    // reviewed, so it must hold grades.
    const due = existing
      .filter((e) => e.card.due.getTime() <= at.getTime())
      .sort((a, b) => a.card.due.getTime() - b.card.due.getTime())
      .slice(0, MAX_REVIEWS_PER_DAY);
    const ahead = existing
      .filter((e) => e.card.due.getTime() > at.getTime())
      .sort((a, b) => a.card.due.getTime() - b.card.due.getTime())
      .slice(0, Math.max(0, MIN_REVIEWS_PER_DAY - due.length));
    for (const entry of [...due, ...ahead]) {
      const rating = pickRating(rng, entry.reviewed);
      const result = schedule(entry.card, rating, at);
      reviews.push({
        id: crypto.randomUUID(),
        userId,
        cardId: entry.row.cardId,
        cardStateId: entry.row.id,
        direction: entry.row.direction,
        mode: entry.row.mode,
        rating,
        state: result.log.state,
        elapsedDays: result.log.elapsedDays,
        scheduledDays: result.log.scheduledDays,
        stabilityAfter: result.card.stability,
        difficultyAfter: result.card.difficulty,
        reviewedAt: at,
        source: "web",
      });
      entry.card = result.card;
      entry.reviewed += 1;
    }
  }

  const statements: unknown[] = live
    .filter((e) => e.reviewed > 0)
    .map((e) =>
      db
        .update(schema.cardStates)
        .set({
          due: e.card.due,
          state: e.card.state,
          fsrs: serializeState(e.card),
          lastReview: e.card.last_review ?? null,
          updatedAt: e.card.last_review ?? now,
        })
        .where(eq(schema.cardStates.id, e.row.id)),
    );
  // D1 binds at most 100 parameters per statement; a review row has 13.
  for (let i = 0; i < reviews.length; i += 7) {
    statements.push(db.insert(schema.reviews).values(reviews.slice(i, i + 7)));
  }
  await runBatched(db, statements);
}

/**
 * Make exactly `count` cards due now, or every card. Cards with the most history come due
 * first, so the queue shows real intervals rather than a row of new cards. Everything else
 * that was due moves to tomorrow or later.
 */
export async function setDue(
  { db, userId }: ServiceContext,
  count: number | "all",
): Promise<number> {
  const now = new Date();
  const states = await db
    .select({
      id: schema.cardStates.id,
      cardId: schema.cardStates.cardId,
      due: schema.cardStates.due,
      lastReview: schema.cardStates.lastReview,
    })
    .from(schema.cardStates)
    .innerJoin(schema.cards, eq(schema.cards.id, schema.cardStates.cardId))
    .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
    // Only states the card is asked in: a direction turned off on the deck keeps its rows,
    // and those must not use up the count or the queue would come up short.
    .where(
      and(
        eq(schema.cardStates.userId, userId),
        isNull(schema.cards.archivedAt),
        isNull(schema.decks.archivedAt),
        asked,
      ),
    )
    .orderBy(desc(schema.cardStates.lastReview), asc(schema.cardStates.due));

  const chosen = new Set<string>();
  const dueIds: string[] = [];
  const laterIds: string[] = [];
  for (const s of states) {
    const wanted = count === "all" || chosen.size < count || chosen.has(s.cardId);
    if (wanted) {
      chosen.add(s.cardId);
      dueIds.push(s.id);
    } else if (s.due.getTime() <= now.getTime()) {
      laterIds.push(s.id);
    }
  }

  const statements: unknown[] = [];
  // D1 binds at most 100 parameters per statement, so the ids go in slices.
  for (let i = 0; i < dueIds.length; i += 90) {
    statements.push(
      db
        .update(schema.cardStates)
        .set({ due: new Date(now.getTime() - 60_000), updatedAt: now })
        .where(inArray(schema.cardStates.id, dueIds.slice(i, i + 90))),
    );
  }
  laterIds.forEach((id, i) => {
    statements.push(
      db
        .update(schema.cardStates)
        .set({ due: new Date(now.getTime() + DAY + i * 3_600_000), updatedAt: now })
        .where(eq(schema.cardStates.id, id)),
    );
  });
  await runBatched(db, statements);
  return chosen.size;
}

/** A card whose second-ever grade is still Good: the run stays realistic without being flat. */
function pickRating(rng: () => number, reviewed: number): Rating {
  const r = rng();
  if (reviewed === 0) return r < 0.75 ? 3 : r < 0.9 ? 2 : 1;
  if (r < 0.62) return 3;
  if (r < 0.8) return 4;
  if (r < 0.93) return 2;
  return 1;
}

/** D1 rejects an empty batch and bounds a large one, so statements go in slices of forty. */
async function runBatched(db: ServiceContext["db"], statements: readonly unknown[]) {
  for (let i = 0; i < statements.length; i += 40) {
    const slice = statements.slice(i, i + 40);
    if (slice.length > 0) {
      await db.batch(slice as unknown as Parameters<ServiceContext["db"]["batch"]>[0]);
    }
  }
}

function hashSeed(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** Small, fast, seedable. Good enough for picking grades. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

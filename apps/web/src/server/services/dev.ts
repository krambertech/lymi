import { type Actor, emptyState, type Rating, schedule, serializeState } from "@lymi/core";
import { and, asc, desc, eq, inArray, isNull, lte, sql } from "@lymi/core/db";
import { type Db, schema } from "../db";
import type { Persona, PersonaCard, PersonaDeck } from "../dev/personas";
import { personaEmail } from "../dev/personas";
import { auditStatement } from "./audit";
import { addCards } from "./cards";
import type { ServiceContext } from "./context";
import { dateFormatter } from "./days";
import { archiveDeck, asked, createDeck, listDecks } from "./decks";
import { approveEdition, importEdition, publishEdition } from "./editions";
import { publishDeck } from "./publications";
import { gradeCard } from "./review";
import { reviewZone, streak } from "./review-days";
import { activeCardsOf, activeSectionsOf } from "./revisions";
import { createSection } from "./sections";
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
    db.delete(schema.reviewUndos).where(eq(schema.reviewUndos.userId, userId)),
    db.delete(schema.reviews).where(eq(schema.reviews.userId, userId)),
    // A day row outlives its reviews, so a goal met before the reset would still count.
    db.delete(schema.reviewDays).where(eq(schema.reviewDays.userId, userId)),
    db.delete(schema.cardStates).where(eq(schema.cardStates.userId, userId)),
    db.delete(schema.cards).where(eq(schema.cards.userId, userId)),
    db.delete(schema.decks).where(eq(schema.decks.userId, userId)),
    db.delete(schema.series).where(eq(schema.series.userId, userId)),
    db.delete(schema.auditLog).where(eq(schema.auditLog.userId, userId)),
    db.delete(schema.userSettings).where(eq(schema.userSettings.userId, userId)),
  ]);
}

/** Publications go first, because the database refuses to delete an account that owns one. */
export async function deletePersonaAccount(db: Db, email: string): Promise<void> {
  const owned = db
    .select({ id: schema.decks.id })
    .from(schema.decks)
    .innerJoin(schema.user, eq(schema.user.id, schema.decks.userId))
    .where(eq(schema.user.email, email));
  await db.batch([
    db.delete(schema.deckPublications).where(inArray(schema.deckPublications.deckId, owned)),
    db.delete(schema.user).where(eq(schema.user.email, email)),
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
    const sections = new Map<string, string>();
    for (const name of deck.sections ?? []) {
      const section = await createSection({ db, userId, actor: "user" }, created.id, { name });
      sections.set(name, section.id);
    }
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
          ...(c.section && { sectionId: sections.get(c.section) }),
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
    if (deck.publication) await seedPublication(ctx, persona, created.id, deck.publication);
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

/**
 * Publish a persona's deck locally and put its further editions on the public page, through the
 * same services a publisher calls. The publisher list is the persona's own address: these routes
 * ship only in local and preview builds, so nothing here can publish anything in production.
 */
async function seedPublication(
  ctx: ServiceContext,
  persona: Persona,
  deckId: string,
  publication: NonNullable<PersonaDeck["publication"]>,
) {
  const as: ServiceContext = { db: ctx.db, userId: ctx.userId, actor: "user" };
  const publishers = new Set([personaEmail(persona.id)]);
  await publishDeck(
    as,
    deckId,
    {
      slug: publication.slug,
      summary: publication.summary,
      level: publication.level ?? null,
      category: publication.category ?? null,
      meaningLanguage: publication.meaningLanguage,
      publisher: publication.publisher,
      sources: [],
    },
    publishers,
  );
  for (const edition of publication.editions ?? []) {
    const [sections, cards] = await Promise.all([
      activeSectionsOf(ctx.db, deckId),
      activeCardsOf(ctx.db, deckId),
    ]);
    await importEdition(
      as,
      deckId,
      edition.language,
      {
        deck: {
          provenance: "human",
          name: edition.name,
          summary: edition.summary,
          description: edition.description ?? null,
        },
        sections: sections.flatMap((section) => {
          const name = edition.sections?.[section.name];
          return name ? [{ sectionId: section.id, provenance: "human" as const, name }] : [];
        }),
        cards: cards.flatMap((card) => {
          const meaning = edition.meanings[card.term];
          return meaning ? [{ cardId: card.id, provenance: "human" as const, meaning }] : [];
        }),
      },
      publishers,
    );
    await approveEdition(as, deckId, edition.language, {}, publishers);
    await publishEdition(as, deckId, edition.language, publishers);
  }
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

const ENRICHED_SOURCES = {
  meaning: "meaningSource",
  example: "exampleSource",
  pronunciation: "pronunciationSource",
} as const;

export type EnrichedField = keyof typeof ENRICHED_SOURCES;

/**
 * Marks fields of one card as written by the enrichment, which is the only writer of "ai" and
 * needs a vendor key, so a screen can show the AI badge without one.
 */
export async function markEnriched(
  { db, userId }: ServiceContext,
  cardId: string,
  fields: readonly EnrichedField[],
): Promise<boolean> {
  const rows = await db
    .update(schema.cards)
    .set(Object.fromEntries(fields.map((field) => [ENRICHED_SOURCES[field], "ai"])))
    .where(and(eq(schema.cards.id, cardId), eq(schema.cards.userId, userId)))
    .returning({ id: schema.cards.id });
  return rows.length > 0;
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

  // A card with any direction reviewed in the last day may be waiting for tomorrow, so those go last.
  const recent = new Set(
    states
      .filter((s) => s.lastReview !== null && now.getTime() - s.lastReview.getTime() < DAY)
      .map((s) => s.cardId),
  );
  states.sort((a, b) => Number(recent.has(a.cardId)) - Number(recent.has(b.cardId)));

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

const SAMPLE_TERMS: [term: string, meaning: string][] = [
  ["la finestra", "the window"],
  ["il cassetto", "the drawer"],
  ["la sveglia", "the alarm clock"],
  ["il cuscino", "the pillow"],
  ["la scrivania", "the desk"],
  ["il lavandino", "the sink"],
  ["la tazza", "the cup"],
  ["il forno", "the oven"],
  ["la chiave", "the key"],
  ["il tetto", "the roof"],
  ["la scala", "the stairs"],
  ["il pavimento", "the floor"],
  ["la lampada", "the lamp"],
  ["il divano", "the sofa"],
  ["la coperta", "the blanket"],
  ["lo specchio", "the mirror"],
  ["la sedia", "the chair"],
  ["il bicchiere", "the glass"],
  ["la pentola", "the pot"],
  ["il frigorifero", "the fridge"],
];

/**
 * Add `count` new cards to the first deck the learner owns, or to a new one when there is none. Terms
 * come from a fixed list and then get a number, so repeated presses never collide.
 */
export async function addSampleCards(ctx: ServiceContext, count: number): Promise<number> {
  const decks = await listDecks(ctx);
  const owned = decks.filter((d) => d.role === "owner");
  const deckId =
    owned[0]?.id ??
    (
      await createDeck(ctx, {
        name: "Around the house",
        description: null,
        defaultLanguage: "it",
        directions: "recognition",
      })
    ).id;
  const [row = { n: 0 }] = await ctx.db
    .select({ n: sql<number>`count(*)` })
    .from(schema.cards)
    .where(eq(schema.cards.deckId, deckId));
  const inputs = Array.from({ length: count }, (_, i) => {
    const n = row.n + i;
    const [term, meaning] = SAMPLE_TERMS[n % SAMPLE_TERMS.length] as [string, string];
    const round = Math.floor(n / SAMPLE_TERMS.length);
    return { deckId, term: round ? `${term} ${round + 1}` : term, meaning };
  });
  const outcomes = await addCards(ctx, inputs);
  return outcomes.filter((o) => o.status === "added").length;
}

function askedStates(ctx: ServiceContext, dueOnly: boolean) {
  return ctx.db
    .select({ cardId: schema.cardStates.cardId, direction: schema.cardStates.direction })
    .from(schema.cardStates)
    .innerJoin(schema.cards, eq(schema.cards.id, schema.cardStates.cardId))
    .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
    .where(
      and(
        eq(schema.cardStates.userId, ctx.userId),
        dueOnly ? lte(schema.cardStates.due, new Date()) : undefined,
        isNull(schema.cards.archivedAt),
        isNull(schema.decks.archivedAt),
        inArray(schema.cardStates.direction, ["recognition", "production"]),
        asked,
      ),
    )
    .orderBy(asc(schema.cardStates.due));
}

function grade(
  ctx: ServiceContext,
  s: { cardId: string; direction: string },
  rating: Rating,
  reviewedAt?: Date,
) {
  return gradeCard(ctx, {
    cardId: s.cardId,
    direction: s.direction as "recognition" | "production",
    rating,
    reviewedAt,
  });
}

/**
 * Grade up to `count` due cards through the review service, as a learner would, so the goal,
 * the streak and the schedule all move. One direction per card, since the other waits for
 * tomorrow once one is graded.
 */
export async function recallCards(ctx: ServiceContext, count: number, rating: Rating = 3) {
  const graded = new Set<string>();
  for (const s of await askedStates(ctx, true)) {
    if (graded.size >= count) break;
    if (graded.has(s.cardId)) continue;
    await grade(ctx, s, rating);
    graded.add(s.cardId);
  }
  return graded.size;
}

/**
 * Grade Good until today's goal is met. Due cards go first; when they run out, the rest are
 * graded again in turn, since every accepted attempt counts toward the goal.
 */
export async function reachGoal(ctx: ServiceContext): Promise<number> {
  const before = (await streak(ctx)).today;
  const wanted = Math.max(0, before.goal - before.attempts);
  const states = await askedStates(ctx, false);
  if (wanted === 0 || states.length === 0) return 0;
  // A grade no later than the card's last one is dropped as a replay, so each is a millisecond on.
  let at = Date.now();
  for (let i = 0; i < wanted; i++) {
    at = Math.max(at + 1, Date.now());
    await grade(ctx, states[i % states.length] as (typeof states)[number], 3, new Date(at));
  }
  return (await streak(ctx)).today.attempts - before.attempts;
}

/** Cards an assistant added arrive without an example, so there is something left to enrich. */
export function asClaude(ctx: ServiceContext): ServiceContext {
  return { ...ctx, actor: "mcp", client: "dev-claude", clientName: "Claude" };
}

/**
 * Fill the example of up to `count` of the newest cards that have none, marked as written by
 * the AI and recorded as one enrichment each, the way a real enrichment run lands.
 */
export async function enrichSampleCards(ctx: ServiceContext, count: number): Promise<number> {
  const cards = await ctx.db
    .select({
      id: schema.cards.id,
      deckId: schema.cards.deckId,
      term: schema.cards.term,
      language: sql<
        string | null
      >`coalesce(${schema.cards.language}, ${schema.decks.defaultLanguage})`,
    })
    .from(schema.cards)
    .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
    .where(
      and(
        eq(schema.cards.userId, ctx.userId),
        isNull(schema.cards.archivedAt),
        isNull(schema.cards.example),
      ),
    )
    .orderBy(desc(schema.cards.createdAt))
    .limit(count);
  if (cards.length === 0) return 0;
  const ai: ServiceContext = { ...ctx, actor: "ai", client: undefined, clientName: undefined };
  const now = new Date();
  await runBatched(
    ctx.db,
    cards.flatMap((card) => {
      const example = card.language?.startsWith("it")
        ? `Dov'è ${card.term}?`
        : `An example sentence with “${card.term}”.`;
      return [
        ctx.db
          .update(schema.cards)
          .set({ example, exampleSource: "ai", updatedAt: now })
          .where(eq(schema.cards.id, card.id)),
        auditStatement(ai, {
          entity: "card",
          action: "enrich",
          id: card.id,
          deckId: card.deckId,
          details: { example },
        }),
      ];
    }),
  );
  return cards.length;
}

/** Forgot, Good, Forgot, Forgot, Good, Forgot: four lapses in six reviews, the slipping line. */
const SLIP_RATINGS: Rating[] = [1, 3, 1, 1, 3, 1];

/**
 * Give `count` cards a history of forgetting on past days that already hold reviews, so they
 * keep slipping without adding a reviewed day the streak did not have. Schedules are untouched.
 */
export async function slipCards(ctx: ServiceContext, count: number): Promise<number> {
  const { db, userId } = ctx;
  const fmt = dateFormatter(await reviewZone(ctx));
  const today = fmt.format(new Date());
  const past = (
    await db
      .select({ at: schema.reviews.reviewedAt, dayId: schema.reviews.reviewDayId })
      .from(schema.reviews)
      .where(eq(schema.reviews.userId, userId))
      .orderBy(desc(schema.reviews.reviewedAt))
      .limit(500)
  ).filter((r) => fmt.format(r.at) < today);
  if (past.length === 0) return 0;
  const states = await db
    .select({
      id: schema.cardStates.id,
      cardId: schema.cardStates.cardId,
      direction: schema.cardStates.direction,
      mode: schema.cardStates.mode,
      lastReview: schema.cardStates.lastReview,
    })
    .from(schema.cardStates)
    .innerJoin(schema.cards, eq(schema.cards.id, schema.cardStates.cardId))
    .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
    .where(
      and(
        eq(schema.cardStates.userId, userId),
        isNull(schema.cards.archivedAt),
        isNull(schema.decks.archivedAt),
        asked,
      ),
    )
    .orderBy(desc(schema.cardStates.lastReview));

  // A card reviewed today waits for tomorrow, so it would not show in today's round.
  const reviewedToday = new Set(
    states.filter((s) => s.lastReview && fmt.format(s.lastReview) === today).map((s) => s.cardId),
  );
  const chosen = new Map<string, (typeof states)[number]>();
  for (const s of states) {
    if (chosen.size >= count) break;
    if (!chosen.has(s.cardId) && !reviewedToday.has(s.cardId)) chosen.set(s.cardId, s);
  }
  const reviews = [...chosen.values()].flatMap((state, c) =>
    SLIP_RATINGS.map((rating, i) => {
      const slot = past[(c * SLIP_RATINGS.length + i) % past.length] as (typeof past)[number];
      return {
        id: crypto.randomUUID(),
        userId,
        cardId: state.cardId,
        cardStateId: state.id,
        direction: state.direction,
        mode: state.mode,
        rating,
        state: rating === 1 ? 3 : 2,
        elapsedDays: 1,
        scheduledDays: 1,
        stabilityAfter: 1,
        difficultyAfter: 8,
        // A minute apart, so the same slot never holds two identical timestamps.
        reviewedAt: new Date(slot.at.getTime() + (i + 1) * 60_000),
        reviewDayId: slot.dayId,
        source: "web" as const,
      };
    }),
  );
  const statements: unknown[] = [];
  for (let i = 0; i < reviews.length; i += 6) {
    statements.push(db.insert(schema.reviews).values(reviews.slice(i, i + 6)));
  }
  await runBatched(db, statements);
  return chosen.size;
}

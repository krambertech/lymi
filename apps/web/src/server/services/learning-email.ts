import {
  modeKey,
  modeOf,
  type ReviewMode,
  shownTranslation,
  termShowsPronunciation,
  textDirection,
} from "@lymi/core";
import { and, eq, gte, isNull, sql } from "@lymi/core/db";
import { createDb, type Db, schema } from "../db";
import { FLIP_LINK_DAYS, readFlipLink, signFlipLink, signUnsubscribeLink } from "../email/links";
import type { EmailCardSide } from "../email/template";
import type { Bindings } from "../env";
import { ownerAnalytics, trackProductEvent } from "../posthog";
import { reminderIsDue } from "../push-delivery";
import { analyticsContextFor } from "./analytics-context";
import { auditStatement } from "./audit";
import { presentCards } from "./card-view";
import { type ServiceContext, ServiceError } from "./context";
import { cardsById } from "./draw";
import {
  type LearningEmailData,
  learningBudgetLeft,
  sendTransactionalEmail,
  type TransactionalEmailKind,
} from "./email";
import { memberOf } from "./members";
import { catchUpStates } from "./modes";
import { reviewQueue } from "./review";

/** The learner-local hour a learning email goes out. */
const SEND_TIME = "10:00";
const DAY_MS = 86_400_000;

/** A step of the series before the queue decides between a due card and a new one. */
export type LearningStep = "first" | "how" | "nodeck" | "next" | "back" | "last";

export interface LearnerFacts {
  /** The learner-local day the account was made. */
  createdOn: string;
  /** Learner-local days with a review, from the log; null before the first. */
  firstReviewOn: string | null;
  lastReviewOn: string | null;
  reviewDays: number;
  /** Any active card, their own or in a deck they joined. */
  hasCards: boolean;
  /** A reminder subscription, which speaks for the first days itself. */
  hasPush: boolean;
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/**
 * The series, from what the learner has done. It counts from the last review, so a return resets
 * it on its own. Days 1 and 3 are for someone who tried one day and stopped; a learner with a
 * habit hears only on days 7 and 30, once notifications have stopped.
 */
export function learningStep(
  facts: LearnerFacts,
  today: string,
): { step: LearningStep; anchor: string } | null {
  const { lastReviewOn, createdOn } = facts;
  if (lastReviewOn) {
    const since = daysBetween(lastReviewOn, today);
    if (since === 7) return { step: "back", anchor: lastReviewOn };
    if (since === 30) return { step: "last", anchor: lastReviewOn };
    // Both days are the same step, so the day goes in the anchor or the second claim would fail.
    if (facts.reviewDays === 1 && !facts.hasPush && (since === 1 || since === 3))
      return { step: "next", anchor: `${lastReviewOn}+${since}` };
    return null;
  }
  const since = daysBetween(createdOn, today);
  if (!facts.hasCards) return since === 1 ? { step: "nodeck", anchor: createdOn } : null;
  if (since === 1) return { step: "first", anchor: createdOn };
  if (since === 3) return { step: "how", anchor: createdOn };
  return null;
}

type QueueItem = Awaited<ReturnType<typeof reviewQueue>>["items"][number];

/** Whether the email can draw this card: plain text on both sides, no picture, no reading over the term. */
function plain(item: QueueItem): boolean {
  const { card, mode } = item;
  if (mode.cue === "image" || !card.meaning) return false;
  return !termShowsPronunciation(card);
}

/** A card's sides in the direction review would ask them. */
function sides(
  item: QueueItem,
  meaningLanguage: string,
): { front: EmailCardSide; back: EmailCardSide } {
  const { card, mode } = item;
  const term: EmailCardSide = {
    text: card.term,
    lang: card.language ?? undefined,
    dir: textDirection(card.language),
  };
  const meaning: EmailCardSide = {
    text: card.meaning ?? "",
    lang: meaningLanguage,
    dir: textDirection(meaningLanguage),
  };
  return mode.cue === "meaning" ? { front: meaning, back: term } : { front: term, back: meaning };
}

const isNew = (item: QueueItem) => item.fsrsState === 0;

export interface LearningMessage {
  kind: TransactionalEmailKind;
  /** The card a Flip link opens; null when the email links straight to Review. */
  flip: QueueItem | null;
  data: Omit<LearningEmailData, "url" | "unsubscribeUrl">;
  path: string;
}

/**
 * Turns a step into a message from what review would ask now. A due card asks to be remembered;
 * only new cards means there is nothing to remember, so the email teaches one with both sides.
 */
export async function learningMessage(
  ctx: ServiceContext,
  step: LearningStep,
  meaningLanguage: string,
): Promise<LearningMessage | null> {
  if (step === "nodeck") {
    return {
      kind: "learning-nodeck",
      flip: null,
      data: { cards: 0, decks: 0, deckName: null, card: null },
      path: "/explore",
    };
  }
  await catchUpStates(ctx.db, ctx.userId);
  const { items, total } = await reviewQueue(ctx, { limit: 200 });
  if (items.length === 0) return null;
  const due = items.filter((item) => !isNew(item));
  const fresh = items.filter(isNew);
  const teaching = step === "first" || step === "how" || due.length === 0;
  const pool = teaching ? fresh : due;
  const shown = pool.find(plain) ?? null;
  const kind: TransactionalEmailKind =
    step === "first"
      ? "learning-first"
      : step === "how"
        ? "learning-how"
        : step === "back"
          ? "learning-back"
          : step === "last"
            ? "learning-last"
            : teaching
              ? "learning-new"
              : "learning-due";
  const whole = step === "back" || step === "last";
  const counted = whole ? items : pool;
  const deckId = (shown ?? pool[0] ?? items[0])?.card.deckId;
  const deckName = deckId ? await deckTitle(ctx.db, deckId) : null;
  const side = shown ? sides(shown, meaningLanguage) : null;
  return {
    kind,
    flip: teaching ? null : shown,
    data: {
      cards: step === "first" ? await deckSize(ctx.db, deckId) : whole ? total : pool.length,
      decks: new Set(counted.map((item) => item.card.deckId)).size,
      deckName,
      card: side ? (teaching ? side : { front: side.front }) : null,
    },
    path: "/review",
  };
}

async function deckTitle(db: Db, deckId: string): Promise<string | null> {
  const [row] = await db
    .select({ name: schema.decks.name })
    .from(schema.decks)
    .where(eq(schema.decks.id, deckId));
  return row?.name ?? null;
}

async function deckSize(db: Db, deckId: string | undefined): Promise<number> {
  if (!deckId) return 0;
  const [row] = await db
    .select({ cards: sql<number>`count(*)` })
    .from(schema.cards)
    .where(and(eq(schema.cards.deckId, deckId), isNull(schema.cards.archivedAt)));
  return row?.cards ?? 0;
}

async function factsOf(db: Db, userId: string, createdOn: string): Promise<LearnerFacts> {
  const [reviews] = await db.all<{ first: string | null; last: string | null; days: number }>(sql`
    SELECT min(d.date) AS first, max(d.date) AS last, count(DISTINCT d.date) AS days
      FROM reviews r JOIN review_days d ON d.id = r.review_day_id
     WHERE r.user_id = ${userId}
       AND NOT EXISTS (SELECT 1 FROM review_undos u WHERE u.review_id = r.id)`);
  const [cards] = await db.all<{ has: number }>(sql`
    SELECT EXISTS (
      SELECT 1 FROM cards c JOIN decks k ON k.id = c.deck_id
       WHERE k.user_id = ${userId} AND c.archived_at IS NULL AND k.archived_at IS NULL
    ) OR EXISTS (
      SELECT 1 FROM deck_members m WHERE m.user_id = ${userId} AND m.removed_at IS NULL
    ) AS has`);
  const [push] = await db.all<{ has: number }>(
    sql`SELECT EXISTS (SELECT 1 FROM push_subscriptions WHERE user_id = ${userId}) AS has`,
  );
  return {
    createdOn,
    firstReviewOn: reviews?.first ?? null,
    lastReviewOn: reviews?.last ?? null,
    reviewDays: reviews?.days ?? 0,
    hasCards: Boolean(cards?.has),
    hasPush: Boolean(push?.has),
  };
}

function localDate(at: Date, zone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: zone }).format(at);
}

export interface LearningDispatchResult {
  considered: number;
  sent: number;
  failed: number;
}

/** The headers and link that let a learner stop this email; RFC 8058 asks for a POST to the link. */
export async function unsubscribeUrls(
  env: Pick<Bindings, "BETTER_AUTH_SECRET" | "PRODUCT_URL">,
  userId: string,
  kind: TransactionalEmailKind,
) {
  const token = await signUnsubscribeLink(env.BETTER_AUTH_SECRET, { user: userId, kind });
  return {
    page: new URL(`/unsubscribe/${token}`, env.PRODUCT_URL).toString(),
    oneClick: new URL(`/api/email/unsubscribe/${token}`, env.PRODUCT_URL).toString(),
  };
}

/** Everything a learning email needs from the database and the links, for the cron and `/emails`. */
export async function composeLearning(
  env: Pick<Bindings, "BETTER_AUTH_SECRET" | "PRODUCT_URL">,
  ctx: ServiceContext,
  step: LearningStep,
  language: string,
  meaningLanguage: string,
  now: Date,
) {
  const message = await learningMessage(ctx, step, meaningLanguage);
  if (!message) return null;
  const { kind, flip } = message;
  const from = `from=email-${kind}`;
  const flipToken =
    flip &&
    (await signFlipLink(env.BETTER_AUTH_SECRET, {
      user: ctx.userId,
      card: flip.card.id,
      mode: modeKey(flip.mode),
      kind,
      language,
      expires: now.getTime() + FLIP_LINK_DAYS * DAY_MS,
    }));
  const path = flipToken ? `/flip/${flipToken}` : message.path;
  const stop = await unsubscribeUrls(env, ctx.userId, kind);
  return {
    kind,
    stop,
    learning: {
      ...message.data,
      url: new URL(`${path}?${from}`, env.PRODUCT_URL).toString(),
      unsubscribeUrl: stop.page,
    },
  };
}

/**
 * Each cron run, finds learners whose local send window just opened and sends the step their day
 * calls for. Off until `LEARNING_EMAILS_SINCE` is set, and only reaches accounts made on or after
 * that date, since older ones were never told at sign-up.
 */
export async function dispatchLearningEmails(
  env: Bindings,
  now: Date,
): Promise<LearningDispatchResult> {
  const summary: LearningDispatchResult = { considered: 0, sent: 0, failed: 0 };
  const since = Date.parse(env.LEARNING_EMAILS_SINCE ?? "");
  if (!Number.isFinite(since)) return summary;
  const db = createDb(env.DB);
  const rows = await db
    .select({
      id: schema.user.id,
      email: schema.user.email,
      createdAt: schema.user.createdAt,
      appLanguage: schema.userSettings.appLanguage,
      meaningLanguage: schema.userSettings.meaningLanguage,
      zone: schema.userSettings.reviewTimezone,
      allowed: schema.userSettings.learningEmails,
    })
    .from(schema.user)
    .leftJoin(schema.userSettings, eq(schema.userSettings.userId, schema.user.id))
    .where(and(eq(schema.user.emailVerified, true), gte(schema.user.createdAt, new Date(since))));

  const reports: Promise<unknown>[] = [];
  const analyticsFor = ownerAnalytics(env, db, (work) => reports.push(work));
  for (const row of rows) {
    if (row.allowed === false) continue;
    const zone = row.zone ?? "UTC";
    const moment = reminderIsDue(now, zone, SEND_TIME);
    if (!moment) continue;
    summary.considered += 1;
    const facts = await factsOf(db, row.id, localDate(row.createdAt, zone));
    const next = learningStep(facts, moment.localDate);
    if (!next) continue;

    // Claimed before anything else, because the window spans two runs and the second must stop here.
    const claimed = await db
      .insert(schema.learningEmails)
      .values({ userId: row.id, kind: next.step, anchor: next.anchor, sentAt: now })
      .onConflictDoNothing()
      .returning({ userId: schema.learningEmails.userId });
    if (claimed.length === 0) continue;
    const release = () =>
      db
        .delete(schema.learningEmails)
        .where(
          and(
            eq(schema.learningEmails.userId, row.id),
            eq(schema.learningEmails.kind, next.step),
            eq(schema.learningEmails.anchor, next.anchor),
          ),
        );

    const ctx: ServiceContext = {
      db,
      userId: row.id,
      actor: "system",
      analytics: analyticsFor(row.id),
    };
    const language = row.appLanguage ?? "en";
    try {
      const composed = await composeLearning(
        env,
        ctx,
        next.step,
        language,
        row.meaningLanguage ?? language,
        now,
      );
      if (!composed) continue;
      if (!(await learningBudgetLeft(env.SESSIONS))) {
        await release();
        break;
      }
      await sendTransactionalEmail(ctx, env, {
        kind: composed.kind,
        to: row.email,
        language,
        learning: composed.learning,
        headers: {
          "List-Unsubscribe": `<${composed.stop.oneClick}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });
      summary.sent += 1;
    } catch (error) {
      // A ServiceError means the provider refused it. Anything later, such as the audit row, came
      // after delivery, and releasing then would send the email twice.
      const undelivered = error instanceof ServiceError;
      if (undelivered) await release();
      summary.failed += undelivered ? 1 : 0;
      summary.sent += undelivered ? 0 : 1;
      console.error(JSON.stringify({ event: "learning_email_failed", undelivered }));
    }
  }
  await Promise.all(reports);
  console.log(JSON.stringify({ event: "learning_emails_dispatched", ...summary }));
  return summary;
}

/** Turns learning emails off from a signed link, a bounce or a complaint. Repeating it changes nothing. */
export async function stopLearningEmails(
  env: Bindings,
  db: Db,
  userId: string,
  kind: TransactionalEmailKind | undefined,
  via: "one_click" | "footer" | "bounce" | "complaint",
): Promise<void> {
  const [row] = await db
    .select({ id: schema.user.id, allowed: schema.userSettings.learningEmails })
    .from(schema.user)
    .leftJoin(schema.userSettings, eq(schema.userSettings.userId, schema.user.id))
    .where(eq(schema.user.id, userId));
  // An email outlives a deleted account, and there is nothing left for its link to turn off.
  if (!row || row.allowed === false) return;
  const ctx: ServiceContext = { db, userId, actor: "system" };
  await db.insert(schema.userSettings).values({ userId }).onConflictDoNothing();
  await db.batch([
    db
      .update(schema.userSettings)
      .set({ learningEmails: false, updatedAt: new Date() })
      .where(eq(schema.userSettings.userId, userId)),
    auditStatement(ctx, {
      entity: "account",
      action: "email.learning_choice",
      id: userId,
      details: { allowed: false, via },
    }),
  ]);
  await trackProductEvent(
    env,
    userId,
    { name: "email_unsubscribed", ...(kind ? { kind } : {}), via },
    undefined,
    analyticsContextFor(db, userId),
  );
}

export type FlipView =
  | { status: "invalid" }
  | { status: "expired"; language: string }
  | {
      status: "ok";
      language: string;
      kind: string;
      mode: ReviewMode;
      deckName: string | null;
      card: {
        id: string;
        term: string;
        meaning: string | null;
        language: string | null;
        pronunciation: string | null;
        example: string | null;
        exampleTranslation: string | null;
      };
      /** Whether this reader is the learner, so a grade would count. */
      canGrade: boolean;
      /** The learner already graded this card after the email went out. */
      graded: boolean;
    };

/** What a Flip link shows. It reads only; a mail scanner opening it changes nothing. */
export async function readFlip(
  env: Pick<Bindings, "BETTER_AUTH_SECRET">,
  db: Db,
  token: string,
  sessionUserId: string | null,
  now = new Date(),
): Promise<FlipView> {
  const link = await readFlipLink(env.BETTER_AUTH_SECRET, token);
  if (!link) return { status: "invalid" };
  if (link.expires < now.getTime()) return { status: "expired", language: link.language };
  const ctx: ServiceContext = { db, userId: link.user, actor: "system" };
  const stored = (await cardsById(ctx, [link.card])).get(link.card);
  const [card] = stored ? await presentCards(db, [stored], link.user) : [];
  if (!card || card.archivedAt) return { status: "expired", language: link.language };
  const [deck] = await db
    .select({ id: schema.decks.id })
    .from(schema.decks)
    .where(
      and(eq(schema.decks.id, card.deckId), isNull(schema.decks.archivedAt), memberOf(link.user)),
    );
  if (!deck) return { status: "expired", language: link.language };
  const issued = new Date(link.expires - FLIP_LINK_DAYS * DAY_MS);
  const [graded] = await db
    .select({ id: schema.reviews.id })
    .from(schema.reviews)
    .where(
      and(
        eq(schema.reviews.userId, link.user),
        eq(schema.reviews.cardId, link.card),
        gte(schema.reviews.reviewedAt, issued),
        sql`NOT EXISTS (SELECT 1 FROM review_undos u WHERE u.review_id = ${schema.reviews.id})`,
      ),
    )
    .limit(1);
  return {
    status: "ok",
    language: link.language,
    kind: link.kind,
    mode: modeOf(link.mode),
    deckName: await deckTitle(db, card.deckId),
    card: {
      id: card.id,
      term: card.term,
      meaning: card.meaning,
      language: card.language,
      pronunciation: card.pronunciation,
      example: card.example,
      exampleTranslation: shownTranslation(card),
    },
    canGrade: sessionUserId === link.user,
    graded: Boolean(graded),
  };
}

import { msg, plural } from "@lingui/core/macro";
import { type Reminder, type ReminderMessage, reminderFor, remindersQuiet } from "@lymi/core";
import { backlogOf, REMINDER_ENTRY, REMINDER_MESSAGE_KEY } from "@lymi/core/analytics";
import { createDb } from "./db";
import { outcomeOfStatus, recordCall } from "./dependency-health";
import type { Bindings } from "./env";
import { serverI18n } from "./i18n";
import { trackProductEvent } from "./posthog";
import { analyticsContextFor } from "./services/analytics-context";
import { drawableCount } from "./services/draw";
import { catchUpStates } from "./services/modes";
import { streak } from "./services/review-days";

export interface ReminderCandidate {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  reminder_time: string;
  timezone: string;
  last_sent_local_date: string | null;
  app_language: string | null;
  review_timezone: string | null;
  /** When the learner last opened Lymi, or when this device opted in before that was recorded. */
  last_opened_at: number;
}

interface ReminderMoment {
  localDate: string;
  minutes: number;
}

export interface ReminderDispatchResult {
  considered: number;
  sent: number;
  /** Devices left alone because their learner has stayed away for a week. */
  quiet: number;
  expired: number;
  failed: number;
}

type SendPush = (candidate: ReminderCandidate, reminder: Reminder, env: Bindings) => Promise<void>;
/** What the learner can review, by the same rule the queue uses (ADR 0019), and how the day went. */
export type DayOf = (
  userId: string,
  zone: string,
  now: Date,
) => Promise<{ reminder: Reminder | null; due: number }>;

const dayWith =
  (db: ReturnType<typeof createDb>): DayOf =>
  async (userId, zone, now) => {
    await catchUpStates(db, userId, now);
    const ctx = { db, userId, actor: "system" } as const;
    const [due, { today, days, goal }] = await Promise.all([
      drawableCount(ctx, { now, zone }),
      streak(ctx, { zone, now }),
    ]);
    return { reminder: reminderFor({ date: today.date, days, due, goal }), due };
  };

/** Local date and wall-clock time at an instant, including daylight-saving changes. */
export function reminderMoment(now: Date, timezone: string): ReminderMoment {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    localDate: `${value("year")}-${value("month")}-${value("day")}`,
    minutes: Number(value("hour")) * 60 + Number(value("minute")),
  };
}

/** Two cron intervals allow one retry after a transient send failure. */
export function reminderIsDue(
  now: Date,
  timezone: string,
  reminderTime: string,
): ReminderMoment | null {
  const moment = reminderMoment(now, timezone);
  const [hour, minute] = reminderTime.split(":").map(Number);
  const target = (hour ?? 0) * 60 + (minute ?? 0);
  const elapsedMinutes = (moment.minutes - target + 24 * 60) % (24 * 60);
  if (elapsedMinutes >= 30) return null;

  // The retry for a 23:45 reminder happens just after midnight. Claim the date on
  // which its reminder window began so this send does not consume the next day.
  if (moment.minutes < target) {
    return {
      ...moment,
      localDate: reminderMoment(new Date(now.getTime() - elapsedMinutes * 60 * 1_000), timezone)
        .localDate,
    };
  }
  return moment;
}

export async function reminderCopy({ message, count }: Reminder, locale = "en") {
  const i18n = await serverI18n(locale);
  switch (message) {
    case "to_goal":
      return {
        title: i18n._(
          msg`${plural(count, {
            one: "# card to today’s goal",
            other: "# cards to today’s goal",
          })}`,
        ),
        body: i18n._(msg`Finish if you have a moment.`),
      };
    case "after_rest":
      return {
        title: i18n._(msg`Yesterday was a rest day`),
        body: i18n._(
          msg`${plural(count, {
            one: "Your streak carried on. # card is ready.",
            other: "Your streak carried on. # cards are ready.",
          })}`,
        ),
      };
    case "next_cards":
      return {
        title: i18n._(
          msg`${plural(count, {
            one: "Your next card is ready",
            other: "Your next cards are ready",
          })}`,
        ),
        body: i18n._(
          msg`${plural(count, { one: "# card for today.", other: "# cards for today." })}`,
        ),
      };
    default:
      return {
        title: i18n._(
          msg`${plural(count, {
            one: "# card is ready",
            other: "# cards are ready",
          })}`,
        ),
        body: i18n._(msg`Review whenever you have a moment.`),
      };
  }
}

/** The query names the reminder as the way in, for app_opened and reminder_opened, which drop it once counted. */
export function reminderLink(message: ReminderMessage, productUrl: string): string {
  const link = new URL("/review", productUrl);
  link.searchParams.set(REMINDER_ENTRY.key, REMINDER_ENTRY.value);
  link.searchParams.set(REMINDER_MESSAGE_KEY, message);
  return link.toString();
}

async function sendWebPush(candidate: ReminderCandidate, reminder: Reminder, env: Bindings) {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) {
    throw new Error("VAPID secrets are not configured");
  }
  const copy = await reminderCopy(reminder, candidate.app_language ?? "en");
  const navigate = reminderLink(reminder.message, env.PRODUCT_URL);
  const icon = new URL("/icons/icon-192.png", env.PRODUCT_URL).toString();
  const payload = JSON.stringify({
    // Declarative Web Push is a fallback on supporting WebKit versions; the service worker
    // handles the same payload everywhere else.
    web_push: 8030,
    notification: {
      title: copy.title,
      body: copy.body,
      navigate,
      icon,
    },
  });
  // `web-push` is CommonJS. Keep it off the request path and out of Worker test discovery;
  // the production build bundles it for this scheduled path.
  const { default: webpush } = await import("web-push");
  await webpush.sendNotification(
    { endpoint: candidate.endpoint, keys: { p256dh: candidate.p256dh, auth: candidate.auth } },
    payload,
    {
      TTL: 60 * 60,
      urgency: "normal",
      topic: "daily-review",
      // Pass VAPID values per request. Avoid mutable module-level configuration in a reused
      // Worker isolate.
      vapidDetails: {
        subject: env.VAPID_SUBJECT,
        publicKey: env.VAPID_PUBLIC_KEY,
        privateKey: env.VAPID_PRIVATE_KEY,
      },
    },
  );
}

/**
 * Find each device whose local reminder window is open and whose learner has been here this
 * week, choose the day's message, claim that local date atomically, then send. A retry cannot
 * duplicate successful sends; transient failures release the claim.
 */
export async function dispatchReviewReminders(
  env: Bindings,
  now: Date,
  send: SendPush = sendWebPush,
  dayOf: DayOf = dayWith(createDb(env.DB)),
): Promise<ReminderDispatchResult> {
  const db = createDb(env.DB);
  const reports: Promise<void>[] = [];
  // A learner with several devices is read once per dispatch.
  const reads = new Map<string, ReturnType<DayOf>>();
  const dayOnce: DayOf = (userId, zone, at) => {
    const key = `${userId}|${zone}`;
    const pending = reads.get(key) ?? dayOf(userId, zone, at);
    reads.set(key, pending);
    return pending;
  };
  const { results } = await env.DB.prepare(
    `SELECT ps.id, ps.user_id, ps.endpoint, ps.p256dh, ps.auth, ps.reminder_time, ps.timezone,
       ps.last_sent_local_date,
       us.app_language, us.review_timezone,
       COALESCE(us.last_opened_at, ps.created_at) AS last_opened_at
       FROM push_subscriptions ps
       LEFT JOIN user_settings us ON us.user_id = ps.user_id`,
  ).all<ReminderCandidate>();

  const summary: ReminderDispatchResult = {
    considered: results.length,
    sent: 0,
    quiet: 0,
    expired: 0,
    failed: 0,
  };

  for (const candidate of results) {
    const moment = reminderIsDue(now, candidate.timezone, candidate.reminder_time);
    if (!moment || candidate.last_sent_local_date === moment.localDate) continue;
    if (remindersQuiet(new Date(candidate.last_opened_at), now)) {
      summary.quiet += 1;
      continue;
    }
    // The review day follows the review zone; the device zone only says when to remind.
    const { reminder, due } = await dayOnce(
      candidate.user_id,
      candidate.review_timezone ?? candidate.timezone,
      now,
    );
    if (!reminder) continue;

    const claim = await env.DB.prepare(
      `UPDATE push_subscriptions
          SET last_sent_local_date = ?, updated_at = ?
        WHERE id = ?
          AND (last_sent_local_date IS NULL OR last_sent_local_date <> ?)`,
    )
      .bind(moment.localDate, now.getTime(), candidate.id, moment.localDate)
      .run();
    if ((claim.meta.changes ?? 0) === 0) continue;

    const started = Date.now();
    try {
      await send(candidate, reminder, env);
      recordCall(env, { dependency: "web_push", outcome: "ok", durationMs: Date.now() - started });
      summary.sent += 1;
      reports.push(
        trackProductEvent(
          env,
          candidate.user_id,
          { name: "reminder_sent", backlog: backlogOf(due), message: reminder.message },
          undefined,
          analyticsContextFor(db, candidate.user_id),
        ),
      );
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      const gone = statusCode === 404 || statusCode === 410;
      recordCall(env, {
        dependency: "web_push",
        outcome: gone ? "gone" : statusCode ? outcomeOfStatus(statusCode) : "unreachable",
        status: statusCode,
        durationMs: Date.now() - started,
      });
      if (gone) {
        await env.DB.prepare("DELETE FROM push_subscriptions WHERE id = ?")
          .bind(candidate.id)
          .run();
        summary.expired += 1;
        continue;
      }
      await env.DB.prepare(
        `UPDATE push_subscriptions
            SET last_sent_local_date = NULL, updated_at = ?
          WHERE id = ? AND last_sent_local_date = ?`,
      )
        .bind(now.getTime(), candidate.id, moment.localDate)
        .run();
      summary.failed += 1;
      console.error(JSON.stringify({ event: "review_reminder_failed", statusCode }));
    }
  }

  await Promise.all(reports);
  console.log(JSON.stringify({ event: "review_reminders_dispatched", ...summary }));
  return summary;
}

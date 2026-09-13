import { msg, plural } from "@lingui/core/macro";
import type { Bindings } from "./env";
import { serverI18n } from "./i18n";
import { askedSql } from "./services/modes";

interface ReminderCandidate {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  reminder_time: string;
  timezone: string;
  last_sent_local_date: string | null;
  app_language: string | null;
  due_count: number;
}

interface ReminderMoment {
  localDate: string;
  minutes: number;
}

export interface ReminderDispatchResult {
  considered: number;
  sent: number;
  expired: number;
  failed: number;
}

type SendPush = (candidate: ReminderCandidate, due: number, env: Bindings) => Promise<void>;

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

export async function reminderCopy(due: number, locale = "en") {
  const i18n = await serverI18n(locale);
  return {
    title: due === 1 ? i18n._(msg`One card is ready`) : i18n._(msg`A few cards are ready`),
    body: i18n._(
      msg`${plural(due, {
        one: "One card is waiting when you have a moment.",
        other: "# cards are waiting when you have a moment.",
      })}`,
    ),
  };
}

async function sendWebPush(candidate: ReminderCandidate, due: number, env: Bindings) {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) {
    throw new Error("VAPID secrets are not configured");
  }
  const copy = await reminderCopy(due, candidate.app_language ?? "en");
  const navigate = new URL("/review", env.PRODUCT_URL).toString();
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
 * Find each device whose local reminder window is open, claim that local date atomically,
 * then send. A retry cannot duplicate successful sends; transient failures release the claim.
 */
export async function dispatchReviewReminders(
  env: Bindings,
  now: Date,
  send: SendPush = sendWebPush,
): Promise<ReminderDispatchResult> {
  const { results } = await env.DB.prepare(
    `SELECT ps.id, ps.endpoint, ps.p256dh, ps.auth, ps.reminder_time, ps.timezone,
       ps.last_sent_local_date,
       us.app_language,
       (SELECT count(DISTINCT c.id)
          FROM card_states s
          JOIN cards c ON c.id = s.card_id
          JOIN decks d ON d.id = c.deck_id
         WHERE s.user_id = ps.user_id
           AND (d.user_id = ps.user_id
                OR EXISTS (SELECT 1 FROM deck_members m
                            WHERE m.deck_id = d.id AND m.user_id = ps.user_id
                              AND m.removed_at IS NULL))
           AND s.due <= ?
           AND c.archived_at IS NULL
           AND d.archived_at IS NULL
           AND ${askedSql("s.direction", { cards: "c", decks: "d" })}) AS due_count
       FROM push_subscriptions ps
       LEFT JOIN user_settings us ON us.user_id = ps.user_id`,
  )
    .bind(now.getTime())
    .all<ReminderCandidate>();

  const summary: ReminderDispatchResult = {
    considered: results.length,
    sent: 0,
    expired: 0,
    failed: 0,
  };

  for (const candidate of results) {
    if (Number(candidate.due_count) < 1) continue;
    const moment = reminderIsDue(now, candidate.timezone, candidate.reminder_time);
    if (!moment || candidate.last_sent_local_date === moment.localDate) continue;

    const claim = await env.DB.prepare(
      `UPDATE push_subscriptions
          SET last_sent_local_date = ?, updated_at = ?
        WHERE id = ?
          AND (last_sent_local_date IS NULL OR last_sent_local_date <> ?)`,
    )
      .bind(moment.localDate, now.getTime(), candidate.id, moment.localDate)
      .run();
    if ((claim.meta.changes ?? 0) === 0) continue;

    try {
      await send(candidate, Number(candidate.due_count), env);
      summary.sent += 1;
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
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

  console.log(JSON.stringify({ event: "review_reminders_dispatched", ...summary }));
  return summary;
}

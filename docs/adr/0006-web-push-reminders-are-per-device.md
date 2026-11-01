---
status: accepted
date: 2026-09-06
---

# Web Push reminders are enabled per device

Lymi needs review reminders that work when the app is closed. The app is already a PWA on one Cloudflare Worker, and the first version does not need campaigns, segmentation or a second notification dashboard.

We use standards-based Web Push with one VAPID identity and send directly from the existing Worker. Each browser installation opts in separately and stores its push endpoint, keys, local reminder time and IANA timezone in D1. A UTC Cron Trigger runs every 15 minutes. It evaluates the wall-clock time in each stored timezone, chooses the day's message, and sends nothing on a day that needs none. Before sending, it atomically claims that device's local date; successful sends cannot be duplicated by Cloudflare's at-least-once scheduling, while transient failures release the claim for one retry at the next cron interval.

Installation and notification permission are separate, explicit choices. Chromium gets an in-app button backed by `beforeinstallprompt`. iPhone and iPad get Add to Home Screen instructions because Web Push is available there only to installed web apps. Notification permission is requested only after the learner turns on the reminder. Copy names what is ready without streak pressure, overdue language or guilt.

One reminder a day still goes out, at the learner's time, and its message follows how the day went; [How a review works](../review.md#one-reminder-a-day-follows-how-the-day-went) has the rules. Since November 2026 one message names the streak: the morning after a rest day says “Yesterday was a rest day” and “Your streak carried on”. It reports good news that already happened, in the words Today shows. A reminder never warns ahead of a miss, counts down, or mentions a streak that ended. Web push stops 7 days after the learner last opened Lymi on any client and starts again when they return, so a browser no longer hears from Lymi forever. The phone schedules a week ahead, so its week runs from the last time that phone opened.

## Considered options

- OneSignal or Firebase Cloud Messaging. Rejected for now: another SDK, control plane and data processor for one daily transactional reminder. A managed provider remains an option if Lymi later needs campaigns or multiple channels.
- Periodic Background Sync or a client timer. Rejected: neither can reliably wake every supported browser at a chosen time, particularly on iOS.
- A Durable Object alarm per learner. Rejected for now: one idempotent D1 scan handles the current volume without another binding.
- One account-wide subscription setting. Rejected: permission and push subscriptions belong to a browser installation. Enabling a laptop must not silently opt in a phone.

## Consequences

- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` are required Worker secrets before reminders can be enabled.
- Push endpoints are bearer capabilities. They are accepted only from an authenticated learner session, never returned by the API, and removed on unsubscribe or a 404/410 response from the push service.
- A push endpoint has one learner owner. Opting in after changing accounts in the same browser transfers that endpoint, so the previous account cannot keep sending reminders to the shared device.
- Normal delivery starts at the selected quarter-hour. A delayed trigger or one transient failure may deliver during the following 15-minute interval. Timezones follow daylight-saving changes through `Intl`, but travel updates the stored timezone only when that device saves its reminder again.
- A person may opt in on several devices and receive one reminder on each. Every device can be turned off independently.
- Notification content stays generic because it can appear on a lock screen: counts, the goal and the streak, never vocabulary or lesson material. Tapping opens the review queue.
- `user_settings.last_opened_at` is set by `POST /api/review/today`, the call each client makes when it opens or returns to the front. A connected app's call does not set it. A device whose learner has no opening recorded counts its week from opting in.

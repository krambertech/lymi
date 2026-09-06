---
status: accepted
date: 2026-09-06
---

# Review reminders use direct Web Push and are enabled per device

Lymi needs a gentle way to bring a learner back when FSRS has cards ready, including when the app is closed. The app is already a PWA on one Cloudflare Worker, and the first version does not need campaigns, segmentation or a second notification dashboard.

We use standards-based Web Push with one VAPID identity and send directly from the existing Worker. Each browser installation opts in separately and stores its push endpoint, keys, local reminder time and IANA timezone in D1. A UTC Cron Trigger runs every 15 minutes. It evaluates the wall-clock time in each stored timezone, counts distinct due cards in active decks, and sends nothing when the count is zero. Before sending, it atomically claims that device's local date; successful sends cannot be duplicated by Cloudflare's at-least-once scheduling, while transient failures release the claim for one retry at the next cron interval.

Installation and notification permission are separate, explicit choices. Chromium gets an in-app button backed by `beforeinstallprompt`. iPhone and iPad get Add to Home Screen instructions because Web Push is available there only to installed web apps. Notification permission is requested only after the learner turns on the reminder. Copy names what is ready without streak pressure, overdue language or guilt.

## Considered options

- OneSignal or Firebase Cloud Messaging. Rejected for now: another SDK, control plane and data processor for one daily transactional reminder. A managed provider remains an option if Lymi later needs campaigns or multiple channels.
- Periodic Background Sync or a client timer. Rejected: neither can reliably wake every supported browser at a chosen time, particularly on iOS.
- A Durable Object alarm per learner. Rejected for now: stronger scheduling machinery and another binding are unnecessary while one idempotent D1 scan is small.
- One account-wide subscription setting. Rejected: permission and push subscriptions belong to a browser installation. Enabling a laptop must not silently opt in a phone.

## Consequences

- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` are required Worker secrets before reminders can be enabled.
- Push endpoints are bearer capabilities. They are accepted only from an authenticated learner session, never returned by the API, and removed on unsubscribe or a 404/410 response from the push service.
- A push endpoint has one learner owner. Opting in after changing accounts in the same browser transfers that endpoint, so the previous account cannot keep sending reminders to the shared device.
- Normal delivery starts at the selected quarter-hour. A delayed trigger or one transient failure may deliver during the following 15-minute interval. Timezones follow daylight-saving changes through `Intl`, but travel updates the stored timezone only when that device saves its reminder again.
- A person may opt in on several devices and receive one reminder on each. Every device can be turned off independently.
- Notification content stays generic because it can appear on a lock screen. Tapping opens the review queue; the payload never contains vocabulary or lesson material.

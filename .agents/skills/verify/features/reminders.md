# Daily reminder

One web push a day at the learner's time, whose message follows how the day went, silent once the goal is met, and quiet after a week away. The choice is `reminderFor` in `packages/core/src/reminders.ts`; the rules are in [How a review works](../../../../docs/review.md#one-reminder-a-day-follows-how-the-day-went).

## Reach

Settings turns it on per device; the Worker's cron sends it, and its link opens `/review`.

## Drive

[`reminders.mjs`](reminders.mjs), as `rested`: subscribe a real Chrome profile with a real push endpoint, fire the cron at `/cdn-cgi/handler/scheduled`, read the service worker's notification, open its link, then meet the goal and fire again.

## End state

The notification reads **Yesterday was a rest day** with **Your streak carried on. N cards are ready.** Its link carries `lymi_reminder=after_rest` and opens a review. After the goal is met the second cron shows nothing, while `/api/dev/state` still has cards due. The Worker's log prints `review_reminders_dispatched` with what each run sent and how many devices were `quiet`.

## Gotchas

- `apps/web/.dev.vars` needs `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT`; make a local pair with `webpush.generateVAPIDKeys()`. Without them the cron counts a failed send and `/api/push/config` answers 503.
- `PRODUCT_URL` must be this server's origin, or the service worker sends the link to plain `/review` because its origin differs. After editing `.dev.vars`, touch `apps/web/wrangler.jsonc` so the Worker reloads it.
- Only Google Chrome reaches a push service; Playwright's bundled Chromium cannot subscribe, and the recipe needs Chrome installed.
- A push can take a while on a loaded machine, so the recipe waits up to a minute. Chrome can lose the first push to a new profile while the cron still counts it as sent; run the recipe again before reading that as a bug.
- Dev never sends to PostHog, so `reminder_sent` and `reminder_opened` are proved by unit tests, and `reminder_opened` in production by a live event.
- To see the week's stop, set `learner_openings.opened_at` back 8 days with `wrangler d1 execute lymi --local`, before anything reopens the page: the log counts `quiet: 1`, and `POST /api/review/today` starts reminders again.

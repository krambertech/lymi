# Daily reminder

One ordinary notification a day at the learner's time, planned a week ahead on the phone, whose message follows how the day went. The choice is `reminderFor` in `packages/core/src/reminders.ts`; the rules are in [How a review works](../../../../docs/review.md#one-reminder-a-day-follows-how-the-day-went).

## Reach

**You**, then **Remind me to review**. `ReminderSync` plans on launch, after a grade and on returning to the front.

## Drive

[`reminders.yaml`](reminders.yaml), as `learner`: turn the reminder on, allow notifications, and check the time row. That proves the setting; seeing a notification fire takes the steps under Gotchas.

## End state

The switch stays on and **Time** shows. In the Simulator's log, SpringBoard lists 7 pending notifications from `app.lymi`, the last at most a week ahead.

## Gotchas

- To fire one now without touching the time wheel, launch with a shifted zone, so the stored time is a minute away: `SIMCTL_CHILD_TZ=<POSIX zone> xcrun simctl launch <udid> app.lymi`, then open the dev client on its Metro URL. A zone is written like `XXX+06:46:10`, and the app's day still follows the review zone.
- Leave the app before it fires, with Home: a reminder that fires in the app stays silent on purpose. The banner can come a few seconds late; swipe down from the top for Notification Center.
- Maestro's taps don't reach a notification there. Swipe it right to open it, which lands on a review. Swipe it left, then **View**, for **Review now** and **In an hour**. The Simulator tool's touches work for both.
- Typing into the time wheel is unreliable: digits land in the wrong column.
- To read what's pending: `xcrun simctl spawn <udid> log show --last 2m --predicate 'process == "SpringBoard" AND eventMessage CONTAINS "app.lymi"'`.
- Dev sends nothing to PostHog, so `reminder_opened` is proved by unit tests.

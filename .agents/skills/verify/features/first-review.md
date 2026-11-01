# First review

An account's first review teaches itself once, then ends on four screens under one lantern that stays put: success, time a day, the reminder, and when to come back. [Getting started](../../../../docs/design/onboarding.md#the-first-review) owns the behavior.

## Reach

`/review` on an account with no review days.

## Drive

[`first-review.mjs`](first-review.mjs), as `fresh`: give the account a deck of two cards through the API, grade both, and walk the end.

## End state

The first card shows **Try to remember what this means.** The first grade shows **… comes back …** and waits for **Next card**. The end opens on **You finished your first review** with **You started your streak**. Choosing **15 minutes** saves `dailyGoal` 50. The last screen says **See you …**, repeats **15 minutes a day**, and offers **Add more cards** and **Done**.

## Gotchas

- A local server has no push key, so the reminder step is skipped. To see it, stand in for `navigator.serviceWorker`, `Notification` and `/api/push/config` in the browser.
- The first review's teaching is off in `e2e`, which sets `lymi-no-first-review`.
- A headless browser's `Notification.permission` can be `denied`, which also skips the step.

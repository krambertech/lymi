# Offline grades

A grade made while nothing reaches the server waits on the device and counts on the server once the connection returns. Whatever screen is open then follows it, with no review open: the streak, the deck counts, the rounds and Insights all refetch.

## Reach

Grade a card in `/review` while the device is offline, then leave Review before the connection returns.

## Drive

[`offline-grades.mjs`](offline-grades.mjs), as `learner` from Today: abort `POST /api/review/grade`, grade one card **Good**, go to Today, then let grades through and fire the browser's `online` event.

## End state

Before the replay Today shows **9 cards due today** and `/api/stats/streak` reports 0 attempts. After it, with no reload and no visit to Review, Today shows **8 cards due today**, the stored streak reports 1 attempt, and no `lymi-outbox` grade waits unsent.

## Gotchas

- Cut the grade only: Today still needs its reads, so aborting everything tests a different failure.
- The aborted requests log `ERR_INTERNET_DISCONNECTED` in the console; those are expected here and nowhere else.
- Unrouting fires nothing by itself, so the recipe dispatches `online`, which is what the browser sends when the connection returns.

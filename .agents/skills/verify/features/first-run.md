# First run

Today for an account that has never reviewed: a dashed guide with three steps (Create a deck, Add cards, Finish your first review), then ways to create a first deck and ready-made decks under **I'm learning**. The first visit sets the account up on a goal of 25, and the end of its first review offers the daily goal and an evening reminder. `/welcome` lands on Today.

## Reach

Any account with no reviews, on `/today`. A published deck's add page or a join link lands a new account there too.

## Drive

[`first-run.mjs`](first-run.mjs), as `fresh` from `/today`: check the guide, choose a ready-made deck's language under **I'm learning** and press **Add**, reveal and grade every card, then go back to Today.

## End state

On arrival `/api/settings` has an `onboardedAt` and a `dailyGoal` of 25, and the guide reads **0 of 3 done**. Adding the deck opens `/review?deck=<id>`. The end of that review shows **Your daily goal** with Steady chosen. Back on Today the guide is gone and Today's due card shows instead.

## Gotchas

- The local catalogue holds only the `publisher` persona's decks, so seed it once (`pnpm local seed --as publisher`) or the ready-made section does not show.
- The reminder row needs push support and a server key; headless Chromium locally has neither, so the recipe does not check it.

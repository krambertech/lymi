# Today

The phone's first tab: today's due count under the lantern, the streak, the decks with cards due, and the lists of cards forgotten today, new cards and cards often forgotten. ADR 0030 makes it the phone's daily job.

## Reach

The **Today** tab, which is where the app opens after sign-in.

## Drive

[`today.yaml`](today.yaml), as `learner`: open Today, check **N cards due today** and **Streak: N days in a row**, check **Decks to review**, then scroll to **Also on your list** and check **Forgotten today** reads 0.

## End state

The due count and streak on screen are the ones `/api/dev/state` and `/api/stats/streak` hold, which [`today.mjs`](today.mjs) passes to the flow. Opening Today writes nothing, so the stored due and review counts are unchanged afterwards.

## Gotchas

- The tab bar is iOS's own, so its labels are the only landmark that the app is signed in; Today, Library, Explore and You each match a tab.
- The learner's total due is always 9, but which decks hold those cards and the seeded review count follow the clock, so assert totals rather than one deck's count.
- The count is one accessibility element, **9 cards due today**, not the big number on its own.

# Rest day

A past day that fell short keeps the run when the run had no other rest day in the six days before it. Every week of lights draws that day's glass edged in dashes and names it as a rest day, and Today mentions it once, the morning after. The rule is `summariseStreak` in `packages/core`.

## Reach

Today's streak card and banner, the end of a review, and the streak page.

## Drive

[`rest-day.mjs`](rest-day.mjs), as `rested` from Today: check **Yesterday was a rest day**, follow **Review**, reveal and grade every card **Good**, and stay on the end of the review.

## End state

On Today and at the end of the review, the seven lights' image is named **Reviewed on … rest day**. `/api/stats/streak` lists yesterday in `restDays`.

## Gotchas

- The end screen's heading depends on the goal and what is left; wait for any end heading rather than one.
- The phone app rolls a cached streak past midnight on the device; that path is covered by `packages/client/src/review-day.test.ts`, not by this recipe.

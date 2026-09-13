# Reviews draw the next card from today's log

**Status:** Accepted on 13 September 2026. Rules are in [ADR 0019](../adr/0019-the-review-queue-is-a-deterministic-weighted-draw.md); goal behavior is in [the proposal](../proposals/daily-review-goal-and-rolling-queue.md) and [PRODUCT.md](../../PRODUCT.md#daily-review-goal). This plan replaces steps 2 to 5 of [the rolling queue plan](2026-09-13-daily-review-goal-and-rolling-queue.md).

## Done when

- One drawable definition and one `draw` function in core serve the queue, the client, every count, day exhaustion, and reminders. Tests cover every ADR 0019 rule.
- A forgotten card returns in the same review. A card left learning from yesterday comes back early in today's review.
- The same synced state gives the same next card after a reload, offline, Undo, or a device or scope change.
- The header counts today's attempts against the goal. The goal screen offers Review forgotten, Review another round, and Done.
- A public docs page explains the rules, with numbers generated from core.

## Order of work

1. **Draw in core** ([#150](https://github.com/krambertech/lymi/issues/150)). Build the drawable definition and `draw`, with every number as a named constant. Switch FSRS to one 10-minute step and map cards on the old steps. Add an endpoint for drawable modes and today's log. Move the queue, Today's count, deck counts, `settleDay`, and the reminder query in `push-delivery.ts` onto the definition. Fix the API docs that say "oldest first". Done when tests prove each rule and all counts agree.
2. **Returns on the client** ([#151](https://github.com/krambertech/lymi/issues/151)). The review route runs `draw` on the step 1 data plus outbox grades, in the review timezone. It replaces the fixed `index` and `done`. The header shows attempts out of the goal. Done when reload, offline grading, Undo, midnight, and a scope change each land on the expected card.
3. **Goal screen** ([#152](https://github.com/krambertech/lymi/issues/152)). Show Daily goal reached, That's the lot, or Nothing due from the server. Add Review forgotten, Review another round of 10, and Done. Done when each works on phone and desktop, by keyboard and with reduced motion.
4. **Public docs** ([#153](https://github.com/krambertech/lymi/issues/153)). Explain FSRS, intervals, eligibility, precedence, the draw, and returns. Generate the tables from core, and rerun the simulations against the real `draw`. Done when changing a constant changes the page.

Steps 2 and 4 need step 1. Step 3 needs step 2.

## Risks

- Review modes land in [#146](https://github.com/krambertech/lymi/pull/146). Step 1 uses modes if it has merged, directions if not.
- Series gating ([#102](https://github.com/krambertech/lymi/issues/102)) adds its locked-card filter to the same definition.
- The weights come from simplified simulations. Change them only with a rerun.

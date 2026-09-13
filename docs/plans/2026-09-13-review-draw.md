# Reviews draw the next card from today's log

**Status:** Accepted for implementation on 13 September 2026. The rules are fixed in [ADR 0018](../adr/0018-the-review-queue-is-a-deterministic-weighted-draw.md), and the daily goal behavior in [the accepted proposal](../proposals/daily-review-goal-and-rolling-queue.md) and [PRODUCT.md](../../PRODUCT.md#daily-review-goal). This plan replaces steps 2 to 5 of [the rolling queue plan](2026-09-13-daily-review-goal-and-rolling-queue.md).

## Done when

- One `draw` function in `packages/core` decides the next card for the review endpoint, the web client, and every due count, and its tests cover each ADR 0018 rule for random scopes and review logs.
- A forgotten card returns within the same review after about 3, 6, and 12 attempts, at most three times a day, and reload, offline replay, Undo, and a device or scope change all recompute the same next card.
- The review header counts today's attempts against the goal, and the goal screen offers Review forgotten, Review another round, and Done as the proposal describes.
- The public docs explain the scheduler and the draw with tables and simulation output produced from `packages/core`, so they change when the rules change.

## Order of work

1. **Draw in core, served by the queue.** Add `draw` and one eligibility definition to `packages/core`: due before the end of the learner-local day, one mode introduced at a time with meaning → term first, siblings deferred to the next day, one new-card slot in five, and weighted day-stable keys. Switch FSRS to one 10-minute learning and relearning step with a tested mapping for cards on the old steps. The queue endpoint, Today's count, deck counts, and `settleDay` exhaustion all use the definition. Complete when unit tests prove every rule and the endpoint returns the drawn order.
2. **Returns and goal progress on the client.** The review route runs `draw` locally over the day's eligible cards, today's review log, and outbox grades, replacing the fixed `index` and `done` state. Returns follow the 3, 6, 12 attempt gaps with the three-return cap; the header shows today's attempts out of the goal; Undo steps back. Complete when reload, offline grading, Undo, and switching from a deck to all decks each continue on the expected card in unit and browser tests.
3. **Goal screen actions.** Completion shows **Daily goal reached**, **That's the lot**, or **Nothing due** from the server's day outcome. **Review forgotten** shows each card whose latest grade today is Forgot once, past the return cap. **Review another round** draws 10 more attempts and ends early when nothing is eligible. Complete when each action is verified on phone and desktop, with keyboard and reduced motion.
4. **Public explanation.** Add a docs page on the public site that explains FSRS, the grade intervals, eligibility, slots, the weighted draw, and returns. Generate its interval table and one-year simulation from `packages/core` rather than typing numbers, and correct the API reference's "oldest first" queue description. Complete when changing a scheduler constant changes the rendered page.

Steps 2 and 4 depend on step 1. Step 3 depends on step 2.

## Risks

- ADR 0014's review modes are landing in [#146](https://github.com/krambertech/lymi/pull/146). Step 1 builds on modes if that pull request has merged and on directions otherwise, keeping one eligibility definition either way.
- Series gating in [#102](https://github.com/krambertech/lymi/issues/102) adds a locked-card filter. It belongs in the shared eligibility definition, not in a separate count.
- Weight constants come from a simplified simulation. Tune them only through the step 4 simulation, and treat order changes as expected while progress never changes.

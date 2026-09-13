# Reviews draw the next card from today's log

**Status:** Accepted for implementation on 13 September 2026. The rules are fixed in [ADR 0018](../adr/0018-the-review-queue-is-a-deterministic-weighted-draw.md), and the daily goal behavior in [the accepted proposal](../proposals/daily-review-goal-and-rolling-queue.md) and [PRODUCT.md](../../PRODUCT.md#daily-review-goal). This plan replaces steps 2 to 5 of [the rolling queue plan](2026-09-13-daily-review-goal-and-rolling-queue.md).

## Done when

- One drawable definition and one `draw` function in `packages/core` decide the queue, the web client's next card, Today's count, deck counts, day exhaustion, and the reminder query, with tests for every ADR 0018 rule over generated scopes and review logs.
- A forgotten card returns within the same review after about 3, 6, and 12 attempts, at most three times a day, and a card left learning from an earlier day is mixed in at the start of the next review.
- Reload, offline replay, Undo, and a device or scope change recompute the same next card from the same synced state.
- The review header counts today's attempts against the goal, and the goal screen offers Review forgotten, Review another round, and Done as the proposal describes.
- The public docs explain the scheduler and the draw with tables and simulation output produced from `packages/core`.

## Order of work

1. **Draw in core, served by the API.** Add the drawable definition and `draw` with the attempt precedence, return gaps and cap, earlier-day learning carry-over, slot counter, review and new-card weights, oldest-card slot, and date-card-mode keys as named constants. Switch FSRS to one 10-minute step with a tested mapping for cards on the old steps. Add an endpoint that returns drawable modes and today's review log for a scope, keep the queue endpoint returning a drawn order, and move Today's count, deck counts, `settleDay` exhaustion, and the reminder query in `push-delivery.ts` onto the definition. Correct the API reference and recipe that describe the queue as oldest first. Complete when unit and service tests prove each rule and every count agrees with the queue.
2. **Returns and goal progress on the client.** The review route runs `draw` over the step 1 endpoint's data plus outbox grades, replacing the fixed `index` and `done` state, and uses the review timezone rather than the device zone for dates. The header shows today's attempts out of the goal; Undo steps back; crossing local midnight starts a new day. Complete when reload, offline grading, Undo, a midnight crossing, and switching from a deck to all decks each continue on the expected card in unit and browser tests.
3. **Goal screen actions.** Completion shows **Daily goal reached**, **That's the lot**, or **Nothing due** from the server's day outcome. **Review forgotten** shows each mode forgotten today once, past the return cap. **Review another round** draws 10 more attempts and ends early when nothing is drawable. Complete when each action is verified on phone and desktop, with keyboard and reduced motion.
4. **Public explanation.** Add a public docs page that explains FSRS, the grade intervals, eligibility, precedence, the weighted draw, and returns. Generate its interval table and simulation output from `packages/core`, replacing the rule models in `packages/core/simulation` with runs of the real `draw`, including a review stopped mid-way each day. Complete when changing a scheduler constant changes the rendered page.

Steps 2 and 4 depend on step 1. Step 3 depends on step 2.

## Risks

- ADR 0014's review modes are landing in [#146](https://github.com/krambertech/lymi/pull/146). Step 1 builds on modes if that pull request has merged and on directions otherwise, keeping one drawable definition either way.
- Series gating in [#102](https://github.com/krambertech/lymi/issues/102) adds a locked-card filter to the same definition, not to a separate count.
- The weight constants come from the simplified simulations in `packages/core/simulation`. Change them only with a rerun that shows the effect, and treat order changes as expected while progress never changes.

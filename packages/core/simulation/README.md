# Review draw simulations

These scripts are the evidence behind the weighting and new-card rules in [ADR 0018](../../../docs/adr/0018-the-review-queue-is-a-deterministic-weighted-draw.md). They model the rules, not the production `draw` function; step 4 of [the review draw plan](../../../docs/plans/2026-09-13-review-draw.md) replaces them with a simulation that calls it.

Run them from `packages/core` with Node 22.22 or later:

```bash
node simulation/review-order.mjs
node simulation/new-card-wait.mjs
```

Both use a fixed linear congruential generator, so the same seeds print the same tables.

## Review order under a capped goal

`review-order.mjs` simulates one learner for 365 days at a goal of 50 attempts, with every fifth attempt a new card and FSRS-6 defaults with one 10-minute step. A review card is recalled with probability equal to its retrievability at 09:00 on the day it is drawn; a new card is recalled half the time. A miss costs one extra attempt and its return is graded Good. "Expected cards remembered" is the sum of retrievability over every introduced card on day 365. Results are the mean of seeds 42, 7, 99, and 1234.

| Order | Cards introduced | Expected cards remembered | Cards over a week late |
| --- | --- | --- | --- |
| Due date, oldest first | 2811 | 2352 | 1193 |
| Strict, lowest recall first | 2882 | 2414 | 1982 |
| Strict, highest recall first | 3129 | 2559 | 1241 |
| Plain random | 2897 | 2418 | 1194 |
| Weighted, odds = 1 - recall | 2832 | 2374 | 1387 |
| Weighted, odds = recall^4 | 2994 | 2438 | 968 |

Order moves the result by about 9%. Strict highest recall first remembers most, which agrees with the FSRS author's simulations for a permanent backlog, summarized in [Improving sort orders](https://forums.ankiweb.net/t/improving-sort-orders/50081). Weighting by recall^4 keeps variety for about 5% fewer remembered cards and leaves the fewest cards over a week late. Lowest recall first, which the Anki manual recommends for catching up a temporary backlog, strands the most cards when the cap is permanent.

The model is simplified: it moves a day at a time, every return succeeds, and first-attempt recall of a new card is a guess. Treat the differences as direction, not measurement.

## New-card slots when cards arrive faster than they start

`new-card-wait.mjs` models only the new-card pool: a 300-card deck joined on day 0, a 60-card lesson every seventh day, and 5 new-card slots a day, which is a goal of 25. Arrivals exceed slots, so the pool grows. Seed 7.

| Rule | Lesson wait, median | Lesson wait, 90th percentile | Joined deck started |
| --- | --- | --- | --- |
| Odds halve weekly, no floor | 5 days | 19 days | 104 of 300 |
| Odds halve weekly, never below 1/8 | 22 days | 162 days | 238 of 300 |
| Every unseen card equally likely | 55 days | 166 days | 272 of 300 |
| Oldest first | 119 days | 170 days | 300 of 300 |
| 3 slots in 4 favor recent, 1 in 4 takes the oldest | 7 days | 228 days | 300 of 300 |

A floor on recency odds loses to a growing pile, because many old cards at a small weight outweigh one fresh lesson. A dedicated oldest-card slot keeps this week's lesson fast and guarantees the joined deck moves forward. Its cost is the long tail: lesson cards that miss their first weeks wait behind older material.

## Research this does not replace

- [Tabibian et al., PNAS 2019](https://doi.org/10.1073/pnas.1815156116) derive a review intensity proportional to the probability of forgetting when each review has a cost. It supports a randomized schedule, and its weighting points the opposite way to Lymi's capped-goal choice.
- [The Anki manual](https://docs.ankiweb.net/deck-options.html) recommends ascending retrievability for a temporary backlog.
- [SuperMemo's priority queue](https://help.supermemo.org/wiki/Priority_queue) mixes limited randomization into priority order so new material does not displace old material, and treats the degree as something to tune.

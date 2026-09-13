# Review draw simulations

The evidence behind the weights in [ADR 0018](../../../docs/adr/0018-the-review-queue-is-a-deterministic-weighted-draw.md). These scripts model the rules, not the real `draw`. Step 4 of [the plan](../../../docs/plans/2026-09-13-review-draw.md) replaces them.

Run from `packages/core` with Node 22.22 or later. Seeds are fixed, so the output matches the tables below.

```bash
node simulation/review-order.mjs
node simulation/new-card-wait.mjs
```

## Review order

`review-order.mjs`: one learner, 365 days, goal 50, every fifth attempt a new card. Mean of seeds 42, 7, 99, and 1234.

Assumptions:

- A review is recalled with probability equal to its retrievability. A new card is recalled half the time.
- A miss costs one extra attempt, and the return is graded Good.
- "Remembered" is the sum of retrievability over all introduced cards on day 365.

| Order | Cards introduced | Remembered | Over a week late |
| --- | --- | --- | --- |
| Due date, oldest first | 2811 | 2352 | 1193 |
| Strict, lowest recall first | 2882 | 2414 | 1982 |
| Strict, highest recall first | 3129 | 2559 | 1241 |
| Plain random | 2897 | 2418 | 1194 |
| Weighted, odds = 1 - recall | 2832 | 2374 | 1387 |
| **Weighted, odds = recall^4** | 2994 | 2438 | **968** |

Strict highest-first remembers most, matching the FSRS author's backlog simulations ([Improving sort orders](https://forums.ankiweb.net/t/improving-sort-orders/50081)). The recall^4 draw gives up about 5% of that for variety, and leaves the fewest cards late. Lowest-first leaves the most cards late when the cap never lifts.

## New-card wait

`new-card-wait.mjs`: a 300-card deck joined on day 0, a 60-card lesson every week, and 5 new-card slots a day (goal 25). Cards arrive faster than they start. Seed 7.

| Rule | Lesson wait, median | Lesson wait, p90 | Joined deck started |
| --- | --- | --- | --- |
| Odds halve weekly | 5 days | 19 days | 104 of 300 |
| Odds halve weekly, floor 1/8 | 22 days | 162 days | 238 of 300 |
| All equally likely | 55 days | 166 days | 272 of 300 |
| Oldest first | 119 days | 170 days | 300 of 300 |
| **3 in 4 recent, 1 in 4 oldest** | **7 days** | 228 days | **300 of 300** |

A floor fails as the old pile grows. The oldest-card slot keeps lessons fast and the joined deck moving. The cost is a long tail for lesson cards that miss their first weeks.

## Limits

The model moves a day at a time, every return succeeds, and first-attempt recall is a guess. Read the tables as direction, not measurement.

Other sources point different ways:

- [Tabibian et al., PNAS 2019](https://doi.org/10.1073/pnas.1815156116) support a randomized schedule but weight toward forgetting, the opposite of recall^4.
- [The Anki manual](https://docs.ankiweb.net/deck-options.html) recommends lowest recall first for a temporary backlog.
- [SuperMemo](https://help.supermemo.org/wiki/Priority_queue) mixes some randomness into priority order and leaves the amount to tuning.

# Review draw simulations

The evidence behind the weights in [ADR 0019](../../../docs/adr/0019-the-review-queue-is-a-deterministic-weighted-draw.md), run against the real `draw` and FSRS scheduler. The output is published on [How reviews are scheduled](https://lymi.app/docs/scheduling), which the site builds from `schedulingGuide()` in `index.ts`.

| File | What it computes | When it runs |
| --- | --- | --- |
| `intervals.ts` | Interval ladders, grade outcomes, forgetting curves and fuzz ranges from the scheduler parameters | Every site build |
| `day.ts` | One simulated day at the goal, the same day stopped partway, and the next morning | Every site build |
| `year.ts` | A year under each review order and each new-card rule ADR 0019 weighed | `pnpm --filter @lymi/core simulate` |

The year-long studies take about 20 seconds, so their output is committed as `results.json`. `src/simulation.test.ts` fails when `draw.ts`, `fsrs.ts`, `learner.ts`, `year.ts` or the ts-fsrs version change without a rerun, and when the numbers stop saying what the docs page says about them.

```bash
pnpm --filter @lymi/core simulate
```

Each rival rule runs through `drawer` with a `DrawPolicy` that swaps only its ordering key or its oldest-card slot. Production always uses `DRAW_POLICY`.

## Limits

Recall is a model: a review is recalled with its retrievability, a new card half the time, and a return or a card left learning three times in four. Every card is asked in one mode, and every day is played to the goal. Read the results as direction, not measurement.

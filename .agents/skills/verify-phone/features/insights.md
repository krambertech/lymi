# Insights

How the learner is doing: recall over the last 30 days, consistency, the card totals, and what is due in the week ahead.

## Reach

The **You** tab, then the **Insights** row, whose label carries the recall and the days reviewed.

## Drive

[`insights.yaml`](insights.yaml), as `learner`: open **You**, then **Insights**, check **RECALL** and the remembered and forgotten counts, then scroll to the card total and **due this week**.

## End state

The remembered and forgotten counts are the ones `/api/stats/insights?period=30` holds and the card total is `/api/dev/state`'s, which [`insights.mjs`](insights.mjs) passes to the flow.

## Gotchas

- Insights counts days in the learner's time zone; the runner asks in the Mac's zone, which is the Simulator's.
- The section titles are upper case on screen and in the hierarchy: **RECALL**, **CONSISTENCY**, **CARDS**, **AHEAD**.

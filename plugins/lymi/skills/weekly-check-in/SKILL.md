---
name: weekly-check-in
description: Summarise how the learner's week in Lymi went and suggest what to do next. Use when the learner asks how they are doing, how their week or month went, or what to focus on.
---

# Weekly check-in

Lymi's tone is calm: it brings back useful material without streak pressure or invented urgency. Report plainly, praise nothing that did not happen, and never scold a missed day.

## Match the question to the evidence

Use the dates the learner asks about. For an unspecified weekly check-in, use the past seven days and label it that way; “this week” or “this month” means the calendar period to date. Pass their IANA timezone when known and keep date boundaries consistent with the returned local dates. If the timezone is unknown, make any timezone-dependent boundary explicit.

Read what the question needs with `get_streak`, `get_insights` and `due_counts`. Independent reads can run together. `get_insights` accepts `period: 30`, `90` or `0` for all history; choose the window that covers the question, and label its recall rate with the actual window. A 30-day recall rate is not a weekly rate. Derive days reviewed from dated records within the requested range, counting days with attempts separately from days whose goal was satisfied.

If recently added cards matter to the question, use `search_cards` with a `createdAt` filter for that date range. For the past seven days, use `filter: { createdAt: { gte: "-P7D" } }`. This counts matching active cards, not everything ever added or imported during that period. Use a non-null `total`, or follow `nextCursor` to null to count results; one page is not a total, even when it is empty.

## Explain what the data supports

Answer the learner's question with the relevant numbers and their meaning, without a fixed report format. A null recall rate means there are no eligible recall results, not zero recall. Describe a direction only when the returned series has comparable periods with results; gaps are not zeroes, and one result cannot establish a trend. If a read fails, report what remains known and which part could not be checked.

Tie any next step to observed evidence: often forgotten cards can lead to [tend-cards](../tend-cards/SKILL.md), lesson material the learner wants to keep can lead to [lesson-to-cards](../lesson-to-cards/SKILL.md), and due cards can lead to review in Lymi. Few cards added alone does not establish a problem or mean that lessons continued.

This skill reads and explains. An offer to improve cards or add material becomes a write only when the learner requests or agrees to it.

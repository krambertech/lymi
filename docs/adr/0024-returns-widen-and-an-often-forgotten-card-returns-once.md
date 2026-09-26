---
status: accepted
date: 2026-09-26
---

# Returns widen, and an often-forgotten card returns once

Forgot, or Hard while learning or relearning, brings a mode back after 5, then 10, then 20 other attempts, ±1. A card that is often forgotten comes back once, after 10 attempts ±1, then waits until tomorrow. A return is never drawn straight after the card just graded, so when that card is all that is left, the day's draw ends. This replaces the Returns rule in [ADR 0019](0019-the-review-queue-is-a-deterministic-weighted-draw.md); the rest of that decision holds.

A card is **often forgotten** when its first grade of the day was Forgot on at least 3 of the last 5 learner-local days it was reviewed, before today. The rule covers the whole card, whatever the mode. It replaces "4 lapses in at least 6 reviews" everywhere: the draw, the Today round, Insights, card search and MCP. The code and API keep the name `slipping`.

## Context

A learner at 65% recall saw the same sentence cards up to four times in one review with nothing sticking, and those returns took attempts from the rest of the day. The old rule counted every Forgot, returns within a day included, so one bad sitting could mark a new card, and a card never left the group. The group also changed nothing in the draw.

A return 3 attempts after the reveal mostly tests what was on screen a minute ago. Longer gaps within one session lead to better recall days later ([Pyc and Rawson, 2009](https://www.sciencedirect.com/science/article/abs/pii/S0749596X09000059)). The next day's recall does more than a third or fourth try in one sitting.

## Considered options

- **Suspend the card, as Anki does after 8 lapses:** rejected. The card stops coming up, so it is never learned.
- **Keep 3, 6, 12:** rejected. The first return comes while the answer is still in mind.
- **8, 16, 32:** rejected. Most returns would not fit in a 50-attempt review and would bunch at its end.
- **No same-day return for an often-forgotten card:** rejected. One later retry, 10 attempts on, is still a real test.
- **Serve leftover returns at once, as before:** rejected. A card could come back straight after itself.
- **End the review whenever only unready returns are left:** rejected. Returns of other cards still help, even early.
- **Offer to split or rewrite an often-forgotten card, and show fewer new cards while recall is low:** deferred to separate changes.

## Consequences

- In the simulation, 300 days of 435 cards with a learner who forgets about a third of reviews, the new gaps spent 16.7 of 50 attempts on returns against 17.7 before. One return after 10 for every card would spend 12.4. The simulated learner recalls a return 3 times in 4 at any gap, so these numbers measure crowding, not memory.
- Forgetting the only card left ends the day's draw, and the day counts as exhausted. Review forgotten on the end screen still offers the card.
- Days count back from local midnight in 24-hour steps, so a review within an hour of midnight can land on the wrong day across a DST change.
- Every draw and count now runs the often-forgotten query over the learner's whole review history. That is cheap at one learner's volume. Revisit it if draws slow down.
- `GET /api/review/draw` carries `slipping` on each card, so the offline draw applies the one return. Today's grades change the flag only tomorrow.
- Insights reports `forgottenDays` and `recentDays` in place of `lapses` and `reviews`. Each listed card keeps its all-time counts.
- Card search's `slipping` ignores `since` and `mode`.

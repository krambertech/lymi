---
status: superseded
date: 2026-09-07
superseded_by: 0018
---

# The review queue is ordered by retrievability, not by due date

Superseded by [ADR 0018](0018-the-review-queue-is-a-deterministic-weighted-draw.md), which weights the draw toward higher retrievability instead.

A session is one batch of at most fifty cards. When more than fifty are due, the order decides which fifty the learner sees, and everything that does not fit waits for the next batch. Today `reviewQueue` orders by `card_states.due` ascending — oldest first — and that choice was never made deliberately; it is the obvious `ORDER BY` and it went in with the first queue.

It is also, according to the FSRS community's own simulations of backlog handling, one of the worst orders available. Due-date ascending, difficulty descending and add-order ascending all score badly against the alternative, which is to sort by **retrievability**: the probability, right now, that the learner still remembers the card.

The reason is proportion. A card on a one-day interval that is two days late has decayed far past the point it was scheduled for. A card on a hundred-day interval that is two days late has barely moved. Calendar age treats those two as nearly equal and puts the older one first; retrievability treats them as what they are and puts the one-day card first. With a backlog, the difference is how many cards are forgotten before they are seen.

This proposal has three parts, because ordering alone does not settle what a session contains.

## Learning and relearning cards come first

A card in a learning step is due in one or ten minutes. Its step exists to be answered inside the same sitting, and a card that misses it has to start over. Those cards jump the queue, ahead of everything, regardless of retrievability — there are rarely more than a handful, and delaying one wastes work already done.

## Review cards are ordered by retrievability, ascending

`ts-fsrs` computes retrievability from the stability and the elapsed time already stored in `card_states.fsrs`. Lowest first: the cards closest to being forgotten, measured against their own interval rather than the calendar.

This cannot be an `ORDER BY`. The FSRS state is a JSON blob in one column, so retrievability is not a value SQLite can sort on. The queue instead selects the due rows, computes retrievability in JavaScript, and sorts there. At one learner and a few thousand cards that is a few milliseconds and one extra column of data; it would need revisiting long before it became a real cost.

## New cards get a guaranteed share

A backlog of two hundred reviews should not mean a week with nothing new in it. A fixed slice of each batch is reserved for new cards, interleaved rather than appended, so a lesson captured on Sunday is still reachable on Monday. The slice is capped rather than proportional: a large import must not flood a session either.

## Considered options

- **Keep due-date ascending.** Rejected. It is the order the simulations single out as worst for exactly the case this matters in, and it has the specific failure of burying short-interval cards behind long-interval ones that have barely decayed.
- **Relative overdueness computed from `elapsed_days / scheduled_days`.** This is the SM-2-era approximation of the same idea and needs no FSRS call. Rejected because the real quantity is already available: with FSRS the stability is stored, so the approximation buys nothing but a second formula to keep in step with the first.
- **Let the learner choose the order.** Rejected. It is a setting that asks the learner to have an opinion about a scheduler they should not have to think about, and Lymi is not the app with a wall of scheduling options.
- **Sort in SQL by a stored retrievability column, refreshed on write.** Rejected for now. It would make the ordering a database concern and add a column that is wrong the moment time passes, which is the whole difficulty: retrievability is a function of *now*, not of the last write.

## Consequences

- The queue loads every due row rather than `limit * 2` of them, then sorts and slices. The row count is bounded by what is genuinely due, which for one learner is hundreds at worst.
- What the learner sees first changes. After a holiday the session opens with the short-interval cards that have decayed most, not the oldest ones, and that will feel different before it feels better.
- `reviewQueue`'s ordering becomes testable on its own: given a set of states and a clock, the order is a pure function. It gets unit tests in `packages/core` rather than being an implicit property of a SQL clause.
- The API's queue endpoint changes order too. Nothing documented promises due-date ordering, and the scheduler preview it already exposes is a stronger contract than the sort was.

## Open question this does not settle

Whether a card graded **Forgot** returns inside the same session. Today it does not: grading writes a new due date about ten minutes out, the client keeps walking the array it was handed, and the card reappears only in a later batch. Anki relearns it in the same sitting, which is most of what makes a lapse recoverable rather than merely recorded.

Changing that would make the session length variable, which would in turn make the progress track dishonest — the denominator could move while the learner works, which is the exact reason Anki has never shipped a progress bar. So the two decisions are coupled: a session either has a fixed length and a truthful track, or it relearns lapses and shows a count instead. This ADR assumes the current behaviour and does not change it.

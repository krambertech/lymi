---
status: accepted
date: 2026-09-13
supersedes: 0010
---

# The review queue is a deterministic weighted draw with no saved state

A pure `draw` function in `packages/core` picks the next card. Its inputs are the drawable card modes, today's review log, the scope, and the learner-local date. Lymi stores no review session. The daily goal is the budget, and the draw spends it to keep the most cards remembered.

## Context

The client walks a fixed list of 50 due cards, oldest first. A forgotten card cannot return in the same review, and new cards have no share. The accepted rolling-queue plan fixed this with a stored server session that every scope would have to carry.

## Decision

**Scheduler.** FSRS-6 with default weights, 90% retention, and one 10-minute learning and relearning step. The step sets FSRS state only. Returns count attempts, not minutes.

**Eligible.** A card mode is eligible when:

- it is due before the end of the learner-local day;
- its card and deck are active, the mode is asked, and the learner is a member;
- it is the card's next mode to introduce. Modes start one at a time, in the mode order, once the previous mode reaches Review. Modes with a missing cue are skipped. The default order starts with meaning → term, which teaches more (Webb, 2009);
- no other mode of the card was reviewed today. A revealed answer stays fresh for hours, so this widens ADR 0014's session rule to the day.

**Drawable** is eligible minus modes past today's return cap. The queue, Today's count, deck counts, day exhaustion, and reminders all use it.

**Forgotten today** is every mode whose latest grade today is Forgot. Review forgotten shows each once.

**Each attempt** takes the first of:

1. A return whose gap is reached.
2. A mode left learning or relearning from an earlier day, spaced every 3 attempts.
3. An ordinary draw.
4. The earliest pending return, when nothing else is drawable.

**Returns.** Forgot, or Hard while learning or relearning, brings a mode back after 3, then 6, then 12 attempts, ±1. After three returns, it waits until tomorrow.

**Ordinary draws.** Every fifth is a new card while both groups are drawable. Returns do not count toward the five. Within a group, keys hash the date, card, and mode, so every scope sees the same order.

- Review odds are retrievability at the start of the day, to the fourth power.
- Three new-card slots in four weight a card by half per week since it was added. The fourth takes the oldest unseen card.

All numbers are named constants in core.

**Log.** Today's log covers every scope. On the client it includes outbox grades. Undo removes a grade from it.

## Considered options

- **Stored server session:** rejected. Too much machinery for one learner.
- **Bookmark on the device:** rejected. It goes stale across scopes and devices.
- **Lowest retrievability first (ADR 0010):** rejected. Anki recommends it for a temporary backlog, but the goal caps attempts every day, and in [the simulation](../../packages/core/simulation/README.md) it left the most cards overdue.
- **Highest retrievability first:** rejected. It remembered about 5% more, with no variety.
- **A floor on new-card odds:** rejected. A growing old pile outweighs a fresh lesson.

## Consequences

- The same synced data gives the same next card after a reload, offline, or on another device. Grades from another device can change it.
- A reload loses whether the answer was revealed.
- An offline grade that arrives after a later grade of the same card is a duplicate and does not count.
- Counts need the review log, so they load rows and call core instead of a SQL `where`.
- The client needs an endpoint for drawable modes and today's log, and must use the review timezone.
- Crossing local midnight starts a new day. Order, slots, and the header count reset.
- Cards on the old 1-minute and 10-minute steps need a tested mapping.

Delivery is in [the review draw plan](../plans/2026-09-13-review-draw.md).

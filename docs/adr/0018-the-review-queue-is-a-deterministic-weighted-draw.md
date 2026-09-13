---
status: accepted
date: 2026-09-13
supersedes: 0010
---

# The review queue is a deterministic weighted draw with no saved state

The next card is a pure function in `packages/core` of the drawable card modes, today's review log, the scope, and the learner-local date in the review timezone. A review stores no session, position, or buffer. The daily goal is the budget, and the draw spends it to keep as much remembered as possible.

## Context

Today the client walks a fixed list of 50 due states, oldest first, so a forgotten card cannot return in the same review and new cards have no share. The accepted rolling-queue plan fixed this with a revisioned server session, which scopes of one deck, every deck, or a later category would each have to carry.

## Decision

**Scheduler.** FSRS-6 with default weights, 90% retention, the default maximum interval, and one 10-minute learning and relearning step. The step only sets FSRS state; returns count attempts, not minutes.

**Eligible.** A mode is eligible when it is due before the end of the learner-local day, so a short step never waits and a card due this afternoon never slips a day. Its card and deck are active, the mode is asked (ADR 0007, 0014), and the learner is a member. A card introduces one mode at a time, in its mode order, skipping a mode whose cue is missing: Lymi's default order starts with meaning → term, which teaches more than the reverse (Webb, 2009). The next mode becomes new once the previous one first reaches Review. Once any mode of a card is reviewed, its other modes wait until the next day, because a revealed answer stays fresh for hours; this widens ADR 0014's session rule to the day.

**Drawable** is eligible minus modes past today's return cap. The queue, Today's count, deck counts, `settleDay` exhaustion, and the reminder query all use it. **Forgotten today** is every mode whose latest grade today is Forgot; Review forgotten shows each once.

**Each attempt** takes the first of:

1. A return that has reached its gap.
2. A mode still learning or relearning from an earlier day, spaced as a return every 3 attempts.
3. An ordinary draw. Every fifth ordinary draw, not counting returns, is a new-card slot while both groups are drawable; otherwise either group fills it.
4. The earliest pending return, when nothing ordinary is drawable.

**Returns.** A grade that leaves a mode learning or relearning returns it after 3, then 6, then 12 further attempts, with ±1 attempt of jitter. After three returns in a day, it waits until the next day.

**Draw.** Keys come from a hash of the date, card, and mode, so every scope sees the same global order filtered. A review's odds are its retrievability at the start of the day, raised to the fourth power. Three new-card slots in four weight a card by half for each week since it was added; every fourth takes the oldest unseen card. These are named constants in core.

**Log.** Today's log spans every scope, includes outbox grades on the client, and loses a grade on Undo.

## Considered options

- **A revisioned server session with a local mirror:** rejected as more machinery than one learner needs.
- **A bookmark on the device:** rejected because it goes stale across scopes and devices.
- **Strict lowest retrievability first (ADR 0010):** rejected. The Anki manual recommends it for a temporary backlog, but the daily goal makes the cap permanent, and in [our simulation](../../packages/core/simulation/README.md) it stranded the most cards.
- **Strict highest retrievability first:** rejected for variety. It remembered about 5% more than the weighted draw.
- **A floor on new-card recency odds:** rejected because a growing old pile outweighs a fresh lesson.

## Consequences

- The same synced log and cards give the same next card on reload, offline, another device, or another scope. Another device's grades or edits can change the current card, revealed state is lost on reload, and an offline grade replayed after a later grade of that card becomes a duplicate and does not count.
- Eligibility needs the review log, so counts load rows and call core instead of a SQL `where`.
- The client needs a new endpoint returning drawable modes and today's log for a scope, and dates from the review timezone rather than the device.
- Crossing local midnight starts a new day: order, slots, and the header count reset.
- Cards on the old 1-minute and 10-minute steps need a tested mapping.

Delivery is in [the review draw plan](../plans/2026-09-13-review-draw.md).

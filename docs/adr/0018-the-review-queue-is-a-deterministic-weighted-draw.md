---
status: accepted
date: 2026-09-13
supersedes: 0010
---

# The review queue is a deterministic weighted draw with no saved state

The next card in a review is a pure function in `packages/core`: `draw(eligible modes, today's review log, scope, learner-local date)`. The same inputs always return the same card, so a review has no stored session, position, or buffer. The daily goal is the budget, and the draw spends it to keep as much remembered as possible.

## Context

Today's queue orders due states by `due` ascending, takes 50, and the client walks that fixed list. A card graded Forgot cannot return in the same review, so the FSRS learning steps meant for one sitting spread across days instead. New cards have no share, so a joined deck of hundreds can fill a review. The accepted rolling-queue plan fixed this with a revisioned server session, a local mirror, and merge rules, which is more machinery than one learner's review needs.

A review can cover one deck, every deck, or later a series or category. Rules that live on a session break when the scope changes; rules checked against cards and the review log do not.

## Decision

**Scheduler.** FSRS-6 through `ts-fsrs` with default weights, 90% requested retention, the default maximum interval, and one 10-minute step for both learning and relearning.

**Eligibility.** A card mode is eligible when it is due before the end of the learner-local day, its card and deck are active, the mode is asked (ADR 0007, ADR 0014), and the learner is a member of the deck. Two further rules apply:

- A card introduces one mode at a time. Meaning → term comes first, and each further mode becomes new after the previous one first reaches Review, in the card's mode order. A card without a meaning starts with term → meaning.
- Once any mode of a card is reviewed, the card's other modes wait until the next learner-local day.

**Slots.** Every fifth attempt of the day is a new-card slot while both new and review modes are eligible. When either group runs out, the other fills the slot.

**Draw.** Within a slot type, each eligible mode gets a random key from a hash of the date, card, and mode, weighted by its odds. Review odds rise steeply with retrievability measured at the start of the day, so cards still known are more likely than cards nearly lost. New-card odds halve for each week since the card was added and never reach zero. Because keys do not depend on the scope, any scope sees the global order with other cards filtered out.

**Returns.** A grade that leaves a mode in learning or relearning brings it back after about 3, then about 6, then about 12 further attempts, counted in today's log with hash-based jitter. A due return takes the next slot. After three returns in a day, a further Forgot or Hard waits until the next day.

**Log.** Today's review log spans every scope. On the client it includes grades still waiting in the offline outbox, and Undo removes a grade from it.

## Considered options

- **A revisioned server session with a local mirror.** Rejected: exact position on every device does not justify merge rules, revisions, and stale state for one learner.
- **A bookmark saved on the device.** Rejected: it is more to build than the pure function, and it goes stale when the scope or device changes.
- **Strict lowest retrievability first (ADR 0010).** Rejected: the Anki manual recommends it for catching up a backlog, but simulations by FSRS's author and a one-year simulation of these rules at goal 50 both remembered more with higher retrievability first when attempts are capped.
- **Strict highest retrievability first.** Rejected for variety: it remembered about 5% more in the simulation, but a weighted draw keeps novel cards appearing and left the fewest cards over a week late.
- **Urgency bands with random picks inside the top band.** Rejected: old cards wait for as long as the top band stays full.

## Consequences

- Reload, offline replay, device changes, scope changes, and Undo produce the next card by recomputing it. Revealed-but-ungraded state is lost on reload.
- The review endpoint and the client run the same function. API and MCP clients receive a drawn order; the web client draws locally so returns and outbox grades take effect without a request.
- Today's count, deck counts, day exhaustion in `settleDay`, and the queue must share one eligibility definition, or Today will disagree with the review.
- Cards already on the old 1-minute and 10-minute steps need a tested mapping to the single step.
- The weight constants are tuned by simulation, and changing them changes order but never progress.
- Lymi's approach draws on Memorize (Tabibian et al., PNAS 2019), where the optimal review rate is stochastic and set by recall probability, and on SuperMemo's randomized priority queue. The exact combination is Lymi's own.

The rules are delivered through [the review draw plan](../plans/2026-09-13-review-draw.md).

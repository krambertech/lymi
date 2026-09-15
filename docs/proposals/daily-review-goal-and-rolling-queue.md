---
status: implemented
date: 2026-09-13
decision: one learner-chosen daily goal backed by a deterministic weighted draw
---

# Daily review goal and rolling queue

This proposal is implemented. [PRODUCT.md](../../PRODUCT.md) owns the current learner experience and [ADR 0019](../adr/0019-the-review-queue-is-a-deterministic-weighted-draw.md) owns the queue model.

## Lasting rationale

The learner chooses one daily goal measured in accepted, non-undone recall attempts. Forgot counts because forgetting must not increase the amount of required work. Completing every available review also satisfies a non-empty day when fewer cards are available than the goal; Lymi does not pull future cards forward to fill a number.

The review queue is not stored. Lymi derives the next card from the current cards, learner-local date, scope, and review log, so the same synced state produces the same next card after interruption or on another device. Weighted selection avoids turning capture order into a memorisation cue, while fixed slots keep new and older unseen material moving.

Forgotten directions return at bounded intervals during the day. A sibling direction waits until tomorrow because the revealed answer would make its review dishonest. Continuing after the daily goal is optional and cannot undo completion.

This shape preserves a calm learner-chosen commitment rather than introducing points, leaderboards, pressure, or punishment for difficult reviews.

## Rejected directions

- Counting distinct cards or only correct answers would penalise forgetting.
- Pulling future cards forward would make a quiet day artificially harder.
- Saving a mutable queue or session would create cross-device conflicts and stale work.
- Showing both directions of one card in the same session would leak the answer.

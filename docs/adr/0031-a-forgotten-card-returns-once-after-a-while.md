---
status: accepted
date: 2026-10-11
supersedes: 0024
---

# Forgotten cards return once after 20 other attempts

Forgot brings a mode back once in the day's draw, after 20 other attempts, ±2, and never sooner. Hard does not schedule a return. When the draw runs out before the gap is reached, the card waits in Review forgotten. Easy on a mode already graded today counts as Good. This replaces the Returns rule in [ADR 0019](0019-the-review-queue-is-a-deterministic-weighted-draw.md) and [ADR 0024](0024-returns-widen-and-an-often-forgotten-card-returns-once.md); the rest of ADR 0019 holds, and ADR 0024's definition of an often-forgotten card holds.

## Context

The learner found returns "almost immediate" and got stuck seeing the same cards again and again. Under ADR 0024 a miss came back after 5, 10 and 20 attempts, and when only returns were left they were served early, so a short deck review brought a card back after about five cards. A same-day repeat graded Easy stretched the next interval by about 60% on the strength of a reveal a minute old.

Anki waits 10 minutes, SuperMemo, Quizlet and Mochi hold misses to the end of the session or round, and SuperMemo and WaniKani give the repeat no credit. Spaced single recalls beat repeated recalls in one sitting, and longer gaps within a sitting beat short ones. The evidence and the simulation are in [the proposal](../proposals/stuck-cards.md).

## Decision

**Returns.** Only Forgot schedules a return. The mode returns once, when 20 ±2 other attempts have passed since the miss; the jitter is a hash of the date, card and mode, as before. A second Forgot leaves it to tomorrow, where it is a mode left learning. Every card gets the same one return, so the draw no longer reads whether a card is often forgotten.

**Minimum gap.** A return is drawn only after its required gap. When nothing else is drawable, the draw is exhausted, and the day counts as exhausted, whatever returns are waiting.

**Re-review.** Review forgotten is where those cards go. It keeps its rule from ADR 0019: every mode whose latest grade today is Forgot, each once, earliest miss first.

**Easy on a repeat counts as Good.** Review offers the same four grades on every try. An Easy given to a mode already graded on the same learner-local day, in a return or in Review forgotten, is recorded as Good, by the client before it schedules and by the server for any client.

**A second miss offers a hint.** A card forgotten twice today with no hint offers one in review, as an often-forgotten card does.

## Considered options

- **Keep 5, 10, 20:** rejected. Returns cost a fifth of the goal, and a card came up three or more times about twice a day in the simulation.
- **One return after 10:** rejected. Half the gap for a third more return attempts.
- **One return after 30:** rejected. Most returns would miss a 50-attempt review and bunch into Review forgotten.
- **No same-day return:** rejected. One later try is still a real test, and Review forgotten would be the only second chance.
- **Return after Hard:** rejected. Hard is a recall, and it added a tenth more return attempts for no stated benefit.
- **Return after 10 minutes, as Anki does:** rejected. The draw is a pure function of the log, ADR 0019, and a break would bring a card back with no cards between.
- **Serve the waiting returns before the end screen, as SuperMemo's final drill does:** rejected. Review forgotten already offers them, and a forced drill would delay the end the learner chose.
- **Lock Easy on a repeat, as after a peek at the hint:** rejected. A locked grade needs a reason on screen for a rule the learner should not have to think about.
- **Reject an Easy repeat with a 400:** rejected. An offline grade from an older client would be lost.

## Consequences

- In the simulation, a year at a goal of 50 spends 6.0 attempts a day on returns, against 10.8, at a mean gap of 20 against 6.4, and no card is seen three times in a day. A 30-card deck reviewed to its end returns 0.6 cards itself and leaves 7.6 for Review forgotten.
- A short review ends with its misses waiting, so Review forgotten is offered more often. The header's total counts a waiting return only once the cards still to come are sure to reach its gap.
- `missed` keeps its meaning, a grade that leaves the mode in learning, for the state a client projects. `owesReturn` is the return rule.
- `slipping` stays on `GET /api/review/draw` for the hint offer and the Often forgotten round; the draw ignores it.
- The server compares the mode's last review with the grade's learner-local date to find a repeat, so a grade on either side of midnight counts as a new day.
- The phone app's local queue follows the same rule: one return, at most 19 cards later.

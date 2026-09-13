---
status: accepted
date: 2026-09-13
decision: accepted
---

# Daily review goal and rolling queue

This document preserves the accepted product direction for a daily review goal, a review that survives interruption, and intentional same-day repetition of forgotten cards. Delivery is staged in [the implementation plan](../plans/2026-09-13-daily-review-goal-and-rolling-queue.md).

## Learner outcome

The learner chooses how many recall attempts they want to complete each day. Lymi keeps the current review coherent while cards are fetched or become due again, preserves progress across an app restart, and marks the day's streak goal complete when the chosen number of attempts has been reached or every available review in a non-empty queue has been completed.

Success means a learner can set a goal of 50, complete up to 50 accepted grades without being penalised for forgetting or for having fewer cards due, resume from the same place after an interruption, and decide whether to continue with forgotten cards or another round.

## Settled direction

- The learner has one configurable daily review goal.
- Before the first review, Lymi asks the learner to choose a goal, suggests 50 attempts, and saves the chosen value for later days; the same control later appears only in the separately owned streak modal.
- The goal control offers quick choices of 10, 25, 50, and 100 plus a custom whole number from 1 to 200.
- Every accepted, non-undone grade counts as one attempt toward the goal, including a repeated card and a grade of Forgot.
- The goal counts recall attempts, not distinct cards and not only successful recall.
- Forgetting a card must never increase the amount of required work before the streak goal is complete.
- Reviews completed earlier on the same learner-local day count toward the goal, so a later review starts with only the remaining attempts.
- Reaching the configured number completes the streak goal for that day even when forgotten cards remain available to revisit.
- Completing every eligible card also completes the streak goal when between one and the configured goal are available; Lymi does not pull future cards forward merely to fill the number.
- The current streak counts consecutive learner-local days whose goal was satisfied; a day that ends unsatisfied resets it to zero without removing review history.
- The current streak length appears as a number beside the seven-day review lights on Today and at review completion.
- A learner must open Lymi on a zero-due day and let it confirm that no cards are eligible to protect the current streak without increasing it; a day with no visit is still missed.
- Undo removes the undone attempt from today's count so an accidental grade does not advance the goal.

A goal of 50 can therefore contain fewer than 50 distinct cards when a forgotten card returns during the review. The fiftieth accepted grade completes the required work regardless of its grade, while exhausting a smaller eligible queue completes the day honestly at the lower count.

## Rolling review model

An active review is durable state, not a disposable response from the due-card endpoint. It contains the current card, the remaining attempt count, a stable buffer of unseen cards, timed retry candidates, completed grades, and the cards that are still forgotten.

The app may fetch cards incrementally, but fetching is invisible to the learner:

- a refresh merges eligible cards into the unseen buffer instead of replacing the active review;
- cards already completed in the active review are not silently reintroduced as ordinary unseen cards;
- the current card and visible progress do not change because of a background fetch;
- the review starts with up to 20 unseen cards held locally;
- when 10 unseen cards remain, a background refill adds enough eligible cards to return toward 20, capped by the remaining goal and available work;
- foreground, reconnect, and interrupted-review resumption reconcile the buffer without replacing it.

When ordinary due reviews and new cards are both available, the queue targets approximately one new card after every four ordinary reviews. Due learning and relearning cards retain priority. If either group runs out, the other can fill the remaining goal. The proportion prevents starvation without creating a fixed quota or another learner-facing setting.

The active review must be persisted beyond component memory so reloading or reopening Lymi resumes the same position. Local persistence should make this immediate and offline-capable, while accepted server reviews remain authoritative and the existing phone-to-laptop continuity requirement is preserved. This proposal does not choose the exact storage schema.

## Forgotten cards

FSRS remains responsible for calculating when a card is due again. When a grade schedules a short learning or relearning step, the active review records that due time and can insert the same direction once it becomes eligible instead of rebuilding the whole queue.

A retry is another ordinary review attempt and counts toward the daily goal. Once eligible, it is mixed into the next few unseen cards: it does not appear immediately after the current card and is not held until goal completion. The exact position within those next few cards may vary so repetition does not become predictable.

The sibling direction for the same card remains excluded because the revealed answer would leak it.

For the end state, a card is still forgotten when its latest grade for that direction in the current learner-local day is Forgot. A later Hard, Good, or Easy grade removes it from that set.

## Goal completion

The completion state appears immediately after the required attempt count is reached or after the learner completes a non-empty eligible queue and the server confirms that no reviews remain. It confirms that today's streak requirement is complete, shows the number reviewed today, and keeps continuing optional. An empty local buffer while offline or after a failed refresh is not enough evidence to complete the day.

The available actions are conditional:

- **Review forgotten** appears when cards are still in the forgotten set.
- **Review another round** appears when more eligible cards are available beyond the completed daily goal and starts up to 10 additional attempts.
- **Done** always lets the learner leave after completing the goal.

When the available work runs out below the configured goal, the completion heading remains **That’s the lot** rather than claiming that 50 reviews were completed. Finishing everything Lymi could usefully offer still satisfies the streak for that day.

When zero cards are due, opening Lymi produces a **Nothing due** state that preserves the current streak without extending it and offers **Add cards**. Adding a card does not itself count toward the review goal; any later review attempt follows the ordinary counting rule.

Reviewing forgotten cards or starting another round may increase today's review count, but it cannot make the already completed streak goal incomplete. An additional round ends after 10 attempts or earlier when no eligible cards remain; when more remain, the learner may choose another round again.

## Review timezone

Lymi initially derives the learner-local day from the current device timezone without adding a timezone question to setup. While the setting remains automatic, the most recently foregrounded device may update the review timezone when its device timezone changes during travel. Background activity from another device cannot move the day boundary. A timezone selected explicitly in Settings becomes a manual override and stays fixed until the learner returns the setting to Automatic.

A timezone change affects the current and future day boundaries but does not rewrite completed review history or previously recorded goal outcomes.

## Relationship to Lymi's product language

`PRODUCT.md` defines the daily goal and streak as one mechanic while retaining Lymi's rejection of streak pressure. `DESIGN.md` pairs a plain current-streak number with the seven-day review lights on Today and at review completion while prohibiting an oversized or isolated streak metric.

The intended distinction is a calm commitment chosen by the learner, not XP, leaderboards, escalating pressure, or punishment for a difficult review. Completion says **Daily goal reached** at the chosen target, **That’s the lot** after exhausting a smaller non-empty queue, and **Nothing due** for a confirmed zero-card day.

## Possible future streak support

The first version has no streak protection: a learner-local day that ends without a satisfied goal resets the current streak. Lymi may later introduce streak freezes, grace days, recovery, or another explicit protection mechanic if that helps learners maintain the habit without pressure.

Those mechanics are outside the current scope. If introduced, they must be visible and predictable, preserve the underlying review history, and change only whether a streak continues rather than rewriting whether the daily review goal was actually completed.

## Delivery boundary

No product decisions remain open in this proposal. The implementation plan chooses the persistence and synchronization shape, divides delivery into independently verifiable slices, and preserves every behavior and acceptance condition below.

## Acceptance evidence for the eventual implementation

- With a goal of 50, the goal completes on the fiftieth accepted, non-undone grade even when fewer than 50 distinct cards were seen.
- Before the first review, the learner chooses a daily goal from presets of 10, 25, 50, or 100 or enters a custom whole number from 1 to 200; 50 is suggested, later reviews reuse the choice, and the streak modal is its only later editing surface.
- With between one and 49 eligible cards, completing all of them and receiving a confirmed empty queue completes the streak at the honest lower count without pulling future cards forward.
- With zero eligible cards, opening Lymi and receiving a confirmed empty state preserves the current streak without incrementing it and offers Add cards.
- A zero-due day with no visit remains a missed day and resets the streak when no future streak protection applies.
- An empty local buffer does not complete the streak while Lymi is unable to confirm whether more cards are eligible.
- A Forgot grade and a later retry each add one to the daily count; Undo reverses the corresponding count and review state.
- Reloading, backgrounding, reconnecting, or reopening preserves the current card, order, and progress, and background refills never duplicate completed work.
- The client holds up to 20 unseen cards, refills toward 20 when 10 remain, and reconciles without replacement.
- New cards appear at approximately a one-to-four proportion without delaying due learning or relearning cards.
- A forgotten direction returns according to FSRS among the next few unseen cards without exposing its sibling direction.
- Goal completion remains complete during optional forgotten review or another round; another round stops after 10 additional attempts or when no eligible cards remain.
- Today and review completion show the numeric current streak beside the seven-day review lights without making it dominant.
- The review timezone defaults from the device, follows travel while Automatic, respects a Manual override, rejects background overwrites, and never rewrites completed history.
- The same accepted review history produces the same daily-goal state on phone and laptop.

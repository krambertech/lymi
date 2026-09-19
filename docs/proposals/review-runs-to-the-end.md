---
status: accepted
date: 2026-09-19
decision: a review runs until its scope is empty, the goal is a milestone, and every ending is a success screen
issues:
  - https://github.com/krambertech/lymi/issues/333
---

# A review runs to the end

## Outcome

A learner opens a review and can keep going until nothing is left, without being stopped every ten cards. Reaching the daily goal is felt on the way, and leaving at any point, by X or by running out, lands on the same success screen that shows what this sitting added to the day. A learner who only wants the goal still gets it in one stop.

## Evidence

Using the app daily with more cards due than the goal, the review either stops at the goal or offers ten more, and each ten ends on a screen. A deck reviewed to its end below the goal ends on "Nothing left in this deck" with no celebration, because only a stretch that satisfies the day celebrates. With no streak the lantern stays out until the goal is met, so a first day or a day after a broken streak reads as dead all the way through. The review card labels the learner's own meaning "Meaning by you", which [CONTEXT.md](../../CONTEXT.md) already says should carry nothing.

## Accepted shape

**The card.** The chips for the learner's and the lesson's text go. The compact AI badge stays on a field the AI wrote, per the AI badge entry in CONTEXT.md. The card's tags show as chips after reveal. Every field stays as it is.

**The goal review.** Today's Review button opens the goal review. It counts to the goal, or to everything due when that is less, "12 of 50" or "12 of 30", and stops there on the end screen. From that screen, Continue runs until nothing is left in the day and its header counts what is left. The ten-card round is gone.

**A deck, a series or a round** counts what was opened, "12 of 60", and runs to its end. Crossing the goal on the way is marked by the flame going full, never by a stop.

**The flame is today's progress.** It is out only when there is nothing to show: no streak and no review yet today. The first review lights it small, it grows through the day, and it is full at the goal; a live streak keeps its lit flame from the start of the day as now. Every accepted grade, Forgot included, makes a visible spark on the header lantern. The pill in the rail and the top bar follows the same rule. Whether the streak is alive stays with the number beside it.

**Every ending is a success screen.** X, the goal, and running out all land on the same screen: the lantern in its pool, a heading naming what ended, today's total as the large number rolling up from where the day stood when the review opened, the seven lights and the run, then the ways on. A finished set gets the light celebration; the goal keeps the full one with embers. Below the goal with cards left, Continue is the primary button and the line under the number says how many more to the goal; at or past the goal, or with nothing left, Done is primary and Continue is secondary where it still has cards. Review forgotten and the other-deck offers stay where they apply.

## Boundaries

- Continue's count can grow by a few as forgotten cards return within the day. That is the day being honest, not a bug to hide.
- A deck that runs out below the goal still leaves the day open unless every deck is empty; the day rules in [PRODUCT.md](../../PRODUCT.md#daily-review-goal) and [ADR 0019](../adr/0019-the-review-queue-is-a-deterministic-weighted-draw.md) do not change.
- Nothing due, offline and failed-refresh endings keep their current handling.
- The draw, the return cap, the sibling-mode rule and the streak arithmetic are untouched.

## Rejected directions

- A pause at the goal with Keep going and Done inside the review: a second kind of stop for a moment the flame already marks.
- The header counting the day in every scope: a deck review that says "12 of 50" answers a question the learner did not ask there.
- Offering "the rest" as a counted round: the number moves as forgotten cards return, and a count on the button reads as a shortcut.

## Delivery

1. **Card chips.** Drop the learner and lesson source chips from the review card, keep the AI badge, show tags. Done when a card with tags and an AI meaning shows the tag chips and the AI badge only.
2. **The flame.** Today's progress in the header lantern and the pill, with a spark on every grade; update "The lantern" and "The flame" in [DESIGN.md](../../DESIGN.md). Done when a learner with no streak sees a small flame after the first grade and a spark on each.
3. **Stretches and the end screen.** The goal review to the smaller of goal and due, Continue to the end, scope reviews to their end, X to the end screen, one rule for the large number, the nudge; update the Daily Review Goal section of PRODUCT.md, [review completion](../design/review-completion.md) and the Round entry in CONTEXT.md. Done when 60 due and a goal of 50 give one stop at 50, Continue, and an end at 60 with no ten-card offer anywhere, and opening a deck at 12 reviews today and leaving at 30 rolls 12 to 30 under the lantern.

Slices 1 and 2 are independent of 3 and of each other.

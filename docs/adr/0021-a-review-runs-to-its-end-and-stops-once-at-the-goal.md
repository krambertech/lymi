---
status: accepted
date: 2026-09-19
---

# A review runs to its end and stops once at the goal

A review runs until what it was opened for is empty. Only the day's draw stops, once, at the goal. Every ending, X included, lands on one success screen that reports what changed since the previous one. The ten-card round is gone.

The draw, the return cap and the day rules in [ADR 0019](0019-the-review-queue-is-a-deterministic-weighted-draw.md) do not change. [#333](https://github.com/krambertech/lymi/issues/333) tracks the work.

## Context

With more cards due than the goal, a review stopped at the goal and then offered ten more at a time, each ten ending on its own screen. A deck reviewed to its end below the goal ended without a celebration, and X left without showing what the sitting added. A review is never stored, so the rules must hold however a stretch was reached: from Today, from an end screen, or after a reload.

## Decision

**Three kinds of stretch.** Today's Review and Continue draw from the whole day. A deck or series draws from itself. A round from Today, or Review forgotten, walks a fixed list.

**One stop.** The day's draw stops at the goal when it starts below it, wherever it was opened from. Every other stretch runs until it is empty; crossing the goal there shows only in the flame.

**The header counts the stretch.** Below the goal, the day's draw counts today's attempts to the smaller of the goal and what the day holds: 12/50, or 12/30. Any other stretch counts its own attempts against its attempts plus the cards it still holds, so it opens on the number Today showed. A forgotten card owed a return stays in the total.

**X ends the stretch.** X or Escape opens the end screen when a grade was made since the previous one, and goes to Today otherwise. Continue on that screen resumes the stretch.

**Continue.** After any other ending, Continue starts the day's draw, with the one stop still applying. At a deck's end it replaces the offers of other decks. With nothing left in the day it is absent.

**The end screen.** The heading is the first that holds: Nothing due, Daily goal reached (crossed since the previous screen), You're done for today (every deck confirmed empty), Nothing left in the deck or series, Round done, Review done. The large number is today's total, rolling up from where the previous screen left it.

**Embers and the streak moment.** Embers rise for the reviews added since the previous screen: 3 for one, 14 at a goal's worth, 20 at twice the goal or more. Today's light flares and the run ticks only when the day turned satisfied since the previous screen, whatever stretch did it.

**Buttons.** While the day is open and Continue is offered, Continue is primary and a line says how many more reviews reach the goal, or how many cards finish the day when that is fewer. Otherwise Done is primary. The primary button sits last. Review forgotten appears wherever it holds cards.

## Considered options

- **Continue always runs to the end of the day.** Rejected: a learner who did a deck first would lose the goal's stop.
- **A stop at the goal in every stretch.** Rejected: a second kind of stop for a moment the flame already marks.
- **Other-deck offers beside Continue.** Rejected: Continue draws from them, and Today lists them.
- **Full celebration only for the goal review.** Rejected: a deck that crosses the goal turns the day just the same.
- **Rolling the number from when the page opened.** Rejected: after a screen showing 50, a roll from 0 reads as a reset.

## Consequences

- Every unseen card is drawable every day, so a deck with 400 unseen cards runs 400 cards to its end, and its header says so.
- The header total is recounted on every grade with `drawableCount`, linear in the cards in scope.
- A deck or series reads the rest of the day from the decks list, so its end waits for that list.
- Continue from a deck or series opens `/review` without a scope, a new sitting from where the day stands.

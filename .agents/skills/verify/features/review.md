# Review

The spaced-repetition act: the learner sees a card's cue, reveals it, and grades their recall from Forgot to Easy. Each grade is written to the grade outbox first and reaches the server in the background. ADR 0019 owns the draw and ADR 0031 the rounds.

## Reach

Today's **Review** link, `R` on a keyboard, a deck's **Review** button, or `/review`. A deck's own review is `/review?deck=<id>`.

## Drive

[`review.mjs`](review.mjs), as `learner` from Today: check **9 cards due today**, follow **Review** in the Today region, press **Reveal the card**, grade **Good**, then grade the next card **Forgot**, and go back to Today.

## End state

The progress reads **1 of 9** after the first grade, and the card on screen changed. `/api/dev/state` counts one more review after each grade, which proves the outbox reached the server. Back on Today, **Also on your list** shows **1 Forgotten today** and the due count is lower than the seed's.

## Gotchas

- Grades are optimistic: the screen moves on before the server has the grade, so wait for the stored review count rather than the next card.
- Press **Reveal the card** at its corner: on a phone the centre can land on the pronunciation button.
- The learner's total due is always 9, but which deck holds those cards and the seeded review count follow the clock, so assert totals, not one deck's due count.
- A forgotten card comes back about twenty cards later in the same review, which a 9-card review never reaches.

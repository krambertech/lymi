# Review

The spaced-repetition act on the phone: the learner sees a card's cue, taps to reveal it, and grades their recall from Forgot to Easy. Each grade is written to the grade outbox first and reaches the Worker in the background (ADR 0023). ADR 0019 owns the draw and ADR 0031 the rounds.

## Reach

Today's **Review** button, a deck's own **Review** button, or a deck row under **Decks to review**, which opens that deck's review.

## Drive

[`review.yaml`](review.yaml), as `learner` from Today: press **Review**, check the progress reads **0/9**, tap the card's **Tap to reveal**, grade **Good**, reveal the next and grade **Forgot**, then **End review**. On **Review done** check the reviews today, press **Done**, and scroll Today to **Also on your list**.

## End state

The progress reads **1/9** after the first grade. **Review done** shows the reviews today. Today lists **Forgotten today** with 1. `/api/dev/state` counts two more reviews, which proves the outbox reached the Worker.

## Gotchas

- Grades are optimistic: the screen moves on before the Worker has them, so [`review.mjs`](review.mjs) polls the stored review count rather than trusting the next card.
- The card's label is **Recognition card for …** or **Production card for …**, ending in **Tap to reveal**; match the ending to find it, but reveal by tapping low on the card, because Maestro taps an element's centre and the centre can be the pronunciation button.
- A grade's label carries its interval, such as **Good, next in 4 day**, so match the start.
- The phone keeps today's review count with its review on the device, so after a persona reset **Review done** can show more than the Worker holds; assert the stored count, not that number.
- Ending short of the daily goal shows **Review done** with ways to continue; **Done** goes back to Today.

# First run for a Russian beginner

A new learner who chooses Russian in the heading **Explore ready-made decks about …** on Today is offered the alphabet, then A1, then Core Russian Words, then the rest of the Russian shelf in Explore's order. `BEGINNER_DECKS` in `packages/client/src/welcome.ts` names them by slug, and a missing one leaves its place to the shelf's next deck.

## Reach

`fresh` on `/today`, once the `publisher` persona has published its small Russian decks under the slugs Lymi will publish them as. Its seed publishes Core Russian Words first and the alphabet last, so the offer is reordered rather than already in order.

## Drive

[`first-run-russian.mjs`](first-run-russian.mjs): seed `publisher`, sign in again as `fresh`, choose **Russian** in the heading **Explore ready-made decks about …**, read the row of decks, then press **Add** on Russian A1 Vocabulary.

## End state

The row holds Read the Russian Alphabet, Russian A1 Vocabulary, then Core Russian Words. After **Add** the page is the deck's review, Russian A1 Vocabulary is in `/api/decks`, and the New card's cue draws its stress in place.

## Gotchas

- Seeding `publisher` signs the browser in as it, so the recipe signs in as `fresh` again before driving.

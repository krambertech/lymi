# First run for a Ukrainian beginner

A new learner who chooses Ukrainian in the heading **Explore ready-made decks about …** on Today is offered the alphabet, then A1, then A2, then Core Ukrainian Words, then the rest of the Ukrainian shelf in Explore's order. `BEGINNER_DECKS` in `packages/client/src/welcome.ts` names them by slug, and a missing one leaves its place to the shelf's next deck.

## Reach

`fresh` on `/today`, once the `publisher` persona has published its small Ukrainian decks under production's slugs. Its seed publishes Core Ukrainian Words first and the alphabet last, so the offer is reordered rather than already in order.

## Drive

[`first-run-ukrainian.mjs`](first-run-ukrainian.mjs): seed `publisher`, sign in again as `fresh`, choose **Ukrainian** in the heading **Explore ready-made decks about …**, read the row of decks, then press **Add** on Ukrainian A1 Vocabulary.

## End state

The row holds Read the Ukrainian Alphabet, Ukrainian A1 Vocabulary, Ukrainian A2 Vocabulary, then Core Ukrainian Words. After **Add** the page is the deck's review, Ukrainian A1 Vocabulary is in `/api/decks`, and the New card's cue draws its stress in place.

## Gotchas

- Seeding `publisher` signs the browser in as it, so the recipe signs in as `fresh` again before driving.

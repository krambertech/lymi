# First run for a Chinese beginner

A new learner who chooses Chinese in the heading **Explore ready-made decks about …** on Today is offered HSK 1, then HSK 2, then the rest of the Chinese shelf in Explore's order. `BEGINNER_DECKS` in `packages/client/src/welcome.ts` names them by slug, and a missing one leaves its place to the shelf's next deck.

## Reach

`fresh` on `/today`, once the `publisher` persona has published its small Chinese decks under production's slugs. Its seed publishes Core Chinese Words first and HSK 1 last, so the offer is reordered rather than already in order.

## Drive

[`first-run-chinese.mjs`](first-run-chinese.mjs): seed `publisher`, sign in again as `fresh`, choose **Chinese** in the heading **Explore ready-made decks about …**, read the row of decks, then press **Add** on Chinese HSK 1 Vocabulary.

## End state

The row holds Chinese HSK 1 Vocabulary, Chinese HSK 2 Vocabulary, then Core Chinese Words. After **Add** the page is the deck's review, Chinese HSK 1 Vocabulary is in `/api/decks`, and the first card draws pinyin over its hanzi.

## Gotchas

- Seeding `publisher` signs the browser in as it, so the recipe signs in as `fresh` again before driving.

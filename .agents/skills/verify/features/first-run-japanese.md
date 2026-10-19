# First run for a Japanese beginner

A new learner who chooses Japanese in the heading **Explore ready-made decks about …** on Today is offered the decks a beginner starts from, in the order to take them: Read Japanese Kana, JLPT N5, JLPT N4, then Japanese Essentials. `BEGINNER_DECKS` in `packages/client/src/welcome.ts` names them by slug, and a missing one leaves its place to the shelf's next deck in Explore's order.

## Reach

`fresh` on `/today`, once the `publisher` persona has published its small Japanese decks under production's slugs. Its seed publishes them in production's order, with Japanese Essentials first, so the offer is reordered rather than already in order.

## Drive

[`first-run-japanese.mjs`](first-run-japanese.mjs): seed `publisher`, sign in again as `fresh`, choose **Japanese** in the heading **Explore ready-made decks about …**, read the row of decks, then press **Add** on Read Japanese Kana.

## End state

The row holds the four beginner decks first, in the order above. After **Add** the page is the deck's review and Read Japanese Kana is in `/api/decks`.

## Gotchas

- Seeding `publisher` signs the browser in as it, so the recipe signs in as `fresh` again before driving.
- Core Japanese Words is published too and comes after the beginner decks, fifth in the row.

# First run for a Polish beginner

A new learner who chooses Polish in the heading **Explore ready-made decks about …** on Today is offered A1, then A2, then Core Polish Words, then the rest of the Polish shelf in Explore's order. Polish is a configured language, not a supported one: `BEGINNER_DECKS` in `packages/client/src/welcome.ts` takes a configured tag as well, and a missing deck leaves its place to the shelf's next deck. A Polish card draws no stress on its cue; a word that breaks the stress rule keeps it in its pronunciation, shown after the turn.

## Reach

`fresh` on `/today`, once the `publisher` persona has published its small Polish decks under production's slugs. Its seed publishes Core Polish Words first and A1 last, so the offer is reordered rather than already in order.

## Drive

[`first-run-polish.mjs`](first-run-polish.mjs): seed `publisher`, sign in again as `fresh`, choose **Polish** in the heading **Explore ready-made decks about …**, read the row of decks, then press **Add** on Polish A1 Vocabulary.

## End state

The row holds Polish A1 Vocabulary, Polish A2 Vocabulary, Core Polish Words, then Polish for Offices and Paperwork. After **Add** the page is the deck's review, Polish A1 Vocabulary is in `/api/decks`, and the New card's cue carries no stress mark.

## Gotchas

- Seeding `publisher` signs the browser in as it, so the recipe signs in as `fresh` again before driving.
- An alphabet deck will go first in the path once it is published; the recipe names the decks in order, so add it there too.

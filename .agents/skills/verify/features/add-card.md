# Add a card

The learner writes a term and its meaning into a deck from the **Add a card** sheet. A term already active anywhere in their decks is a duplicate: the sheet says which deck has it and adds nothing.

## Reach

The deck page's **Add → New card** menu or `N`, the rail's **Add** menu, or Today's **Add cards** under New cards.

## Drive

[`add-card.mjs`](add-card.mjs), as `learner` from Library: open **Lezione 12**, choose **Add → New card**, fill **Term** with `la nebbia` and **Meaning** with `the fog`, press the **Notes** chip and write a note in the field it adds, open the **Tags** chip and pick **noun**, press the **Memory hook** chip at the row's end and write a hook, and press **Add to Lezione 12**.

## End state

The sheet closes, **Notifications** says **Added “la nebbia”**, and the card is in the deck's list, also after a reload. `/api/decks` gives Lezione 12 one more card, and `/api/cards?term=la%20nebbia` returns exactly one card, in that deck, with that meaning, the note, the tag `noun` and the hook as the learner's own. Before adding, the Tags chip reads **noun**. In the deck's review, graded Good up to the new card, **Peek at your hook** shows the hook under the cue.

## Gotchas

- Pick a term the persona does not have: `sbrigarsi` is already in Lezione 12, so adding it again keeps the sheet open on the duplicate notice.
- `GET /api/decks/<id>` carries no counts; read `total` from the `/api/decks` list.
- The optional fields are chips in one row that scrolls sideways, the same on a desktop and a phone; a chip off the end of the row needs the row scrolled before it can be pressed.
- Tags is a combobox trigger rather than a button, so find it by its label.
- A review of chosen cards (`/review?deck=…&cards=[…]`) draws nothing for a card never reviewed, so reach a new card through the deck's own review.

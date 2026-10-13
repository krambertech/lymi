# Add a card

The learner writes a term and its meaning into a deck from the **Add a card** sheet. A term already active anywhere in their decks is a duplicate: the sheet says which deck has it and adds nothing.

## Reach

The deck page's **Add card** button or `N`, the rail's **Add** menu, or Today's **Add cards** under New cards.

## Drive

[`add-card.mjs`](add-card.mjs), as `learner` from Library: open **Lezione 12**, press **Add card**, fill **Term** with `la nebbia` and **Meaning** with `the fog`, and press **Add to Lezione 12**.

## End state

The sheet closes, **Notifications** says **Added “la nebbia”**, and the card is in the deck's list, also after a reload. `/api/decks` gives Lezione 12 one more card, and `/api/cards?term=la%20nebbia` returns exactly one card, in that deck, with that meaning.

## Gotchas

- Pick a term the persona does not have: `sbrigarsi` is already in Lezione 12, so adding it again keeps the sheet open on the duplicate notice.
- `GET /api/decks/<id>` carries no counts; read `total` from the `/api/decks` list.
- On a phone the sheet's optional fields sit behind their own buttons instead of **More fields**.

# Library and the deck page

Library holds every deck with its due and card counts. A deck's page lists its cards as a glossary that can be filtered, sorted and searched; a card opens over the page, or beside it in a window wide enough for both.

## Reach

**Library** in the rail or the tab bar, then a deck; or `/library/<deck id>`.

## Drive

[`deck-page.mjs`](deck-page.mjs), as `learner` from Library: check the summary line and each deck's link, open **Lezione 12**, filter to **Due today** and remove the filter from its chip, then open the first card.

## End state

Library reads **3 decks · 43 cards**, matching the totals from `/api/decks`. The deck page lists as many cards as the deck's `total`, the Due today filter as many as its `due` (or **No cards match these filters** when that is 0), and removing the chip brings every card back. The opened card shows the term and meaning `/api/cards?deckId=<id>` stores for it.

## Gotchas

- The rail lists the decks too, so scope deck links to `main`.
- Which deck holds the due cards varies between seeds; read `due` from the API rather than expecting a number.
- At 1280 px the card opens beside the list, and on a phone over it; drive both widths when the change touches the card's panel.

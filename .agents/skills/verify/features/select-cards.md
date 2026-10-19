# Select cards

Select cards on a deck's page chooses cards from the list, and its Actions menu reviews them or changes them all at once. A selection can be the whole deck, so every action has to hold for thousands of cards, past the 200 a single bulk call carries.

## Reach

A deck's page, **Deck options**, then **Select cards**; **Select all** chooses every card the list shows.

## Drive

[`select-cards.mjs`](select-cards.mjs), as `heavy` on **Suomi 1–24**, 2,250 cards in 24 sections: select all, put a new tag on every card from **Tags…**, then, with the same cards still chosen, move every card to **Lesson 1** from **Move to section…**, mark every card from **Mark important**, and move every card to **Finnish cases** from **Move to deck…** and take Undo; then select all again, archive every card from **Archive** and take Undo.

## End state

Select all reads **2,250 selected**. Tags… saves with **Changed the tags on 2,250 cards**, and `/api/decks/<id>/cards` shows the new tag on every card. Move to section… says **Moved 2,250 cards to Lesson 1**, and every card's `sectionId` is Lesson 1's id from `/api/decks/<id>/sections`. Tags…, Move to section… and Mark important each leave **2,250 selected** in the toolbar. Mark important says **Marked 2,250 cards important** and every card is `important`. Move to deck says **Moved 2,250 cards to Finnish cases**, ends the selection, `/api/decks` adds 2,250 to that deck's `total`, and Undo puts them back, each in Lesson 1 again. Archive says **Archived 2,250 cards**, the deck's `total` reads 0, and Undo brings it back to 2,250.

## Gotchas

- `heavy` seeds in about 40 seconds, and the runner resets it before the recipe, so the first page waits.
- Counts past 999 show with a thousands separator, "2,250", in English.

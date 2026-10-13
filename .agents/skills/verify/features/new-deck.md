# Create a deck

A deck is created from one sheet: its name and how its cards are asked, plus what it is for once a pull request adds that question. Creating it lands the learner in the empty deck.

## Reach

**Add** in the rail or the tab bar, then **New deck**; Library's empty state and the start guide open the same sheet.

## Drive

[`new-deck.mjs`](new-deck.mjs), as `learner` from Library: create **Lezione 13**, check the empty deck, then return to Library. Its `createDeck` helper fills the sheet for any recipe that needs a new deck, so a change to the sheet is made there once.

## End state

The page is `/library/<id>` for a deck `/api/decks` lists with `role` owner and `total` 0, and Library reads one deck more than the seed's three.

## Gotchas

- When the sheet asks what the deck is for, the helper picks **Something else**, which needs no language; drive the language path by hand when a change touches it.
- The offline-writes recipe creates its deck through the same helper, so a broken sheet fails both.

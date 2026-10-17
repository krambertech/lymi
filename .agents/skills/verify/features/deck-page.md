# Library and the deck page

Library holds every deck with its due and card counts, the decks outside a series first and then each series under its name with Review all on a strip under its plate. A deck's page lists its cards as a glossary that can be filtered, sorted and searched; a card opens over the page, or beside it in a window wide enough for both.

## Reach

**Library** in the rail or the tab bar, then a deck; or `/library/<deck id>`.

## Drive

[`deck-page.mjs`](deck-page.mjs), as `learner` from Library: check the summary line and each deck's link, search Library for one deck and for something that matches nothing, make a series **Italiano** of Lezione 12 and Verbi, make a deck **Parole** from that series' menu, open **Lezione 12**, filter to **Due today** and remove the filter from its chip, open the first card, filter by the **money** tag, select all its cards and open **Actions**, search for something that matches nothing, check that another deck opens without the filters, then filter to **Known**, select all and choose a review from **Actions**.

## End state

Library reads **3 decks · 43 cards**, matching the totals from `/api/decks`. A search leaves only the matching deck, or **No decks match “zzz”**, and Clear search brings every deck back. The new series is a region holding its decks, with **Review Italiano, N cards due** counting their `due`, and `/api/series` lists both decks; Parole opens on its own page and `/api/decks` gives it the series' id. The deck page lists as many cards as the deck's `total`, the Due today filter as many as its `due` (or **No cards match these filters** when that is 0), and removing the chip brings every card back. The opened card shows the term and meaning `/api/cards?deckId=<id>` stores for it. Selecting the money filter's cards reads **N selected**, and Actions offers **Review N due** and **Review all N**, counting the started cards not reviewed today from `/api/decks/<id>/cards`. The search shows **No cards match “zzz”** in the list's place, another deck opens with no filter chips, and Review opens a review whose header counts 0 of the `total` of `/api/review/queue` for the same filter.

## Gotchas

- The rail lists the decks too, so scope deck links to `main`.
- Which deck holds the due cards varies between seeds; read `due` from the API rather than expecting a number.
- At 1280 px the card opens beside the list, and on a phone over it; drive both widths when the change touches the card's panel.

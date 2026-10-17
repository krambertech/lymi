# Deck filters

A deck page's **Filter** opens one sheet: State and Due on its first level, with **Any section** and **Any tag** each opening a level of its own. Each tap changes a draft that the count under the title answers, **Reset filters** clears the draft, ✓ (**Apply filters**) applies it and Close leaves the filters as they were. While the list is filtered, the Filter pill shows how many filters are on, and the tab bar's accessory reviews what the filters show, as **Review N filtered cards**; before iOS 26 the same button sits under the filters.

## Reach

A deck's page, then **Filter**.

## Drive

[`deck-filters.yaml`](deck-filters.yaml), as `learner`, after [`deck-filters.mjs`](deck-filters.mjs) tags two due cards and one that is not due **paperwork** in the learner's deck with the most due: open **Filter** and see the deck's total, open **Any tag**, tick paperwork and see **3 of N cards**, apply, see a tagged card and not an untagged one, and the accessory's **Review 2 filtered cards**. Reopen, take **Reset filters** and see the total again, then Cancel and see the list still filtered. Take the accessory's review through to **No filtered cards left**.

## End state

Both due paperwork cards have a grade today in the log of `POST /api/review/draw` over them.

## Gotchas

- The persona's due cards are picked at each reset, so the check tags cards by what the draw says is due rather than using a seeded tag.
- The Tags level has a **Tags** heading on the first level too, so the flow waits for the tag's row rather than the title.

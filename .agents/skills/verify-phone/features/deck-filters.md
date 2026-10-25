# Deck filters

A deck page's **Filter** opens one sheet: State and Due on its first level, with **Any section** and **Any tag** each opening a level of its own. Each tap changes a draft that the count under the title answers, **Reset filters** clears the draft, ✓ (**Apply filters**) applies it and Cancel leaves the filters as they were. While the list is filtered, the Filter pill shows how many filters are on. What the filters show is reviewed as on the web: **Select cards**, **Select all**, then **Review N due** or **Review all N** in the selection's Actions menu.

## Reach

A deck's page, then **Filter**.

## Drive

[`deck-filters.yaml`](deck-filters.yaml), as `learner`, after [`deck-filters.mjs`](deck-filters.mjs) tags two due cards and one that is not due **paperwork** in the learner's deck with the most due: open **Filter** and see the deck's total, open **Any tag**, tick paperwork and see **3 of N cards**, apply, and see a tagged card but not an untagged one. Reopen, take **Reset filters** and see the total again, then Cancel and see the list still filtered. Select all, take **Review N due** through to **Round done**.

## End state

Every card graded today in the deck carries the tag, so Select all chose only what the filter showed.

## Gotchas

- The persona's due cards are picked at each reset, so the check tags cards by what the draw says is due rather than using a seeded tag.
- The first level has a **Tags** heading too, so the flow waits for the tag's row rather than the Tags level's title.

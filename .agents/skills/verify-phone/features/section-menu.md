# Section heading menu

A section's heading on a deck's page opens the same rows as its ⋯ on a long press: **Start anyway** while it is locked, **Review this section** when it has cards due, **Select cards** for anyone when it has cards, and for the deck's owner **Add card here**, **Rename section** and **Reorder sections**, which open the deck's Sections page renaming that section or in Edit, then **Archive section**. A tap opens the section's page ([section-page.md](section-page.md)).

## Reach

A deck with sections, then hold a section's heading.

## Drive

[`section-menu.yaml`](section-menu.yaml), as `learner`, after [`section-menu.mjs`](section-menu.mjs) gives the first deck two sections of five cards each through the API: open the deck by link, hold the first section's heading, check **Rename section** and **Reorder sections**, and take **Reorder sections**, which lands on Sections in Edit with **Done** in the bar.

## End state

Nothing is written by the flow; the check reads the two sections back in their order.

## Gotchas

- The heading reads **name, N cards**, with **not open yet** after the name while it is locked. The summary's tile for the same section reads **name, N of M cards known**, so the flow matches the heading's form; a long press on the tile opens the section's page.
- A member of the deck sees no Rename or Reorder. The phone signs in only as `learner`, whose seed has no sections, hence the API setup.

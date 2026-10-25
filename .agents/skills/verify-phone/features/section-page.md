# Section tiles, the Sections page and section pages

A deck with sections shows them in its summary as tiles, each with its ring, name and known of total, opening on the learner's section, which reads **You are here**, then one sentence about what opens the next and **All sections**, which opens the Sections page: how many sections are known, a column each, and the path of sections, each opening its page. A tap on a tile, a stop on the Sections page or a section's heading opens that section's page: the deck's page kept to one section, with **Section N of M**, percent known, the state bar, **Review this section** or **Start anyway**, Filter and Sort, the section's cards, and **Previous** and **Next** between sections. Its ⋯ is the section's menu: for the owner Add card here, **Select cards**, Rename, Reorder and **Archive section**. Cards with no section get a page named **No section**, last in the line, whose menu has only Select cards. [docs/proposals/section-pages.md](../../../../docs/proposals/section-pages.md)

## Reach

A deck with sections, then a tile in its summary, **All sections** and a stop, or a section's heading in its list.

## Drive

[`section-page.yaml`](section-page.yaml), as `learner`, after [`section-page.mjs`](section-page.mjs) gives the learner's own deck four sections, five cards in each of the first two and one new card in each of the last two: see the tiles with **You are here**, open the second section from its tile, check its menu, select all its cards and archive them, step **Next** to the third, whose summary says what opens it, then to the fourth, which waits, with **Start anyway**, **Opens after Next week.** and its locked card, step **Next** to No section and see Select cards without Archive section, step back and take **Archive section**, keep its card, and land on the deck with its Undo toast, tap the first section's heading and land on its page, then go back, open **All sections**, see **of 3 known**, and open the first section from its stop.

## End state

The deck has three sections, and the second holds no cards in `/api/decks/<id>/sections`.

## Gotchas

- A tile reads **name, N of M cards known**, with **You are here** after it on the current section, or **name, not open yet** while it waits. A stop on the Sections page reads **Section N: name, …**.
- The page's label **Section 2 of 4** is drawn uppercase; match it case-insensitively. It counts sections only; No section is a stop for Previous and Next but not a number.
- Which section is current, and so whether the third is ready or waits, depends on what the seed's learner knows on the day, so the flow accepts either sentence.
- Select cards on a section's page starts with none chosen; from a heading's menu on the deck it starts with that section's cards chosen.

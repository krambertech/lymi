# Section line and section pages

A deck with sections shows them in its summary as one line of columns, filled with known and learning, ringed on the section the learner is on, with a tick where the next opens and one sentence about what opens it. A tap on a column or a section's heading opens that section's page: the deck's page kept to one section, with **Section N of M**, percent known, the state bar, **Review this section** or **Start anyway**, Filter and Sort, the section's cards, and **Previous** and **Next** between sections. Its ⋯ is the section's menu: for the owner Add card here, **Select cards**, Rename, Reorder and **Archive section**. Cards with no section get a page named **No section**, last in the line, whose menu has only Select cards. [docs/proposals/section-pages.md](../../../../docs/proposals/section-pages.md)

## Reach

A deck with sections, then a column of the line in its summary, or a section's heading in its list.

## Drive

[`section-page.yaml`](section-page.yaml), as `learner`, after [`section-page.mjs`](section-page.mjs) gives the learner's own deck four sections, five cards in each of the first two and one new card in each of the last two: see the line with **You are here**, open the second section from its column, check its menu, select all its cards and archive them, step **Next** to the third, whose summary says what opens it, then to the fourth, which waits, with **Start anyway**, **Opens after Next week.** and its locked card, step **Next** to No section and see Select cards without Archive section, step back and take **Archive section**, which lands on the deck with its Undo toast, then tap the first section's heading and land on its page.

## End state

The deck has three sections, and the second holds no cards in `/api/decks/<id>/sections`.

## Gotchas

- A column reads **name, N of M cards known**, with **You are here** after it on the current section, or **name, not open yet** while it waits.
- The page's label **Section 2 of 4** is drawn uppercase; match it case-insensitively. It counts sections only; No section is a stop for Previous and Next but not a number.
- Which section is current, and so whether the third is ready or waits, depends on what the seed's learner knows on the day, so the flow accepts either sentence.
- Select cards on a section's page starts with none chosen; from a heading's menu on the deck it starts with that section's cards chosen.

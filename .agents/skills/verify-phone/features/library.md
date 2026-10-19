# Library and the deck page

The **Library** tab lists the learner's decks with their due counts and an archive; a deck's page shows what is due, its cards by state and when they were added, and each card opens its own page with details and history.

## Reach

The **Library** tab, then a deck row, then a card row. Today's **Library** link reaches the same list.

## Drive

[`library.yaml`](library.yaml), as `learner`: open **Library** and check **New deck**, open the first deck, check its **N cards** and **Search this deck**, scroll to its most recently added card and open it, check **Meaning** and its text, then go back to **Library** and scroll to **Archived**.

## End state

The deck page shows the name and card total `/api/decks` holds for the first deck in no series, a shared one for `learner`, and the card page shows the meaning `/api/cards?deckId=` holds, which [`library.mjs`](library.mjs) passes to the flow. Browsing writes nothing, so the stored card count is unchanged.

## Gotchas

- Each deck row sits inside expo-router's `Link.Trigger`, whose native preview view hides the row from XCUITest, so Maestro cannot find it by its label. The flow taps the first row by position and then asserts the deck's name and total, so a wrong tap fails.
- Series and shared decks push **Archived** below the fold, so the flow scrolls to it last, after the position tap that needs the list at its top.
- A row under **Decks to review** on Today opens that deck's review, not its page.
- Card rows read **term, meaning, state**, such as **obrigada, thank you, New**.

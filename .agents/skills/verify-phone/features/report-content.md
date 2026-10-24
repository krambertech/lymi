# Report a shared deck or card

A learner reports a deck or card someone else wrote, as on the web: a sheet with five reasons, an optional note, and Send report in its header. A sent report closes the sheet with a toast, and Lymi gets an email at hello@lymi.app at once.

## Reach

In a deck someone else owns: **Deck options** › **Report deck**, About this deck's **Report deck** row, **Card options** › **Report card** on a card's page, and **Report card** in review's card sheet after the reveal. On a join screen, signed in and not yet a member: **Report this deck**.

## Drive

[`report-content.yaml`](report-content.yaml), as `learner` on Noor's **Lisboa a dois**: open About this deck, report the deck as spam with Send report before a reason and then with one, then open the deck's first card and report it from **Card options**.

## End state

[`report-content.mjs`](report-content.mjs) reads the local outbox after the flow: the latest email to hello@lymi.app names **Hateful or offensive** and the card's term.

## Gotchas

- Send report is the header's amber action; its accessibility label is **Send report**.
- Maestro does not match a curly apostrophe, so the flow writes `.` in its place.
- Card options is iOS's own menu, so Report card is found by its text once the menu is open.

# Share deck and join links

**Share deck** is the owner's sheet for sharing a deck: People first, with the invite field over the owner, members and invitations not joined yet, then **Who can join** with the join link, Copy link, Share and Turn off link. A join link opened in the app shows the deck to join, or says why the link no longer works.

## Reach

As the owner, **Share deck** in a deck's menu or at the foot of its settings. A join link reaches the join screen from Messages or Safari once universal links are live, or as `lymi://join/<token>`.

## Drive

[`sharing.yaml`](sharing.yaml), as `learner`: open Share deck for the learner's first owned deck, check that **Who can join** sits below **People**, turn the link on with **Anyone with the link**, turn it off with **Turn off link** and its alert, then open a join link that never existed and check **This join link does not work** with **Go to Today**.

## End state

[`sharing.mjs`](sharing.mjs) reads `/api/decks/<id>/join-link` after the flow: `link` is null again, because the flow turned it off. Turning it on and off writes no cards, so the stored card count is unchanged.

## Gotchas

- Share deck opens at its peek, so the flow scrolls to the link's buttons before it asserts them.
- The flow opens the sheet as `lymi://share?id=<deck>`, because the deck menu is iOS's own and a position tap could land on a deck the learner joined rather than owns.
- **Turn off link** is both the button under the link and the alert's destructive button; the flow taps the one above **Copy link**, since the sheet's own sits below it.
- Signed out, a dead link offers **Go to Lymi** instead of **Go to Today**; the flow stays signed in, so that branch needs a manual check.

# Assistant offer

While no app is connected, the rail shows a card above the learner offering to connect an AI assistant. It holds the Claude, ChatGPT, Gemini and Grok marks, each linking to its own setup guide, and a title and line that open all the guides. It has no button, so in a short window the places stay above it. Its Dismiss shows on hover and hides the card on this device; the learner menu keeps Connect AI assistant until an app connects.

## Reach

Any product screen at desktop width, as a learner with no connected apps.

## Drive

[`assistant-offer.mjs`](assistant-offer.mjs), as `learner`: check every link, shrink the window to 768 × 520, dismiss the card, open the learner menu, then reload.

## End state

`/api/connected-apps` is empty, the card is gone after a reload, and the learner menu still holds Connect AI assistant. At 768 × 520 Today, Library, Insights and Explore are in view above the card.

## Gotchas

- The rail exists only at desktop width, so under `--phone` the recipe drives nothing.
- Dismissing is stored in the browser, not on the account; a fresh browser shows the card again.
- The runner sets reduced motion, so the marks' hover spread never runs here.

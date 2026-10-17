# Reveal hint

The pointing hand and the line at the foot of an unrevealed card that say how to reveal it. Only an account that has reviewed on fewer than three days sees it: after a second on its first cards on a device, and after a minute on an idle card. `revealHintDelayMs` in `packages/client/src/reveal-hint.ts` holds the rule; motion.md "Review" describes it.

## Reach

`/review` on any card, before the reveal.

## Drive

[`reveal-hint.mjs`](reveal-hint.mjs), as `fresh`: give the account a deck of two cards through the API, open `/review` and wait for the hint. Then sign in as `learner`, clear `lymi-reveals` so the browser counts as new, open `/review`, wait three seconds and check no hint shows.

## End state

The fresh account, with 0 review days, sees **Recall the answer, then reveal the card** within a second or two. The learner, with more than three review days, sees no hint even with this browser's reveal count cleared.

## Gotchas

- The hint is `aria-hidden`, so find it by its text, not its role.
- Both wordings, **tap the card** for a narrow card and **reveal the card** for a wide one, are in the page with one hidden by CSS, so match both and keep only the visible one.
- The idle case waits a full minute, so the recipe does not drive it.

# Reveal nudge

The pointing hand and the line at the foot of an unrevealed card that say how to reveal it. Only an account that has reviewed on fewer than three days sees it: after a second on its first cards on a device, and after a minute on an idle card. `revealNudgeDelayMs` in `packages/client/src/reveal-nudge.ts` holds the rule; [motion.md](../../../../docs/design/system/motion.md#review) describes it.

## Reach

`/review` on any card, before the reveal.

## Drive

[`reveal-nudge.mjs`](reveal-nudge.mjs), as `fresh`: give the account a deck of two cards through the API, open `/review` and wait for the nudge. Then sign in as `learner`, clear `lymi-reveals` so the browser counts as new, open `/review`, wait three seconds and check no nudge shows.

## End state

The fresh account, with 0 review days, sees **Try to remember, then reveal the answer** within a second or two. The learner, with more than three review days, sees no nudge even with this browser's reveal count cleared.

## Gotchas

- The nudge is `aria-hidden`, so find it by its text, not its role.
- Both wordings, **tap to reveal** for a narrow card and **reveal the answer** for a wide one, are in the page with one hidden by CSS, so match both and keep only the visible one.
- The idle case waits a full minute, so the recipe does not drive it.

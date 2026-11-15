# Hints in review

A hint under the cue in review: Show hint after the reveal, the offer to write one on an often-forgotten card, and the sheet that writes it with Draft. The hint takes room only as it shows, so the answer glides down for it, and review marks no source, on the hint or the answer. [phone.md](../../../../docs/design/system/phone.md#review) owns the rules.

## Reach

A review of a deck holding a card with a hint, and of Tricky Estonian, which `POST /api/dev/often-forgotten` fills with cards that offer one.

## Drive

[`review-hints.yaml`](review-hints.yaml), as `learner` with AI allowed: open the review of Hint glide, whose one card has a long hint and an AI meaning, reveal without peeking, and show the hint. Grade Good, open Tricky Estonian's review, reveal, take **Try a hint**, press **Draft**, then **Another draft**, and save.

## End state

`02-revealed` has Show hint under the cue with the rule straight after it, and `03-hint-shown` the whole hint there instead, with no empty room before the rule and no **AI** chip on the card. `05-drafting` to `07-drafting-again` show Draft keep its place and look from **Draft** to **Drafting…** to **Another draft**, with no **AI draft** label. `08-saved-under-cue` has the saved hint under the cue, and [`review-hints.mjs`](review-hints.mjs) finds it stored with the AI as its source.

## Gotchas

- The card is one element to VoiceOver and the hint sheet is native, so Maestro's hierarchy has neither Show hint, the offer, the hint line, Draft nor ✓; each is tapped where it sits on the iPhone 17, and the screenshots are the proof of what they show.
- Draft calls the model through the AI Gateway, which needs `AI_GATEWAY_TOKEN` in `apps/web/.dev.vars`; without it the sheet says it couldn't draft, Another draft never shows and the check fails. To see the states without a token, make `hintDraftFor` in `apps/web/src/server/services/hint-draft.ts` wait ten seconds and return a fixed hint, and leave that change uncommitted.
- A tap waits for the screen to settle, so **Drafting…** is caught only when the draft takes longer than that wait.

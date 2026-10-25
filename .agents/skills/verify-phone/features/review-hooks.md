# Hooks in review

A memory hook under the cue in review: Show hook after the reveal, the offer to write one on an often-forgotten card, and the sheet that writes it with Draft. The hook takes room only as it shows, so the answer glides down for it, and review marks no source, on the hook or the answer. [`phone.md`](../../../../docs/design/system/phone.md) "Review" owns the rules.

## Reach

A review of a deck holding a card with a hook, and of Tricky Estonian, which `POST /api/dev/often-forgotten` fills with cards that offer one.

## Drive

[`review-hooks.yaml`](review-hooks.yaml), as `learner` with AI allowed: open the review of Hook glide, whose one card has a long hook and an AI meaning, reveal without peeking, and show the hook. Grade Good, open Tricky Estonian's review, reveal, take **Try a memory hook**, press **Draft**, then **Another draft**, and save.

## End state

`02-revealed` has Show hook under the cue with the rule straight after it, and `03-hook-shown` the whole hook there instead, with no empty room before the rule and no **AI** chip on the card. `05-drafting` to `07-drafting-again` show Draft keep its place and look from **Draft** to **Drafting…** to **Another draft**, with no **AI draft** label. `08-saved-under-cue` has the saved hook under the cue, and [`review-hooks.mjs`](review-hooks.mjs) finds it stored with the AI as its source.

## Gotchas

- The card is one element to VoiceOver and the hook sheet is native, so Maestro's hierarchy has neither Show hook, the offer, the hook line, Draft nor ✓; each is tapped where it sits on the iPhone 17, and the screenshots are the proof of what they show.
- Draft calls the model through the AI Gateway, which needs `AI_GATEWAY_TOKEN` in `apps/web/.dev.vars`; without it the sheet says it couldn't draft, Another draft never shows and the check fails. To see the states without a token, make `hookDraftFor` in `apps/web/src/server/services/hook-draft.ts` wait ten seconds and return a fixed hook, never committed.
- A tap waits for the screen to settle, so **Drafting…** is caught only when the draft takes longer than that wait.

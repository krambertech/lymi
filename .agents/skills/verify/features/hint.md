# Hint

The editor for a card's hint, opened in place under the cue during a review. The learner writes a hint or asks the AI to draft one into the field, and Enter saves it. `apps/web/src/client/components/hint-editor.tsx` owns it.

## Reach

`/review`, reveal a card, then **Card options** › **Add hint** (or **Edit hint** when the card has one).

## Drive

[`hint.mjs`](hint.mjs), as `learner`: reveal the first card, open its hint, press **Draft a hint** and check the button reads **Drafting…** while the draft is on its way, let the draft land, then press Enter.

## End state

While drafting, the button is named **Drafting a hint…** and no second status line repeats it. The draft fills the field, the button becomes **Another draft**, and no AI chip sits beside the field. After Enter, a **Hint added** or **Hint saved** toast shows and `GET /api/cards/<id>` returns the draft as the card's `hint`.

## Gotchas

- The recipe answers `POST /api/cards/<id>/hint-draft` itself, so it needs no AI key and holds the drafting state until it has checked it.
- The menu appears only after the reveal.

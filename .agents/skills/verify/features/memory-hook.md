# Memory hook

The editor for a card's memory hook, opened in place under the cue during a review. The learner writes a hook or asks the AI to draft one into the field, and Enter saves it. `apps/web/src/client/components/hook-editor.tsx` owns it.

## Reach

`/review`, reveal a card, then **Card options** › **Add hook** (or **Edit hook** when the card has one).

## Drive

[`memory-hook.mjs`](memory-hook.mjs), as `learner`: reveal the first card, open its hook, press **Draft a hook** and check the button reads **Drafting…** while the draft is on its way, let the draft land, then press Enter.

## End state

While drafting, the button is named **Drafting a hook…** and no second status line repeats it. The draft fills the field, the button becomes **Another draft**, and no AI chip sits beside the field. After Enter, a **Hook added** or **Hook saved** toast shows and `GET /api/cards/<id>` returns the draft as the card's `hook`.

## Gotchas

- The recipe answers `POST /api/cards/<id>/hook-draft` itself, so it needs no AI key and holds the drafting state until it has checked it.
- The menu appears only after the reveal.

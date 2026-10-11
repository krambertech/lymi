---
status: accepted
date: 2026-10-11
decision: after the reveal, a second tap or quiet side buttons open one card menu; AI hook drafting follows
---

# Card actions during review

## Outcome

A learner who spots something wrong with a card, or wants a hook for it, can change it without leaving review and carry on from the same card. Today the editor opens in review only from the fix offer on an often-forgotten card. The way in must stay out of sight until it is wanted: review is about recall, and nothing on the card or around it may move to make room.

## Accepted shape

Card actions exist only after the reveal. Before it the screen is unchanged, because every action shows the answer.

On touch nothing is drawn. A second tap on the revealed card, or pressing and holding it, opens the card menu as a drawer while the card lifts slightly. A tap within 400 ms of the reveal is taken as part of the reveal, and taps on the card's own controls (pronunciation, Show hook, the fix offer) keep their meaning. Tapping a revealed card does nothing today, so the gesture takes nothing away.

With a pointer, two flat icon buttons, Edit card and Card options, fade in outside the plate's end edge, level with its top, so nothing on the card moves. They rest in `muted` and darken to `text-2` on hover; `faint` was tried and fails the 3:1 non-text contrast minimum at 2.5:1 on `canvas`, while `muted` gives 5.2:1 light and 7.2:1 dark. Each names its key in a tooltip. Right-clicking the revealed card opens the same menu at the pointer, and `E` opens Edit. A plain click on the card still does nothing.

The menu holds Edit card, Add a memory hook (Change memory hook once there is one), About this card, and Archive. Edit is the existing `EditCardSheet`. About this card shows the card's deck, section, review counts and where its meaning came from, with a link to the card page.

## Rules

- An edit never changes a grade already given; the card stays current until it is graded, and closing any sheet returns to it as it was.
- A hook added after the reveal behaves like Show hook: it records nothing and Easy stays open.
- Archive takes the card out of the current review and offers Undo, which puts it back where it was.
- A member of a shared deck gets neither the buttons nor the menu, as on the card page.
- An often-forgotten card's fix offer keeps its place and its own sheet; the menu does not replace it.

## Delivery

1. **Card menu in review.** The touch gesture, the pointer buttons, right-click and `E`, and the menu with Edit, a hook the learner writes, About this card, and Archive with Undo. Update the Review section of [layout.md](../design/system/layout.md) and the keyboard shortcuts list.
2. **AI hook drafting.** Draft one with AI in the hook sheet and in the card editor's hook field, with Draft another. The draft changes nothing until the learner saves it, like a [diagnosis](../adr/0025-the-ai-proposes-card-changes-that-apply-only-when-accepted.md) fix: saving is the learner's write, and the text keeps source `ai` and the AI badge until edited. It is not enrichment, which writes without asking. Update the Hook entry in [CONTEXT.md](../../CONTEXT.md).

## Done when

- On a phone, a second tap or a hold on a revealed card opens the menu, and a double tap on the reveal does not.
- On desktop, the side buttons appear only after the reveal and meet 3:1 in both themes, and nothing on the plate shifts when they do.
- Editing, adding a hook and archiving return to review without losing the card's place, the grade strip, or the daily count.
- A member sees no card actions.

## Rejected directions

- A visible "…" in the header or the card's top row: always on view, and in the top row it pushes the state tag aside.
- A footer row on the answer side: a second rule on a card that already has one.
- A "…" beside the term, at the end of the divider, or on the deck label: each reads as acting on one field or on the deck rather than on the card.
- A drag handle at the card's foot: still a visible mark, and it needs drag mechanics for one menu.

For comparison (checked October 2026): Brainscape, RemNote and Quizlet put a ghost pencil in the card's top corner, and Anki desktop puts Edit and More beside its grade buttons. In Quizlet a second tap flips the card back, and in AnkiMobile tapping the answer grades it. No spaced-repetition app found uses a second tap to show actions, though tapping to bring back hidden controls is common in Apple Photos and Kindle.

## Open

- What happens offline: whether an edit or archive made in review queues like a grade or is refused until the connection returns. It should match the card page.

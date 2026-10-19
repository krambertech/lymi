# Archive in review

A learner archives the card in front of them from its menu: the card leaves the review at once and a toast at the screen's foot says **Card archived** with **Undo**, ten seconds long. The toast's place is phone.md "After an action".

## Reach

Reveal a card in a review, then hold it for **Card options**.

## Drive

[`review-archive.yaml`](review-archive.yaml), as `learner` from Today: press **Review**, reveal the card, hold it, press **Archive card**, and see **Card archived** over the next card's cue.

## End state

The toast reads **Card archived** and sits just above the safe area, not where the grades were. `/api/dev/state` counts one card fewer.

## Gotchas

- A revealed card's tap does nothing; its menu opens on a 400 ms hold, so the flow long-presses the card's upper half, clear of the pronunciation button.
- The card's menu is a native sheet that Maestro's hierarchy leaves out, so the flow taps **Archive card** by its place at the sheet's foot (30%, 91% on an iPhone 17).
- Maestro's hierarchy leaves out the review's toast too, so the screenshot taken right after the tap is the proof of its text and place; a later one misses it, since it lasts ten seconds.
- Archive is in the menu only for a card the learner owns; `learner`'s decks are their own.

# Example audio

A language card's example read aloud by generated speech, only when its own play control is pressed: after the answer in review, and on the card page. The first press makes the clip and stores it; a replay plays it again, and an edited example makes a new one. Each learner has 100 new example clips a day.

## Reach

A deck's card, or review after **Reveal the card**: the speaker in the top corner of the example's block, **Play example**. In review a click anywhere on the block, its translation included, plays the example too.

## Drive

[`example-audio.mjs`](example-audio.mjs), as `long` from Library: open **Lange Karten**, then **der Hund**, and press **Play example**; then review the deck until **der Hund** is revealed and click its translation, **The dog is sleeping.**

## End state

The card page has **Say der Hund** and **Play example**. A press asks `/api/audio/<id>/example`; with a speech provider configured it answers `audio/*`, the sound starts and the control reads **Replay example**. A local server without one answers 503 and the control turns red with **Couldn’t play the example. Try again in a moment.**

## Gotchas

- A local server needs a speech key, such as `GEMINI_API_KEY`, to make a clip; without one only the failure path can be seen.
- Japanese is spoken from the example's inline readings, so `毎朝[まいあさ]` is said まいあさ; `exampleAudio`'s tests hold that.
- The review card never passes Playwright's pointer stability check, so drive the control by focus and Enter there, and click the block with `force`.

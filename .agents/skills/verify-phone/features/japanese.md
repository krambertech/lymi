# Japanese

What a card's language changes for Japanese on the phone: review keeps the kana reading in `pronunciation` behind the reveal in every mode, so a term cue never reads itself out, and shows it once the card is revealed.

## Reach

No persona has Japanese cards, so [`japanese.mjs`](japanese.mjs) adds a 日本語 deck holding 上手 read じょうず to `learner` before the flow; the flow opens it from Library and presses its **Review**.

## Drive

[`japanese.yaml`](japanese.yaml): open the deck from Library, press **Review**, check じょうず is not on screen while the card says **Tap to reveal**, then tap low on the card to reveal it.

## End state

After the reveal the grades show and じょうず is on screen. The check reads the stored card back with its reading.

## Gotchas

- The new card is asked as recognition first, so the cue is the term; that is the mode where a reading under the cue would give the answer away.
- Smart add's saved reading is covered by the web's `japanese` recipe and the Worker tests, since a read on the phone needs `ANTHROPIC_API_KEY`.

# Japanese

What a card's language changes for Japanese on the phone: review keeps the kana reading in `pronunciation` behind the reveal in every mode, so a term cue never reads itself out, and shows it once the card is revealed. The term, reading and example draw in Hiragino Sans whatever the device's language, so kanji that Chinese shares keep their Japanese forms.

## Reach

No persona has Japanese cards, so [`japanese.mjs`](japanese.mjs) adds a 日本語 deck holding 直角 read ちょっかく, with the example この角は直角だ。, to `learner` before the flow; the flow opens it from Library and presses its **Review**.

## Drive

[`japanese.yaml`](japanese.yaml): open the deck from Library, press **Review**, check ちょっかく is not on screen while the card says **Tap to reveal**, then tap low on the card to reveal it. Then press **End review** and open the card's row on the deck page.

## End state

After the reveal the grades show and ちょっかく is on screen, and the word screen shows the reading and the example. In `02-revealed-with-reading` and `03-word-screen`, 直 has a long left stroke beside its box and 角's middle stroke stops at the lowest bar: the Japanese forms. The Chinese fallback, PingFang SC, sets 直 on an L-shaped base and runs 角's middle stroke to the bottom. The check reads the stored card back with its reading.

## Gotchas

- The Simulator takes the Mac's languages, so the face is only proven when none of them is Japanese; `xcrun simctl spawn <udid> defaults read -g AppleLanguages` lists them.
- 直 and 角 are the card because their Japanese and Chinese forms differ at a glance.
- The card is one accessibility element whose label joins its lines, so the flow matches the reading inside that label, before the reveal as well as after it.
- The new card is asked as recognition first, so the cue is the term; that is the mode where a reading under the cue would give the answer away.
- Smart add's saved reading is covered by the web's `japanese` recipe and the Worker tests, since a read on the phone needs `ANTHROPIC_API_KEY`.

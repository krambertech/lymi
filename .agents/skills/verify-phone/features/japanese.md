# Japanese

What a card's language changes for Japanese on the phone: furigana from the kana reading in `pronunciation` over the term, and from inline readings (`角[かど]`) over an example. Review draws it on the cue while the card is New or Learning, keeps its room but hides it once the card is Known, and always draws it after the reveal; the separate reading line then stays away. A deck's rows, the card page, its peek and search draw it too, and the pronunciation field is called **Reading**. The term, reading and example draw in Hiragino Sans whatever the device's language, so kanji that Chinese shares keep their Japanese forms.

## Reach

No persona has Japanese cards, so [`japanese.mjs`](japanese.mjs) adds two decks to `learner` before the flow: 日本語 holding the New card 直角 read ちょっかく, with the example `この角[かど]は直角[ちょっかく]だ。`, 漢字 holding 見る read みる, graded Easy two months ago so it is Known and due, and 動詞 holding two important cards: a verb with seven forms and a term too long for a row's three lines.

## Drive

[`japanese.yaml`](japanese.yaml): review 漢字 and check the cue's label does not read みる, then reveal. Open 動詞. Review 日本語 and check the cue's label reads ちょっかく, then reveal and find the example as VoiceOver hears it. End review on the deck page, open the card's row, open its **Reading** field, cancel, and search for 直角.

## End state

`01-known-cue-hidden` shows 見る with no reading over it, and `02-known-revealed` shows み over 見. In `03-long-rows` the verb's forms wrap after た over 食べる and end in its ★, and the long term stops at three lines with … and its ★. `04-new-cue-furigana` shows ちょっかく over 直角 before the reveal; `05-new-revealed-example` shows かど and ちょっかく over the example and no reading line under the term. `06-deck-row`, `07-card-page` and `09-search` draw ちょっかく over 直角, and `08-edit-reading-field` names the field **Reading**. In the screenshots, 直 has a long left stroke beside its box and 角's middle stroke stops at the lowest bar: the Japanese forms. The check reads the stored card back with its reading and its example's inline readings.

## Gotchas

- The Simulator takes the Mac's languages, so the face is only proven when none of them is Japanese; `xcrun simctl spawn <udid> defaults read -g AppleLanguages` lists them.
- 直 and 角 are the card because their Japanese and Chinese forms differ at a glance.
- The card is one accessibility element whose label joins its lines, and furigana is heard as the reading in place of the kanji, so the flow matches `このかどはちょっかくだ。` rather than the example as written.
- A card graded today waits for tomorrow even when made due, so the Known card is graded with a `reviewedAt` in the past.
- A term's reading must be kana only to draw: a `、` in it makes `kanaReading` refuse it, so the long term's reading leaves its comma out.
- A hidden reading's room cannot be asserted by label; compare `01` with `02`, where the term stands where it did.

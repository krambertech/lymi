# Japanese cards

What a card's language changes for Japanese, and for Chinese pinyin on the cue: the duplicate rule compares `ja` and `ja-JP` as one language and keeps homographs with different readings apart, review draws the kana reading in `pronunciation` as furigana rather than a line and draws kanji in a Japanese face (the [furigana](furigana.md) entry covers when it shows), Smart add saves a reading the lesson prints, and audio says the kana reading rather than guessing the kanji's.

## Reach

No persona has Japanese cards, so the recipe makes a deck as `fresh` through `/api/decks` and `/api/cards/batch`, reviews it at `/review?deck=<id>`, and opens Smart add from the deck page's **Add** menu.

## Drive

[`japanese.mjs`](japanese.mjs): add 上手 read じょうず, then 上手 tagged `ja-JP`; open the deck's review and check the cue, then press **Reveal the card**; then Smart add a pasted lesson, with the model's read stood in by a fixed stream that prints 下手's reading, and **Add 2 cards**; then add 上手 read うわて and again read ジョウズ; then type `食[た]べる` as the Term in **Add a card** and send `食[た]べる` and `引[ひ]き出[だ]し` to `/api/cards/batch`; last, review a New card in a Chinese deck.

## End state

The second add is `skipped`. On the New card's cue じょうず is furigana over 上手 in a `lang="ja"` ruby, no line under it reads じょうず, and the cue's computed font names Hiragino Sans; after the reveal the furigana stays. The stored 下手 card has `pronunciation` へた with `pronunciationSource` `lesson`, and 猫, whose lesson printed no reading, has none. 上手 read うわて is added as a second card and ジョウズ is skipped as the reading じょうず already has. The typed `食[た]べる` is stored as 食べる with `pronunciation` たべる, the batch skips `食[た]べる` as that card and adds 引き出し read ひきだし with `normalized` `term` and `pronunciation`. The New Chinese card shows xuéxí under its cue before the reveal, while its meaning does not show.

## Gotchas

- The hidden copy that sizes the card holds the answer before the reveal, so check visible text, never page text.
- The cue line also holds the play button's name, so match the term without `exact`.
- Smart add's read needs `ANTHROPIC_API_KEY` and audio needs a speech provider key; local `.dev.vars` usually has neither, which is why the read is stood in and audio is left to `audio.test.ts`.
- The add's toast is a dialog too, so name Smart add's dialog.

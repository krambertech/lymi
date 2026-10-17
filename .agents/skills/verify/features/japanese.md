# Japanese cards

What a card's language changes for Japanese: the duplicate rule compares `ja` and `ja-JP` as one language, review keeps the kana reading in `pronunciation` behind the reveal and draws kanji in a Japanese face, Smart add saves a reading the lesson prints, and audio says the kana reading rather than guessing the kanji's.

## Reach

No persona has Japanese cards, so the recipe makes a deck as `fresh` through `/api/decks` and `/api/cards/batch`, reviews it at `/review?deck=<id>`, and opens Smart add from the deck page's **Add** menu.

## Drive

[`japanese.mjs`](japanese.mjs): add 上手 read じょうず, then 上手 tagged `ja-JP`; open the deck's review and check the cue, then press **Reveal the card**; then Smart add a pasted lesson, with the model's read stood in by a fixed stream that prints 下手's reading, and **Add 2 cards**.

## End state

The second add is `skipped`. Before the reveal no visible line reads じょうず and the cue's computed font names Hiragino Sans; after it, じょうず shows under the meaning with `lang="ja"`. The stored 下手 card has `pronunciation` へた with `pronunciationSource` `lesson`, and 猫, whose lesson printed no reading, has none.

## Gotchas

- The hidden copy that sizes the card holds the answer before the reveal, so check visible text, never page text.
- The cue line also holds the play button's name, so match the term without `exact`.
- Smart add's read needs `ANTHROPIC_API_KEY` and audio needs a speech provider key; local `.dev.vars` usually has neither, which is why the read is stood in and audio is left to `audio.test.ts`.
- The add's toast is a dialog too, so name Smart add's dialog.

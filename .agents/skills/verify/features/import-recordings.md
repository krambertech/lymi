# Import a Japanese deck with recordings

A Kaishi 1.5k-shaped Anki package keeps each term's own recording as the card's audio, one pitch accent line and the sentence translation in notes, and leaves out sentence audio, frequency and an unplayable clip, saying so in the preview and on the finished import.

## Reach

**Settings**, then **Anki** under importing from another app; or `/import/anki`.

## Drive

[`import-recordings.mjs`](import-recordings.mjs), as `learner`, with `apps/web/src/server/imports/anki/fixtures/kaishi.apkg` (built by `kaishi.py` beside it): **Choose file**, **Looks right**, read the preview's recording lines, **Import 3 cards**, then open the deck, press **Review** and play the first card's pronunciation.

## End state

The preview says 2 cards bring their recordings, 1 recording is in a format Lymi can’t play, 2 clips are left out and 1 pitch accent can’t be read. The finished import says **2 recordings were imported.** 箸's notes are `I eat with chopsticks.`, `Counted with 膳` and `はꜜし [1]`, one per line, and the clip review plays is `audio/mpeg` from the card's `recorded/` key.

## Gotchas

- Without an AI key the local server guesses the deck's language from the learner's other decks, so the deck may arrive as Italian; recordings play whatever the language.
- The review card never passes Playwright's pointer stability check, so the recipe focuses **Play pronunciation** and presses Enter.
- A media element's load is not a Playwright response, so the recipe wraps `HTMLMediaElement.play` and fetches the played address itself.

# Import an HSK-shaped Chinese Anki deck

An Anki package shaped like the HSK decks Chinese learners bring: the pinyin field becomes the Reading without its tone-colour spans, a numbered pinyin field beside it is left out, the traditional form becomes a notes line, sentence pinyin goes inline over the example when Chinese examples draw pinyin, and each word's recording comes across.

## Reach

**Settings**, then **Anki** under importing from another app; or `/import/anki`.

## Drive

[`import-chinese.mjs`](import-chinese.mjs), as `learner`, with the invented package `apps/web/src/server/imports/anki/fixtures/hsk.apkg` (built by `hsk.py` beside it): **Choose file**, **Looks right** for each card kind, **Change languages** to Chinese, **Import 5 cards**, then open the deck and the 银行 card.

## End state

**Imported 5 cards** and **5 recordings were imported.** show. The deck's language is `zh`; 银行's Reading is `yínháng` and its notes start `銀行`, `noun`, `我去銀行。`; 东西's Reading `dong1 xi5` is stored as `dōng xi`; 你好 has no notes. The deck page draws pinyin over each character. Until Chinese examples draw pinyin (`examplesCarryReadings`), 银行's example is `我去银行。` and `Wǒ qù yínháng.` is a notes line; after, the example is `我[Wǒ]去[qù]银行[yín háng]。`.

## Gotchas

- Without an AI key the local server guesses the deck's language from the learner's other decks, so the recipe sets Chinese in the Languages dialog.
- The deck page names a row by its drawn characters, so 银行 with pinyin over it is the button **New 银 行 bank**.

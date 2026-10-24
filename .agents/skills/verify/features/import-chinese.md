# Import an HSK-shaped Chinese Anki deck

An Anki package shaped like the HSK decks Chinese learners bring: its pinyin fields make the deck Chinese, the pinyin field becomes the Reading without its tone-colour spans, a numbered pinyin field beside it is guessed Skip, the traditional form becomes a notes line unless it is written alike, sentence pinyin goes inline over the example when Chinese examples draw pinyin and is otherwise a notes line in tone marks, and each word's recording comes across. A TOCFL deck reads as traditional Chinese and an Italian deck's "Trad." stays its meaning.

## Reach

**Settings**, then **Anki** under importing from another app; or `/import/anki`.

## Drive

[`import-chinese.mjs`](import-chinese.mjs), as `learner`, with the invented package `apps/web/src/server/imports/anki/fixtures/hsk.apkg` (built by `hsk.py` beside it): **Choose file**, **Looks right** for each card kind, open **Change languages** to see both Chinese decks, **Import 9 cards**, then open the deck and the 银行 card.

## End state

**Imported 9 cards** and **6 recordings were imported.** show. The HSK deck's language is `zh`; 银行's Reading is `yínháng`, its notes start `銀行`, `noun`, `我去銀行。` and its example's translation is `I am going to the bank.`; 东西's Reading `dong1 xi5` is stored as `dōng xi`; 行's is `xíng / háng`; 你好 has no notes. The deck page draws pinyin over each character. Until Chinese examples draw pinyin (`examplesCarryReadings`), 银行's example is `我去银行。` and `Wǒ qù yínháng.` is a notes line; after, the example is `我[Wǒ]去[qù]银行[yín háng]。`.

## Gotchas

- The deck page names a row by its drawn characters, so 银行 with pinyin over it is the button **New 银 行 bank**.

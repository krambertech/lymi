# Chinese

A Chinese card's pinyin is drawn over its hanzi, one syllable per character, on the cue while the card is New or Learning and always after the reveal, the same rule as [japanese.md](japanese.md)'s furigana. A traditional tag such as `zh-TW` draws its hanzi in the traditional face. An example's inline pinyin fades over a character whose syllable one of the learner's Known cards reads the same.

## Reach

No persona has Chinese cards, so [`chinese.mjs`](chinese.mjs) adds to `learner` a 中文 deck holding 一点儿 sent as `yi4 dian3r`, a `zh-TW` 國語 deck holding 學習 read xuéxí, a 银行 deck whose 银行 is graded Easy yesterday so it is Known and not due, and a 行长 deck holding a New 行长 with the example `行长说不行[hángzhǎng shuō bù xíng]。`; the flow opens each from Library and presses its **Review**.

## Drive

[`chinese.yaml`](chinese.yaml): review 一点儿, check its label reads the pinyin and the meaning is not on screen, and tap low on the card to reveal it; end review, then review 學習 and reveal it; end review, then review 行长 and reveal it.

## End state

Before each reveal the card's label reads "Recognition card for 一点儿, read yì diǎnr" or "Recognition card for 學習, read xuéxí", the screenshot shows yì over 一 and diǎnr over 点儿, and the meaning is not on screen; after it, the grades and the meaning show with the pinyin still over the term. `05-example-pinyin-fades` shows zhǎng, shuō, bù and xíng over the example and nothing over its first 行, because the Known 银行 reads 行 háng. The check reads the cards back, 一点儿 with its tone numbers stored as yì diǎnr and 行长 with its example's pinyin.

## Gotchas

- Before the reveal the card is one button whose label says the term and its pinyin, so the flow matches the pinyin inside that label; VoiceOver reads the term's hanzi, not the pinyin drawn over it.
- A Known card would hide the pinyin until the reveal; both seeded cards are New, so this flow checks the New side only, and the web's component tests and [the web's Chinese feature](../../verify/features/chinese.md) check the Known side.

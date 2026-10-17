# Chinese

Chinese keeps its pinyin under a term cue while the card is New or Learning, and it waits for the reveal once the card is Known, the same rule as Japanese furigana. Every other language's reading waits for the reveal; [japanese.md](japanese.md) drives that side.

## Reach

No persona has Chinese cards, so [`chinese.mjs`](chinese.mjs) adds a 中文 deck holding 学习 read xuéxí to `learner` before the flow; the flow opens it from Library and presses its **Review**.

## Drive

[`chinese.yaml`](chinese.yaml): open the deck, press **Review**, check xuéxí is on the card and the meaning is not while it says **Tap to reveal**, then tap low on the card to reveal it.

## End state

Before the reveal the card's label holds xuéxí and not "to study"; after it, the grades and the meaning show. The check reads the stored card back with its pinyin.

## Gotchas

- The card is one accessibility element whose label joins its lines, so the flow matches text inside that label.
- A Known card would hide the pinyin until the reveal; the seeded card is New, so this flow checks the New side only, and the web's component tests check the Known side.

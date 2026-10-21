# Cantonese

A Cantonese card, tagged `yue` or `zh-yue`, draws its Jyutping over its characters, one syllable per character, on the cue while the card is New or Learning and always after the reveal, the same rule as [chinese.md](chinese.md)'s pinyin, in the traditional face. A character outside the Basic Multilingual Plane, such as 𨋢, takes one syllable. An example's inline Jyutping fades over a character whose syllable one of the learner's Known cards reads the same.

## Reach

No persona has Cantonese cards, so [`cantonese.mjs`](cantonese.mjs) adds to `learner` a 廣東話 deck (`yue`) holding 搭𨋢 sent as `daap³ lip¹`, a 銀行 deck (`zh-yue`) whose 銀行 is graded Easy yesterday so it is Known and not due, and a 行業 deck holding a New 行業 with the example `呢個行業好難行[ni1 go3 hong4 jip6 hou2 naan4 hang4]。`; the flow opens each from Library and presses its **Review**.

## Drive

[`cantonese.yaml`](cantonese.yaml): review 搭𨋢, check its label reads the Jyutping and the meaning is not on screen, and tap low on the card to reveal it; end review, then review 行業 and reveal it.

## End state

Before the reveal the card's label reads "Recognition card for 搭𨋢, read daap3 lip1", the screenshot shows daap3 over 搭 and lip1 over 𨋢, and the meaning is not on screen; after it, the grades and the meaning show with the Jyutping still over the term. `03-example-jyutping-fades` shows ni1, go3, jip6, hou2, naan4 and hang4 over the example and nothing over its 行 of 行業, because the Known 銀行 reads 行 hong4. The check reads the cards back, 搭𨋢 with its raised tone numbers stored as daap3 lip1 and 行業 with its example's Jyutping.

## Gotchas

- Before the reveal the card is one button whose label says the term and its Jyutping, so the flow matches the Jyutping inside that label; VoiceOver reads the characters, not the Jyutping drawn over them.
- The Simulator's dev client must be a 0.0.7 bundle or later; the Worker strips example Jyutping from older phones, so an older bundle shows the example plain.

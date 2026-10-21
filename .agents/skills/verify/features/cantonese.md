# Cantonese cards

What a card's language changes for Cantonese, tagged `yue` or `zh-yue`: review draws the Jyutping in `pronunciation` over the characters, one syllable per character, on the same rule as [Chinese](chinese.md); a character outside the Basic Multilingual Plane, such as 𨋢, takes one syllable; an example's inline Jyutping, `呢個行業好難行[ni1 go3 hong4 jip6 hou2 naan4 hang4]`, fades over a character whose syllable a Known card reads the same; the characters take the traditional face; raised tone numbers are stored as digits; and the duplicate rule keeps 行 hong4 and 行 hang4 apart.

## Reach

No persona has Cantonese cards, so the recipe makes decks as `fresh` through `/api/decks` and `/api/cards/batch`, grades a 銀行 Easy a day ago through `/api/review/grade` so it is Known and not due, and reviews each deck at `/review?deck=<id>`; the faded example is checked again on the card page, `/library/<deck>?card=<id>`.

## Drive

[`cantonese.mjs`](cantonese.mjs): add 行 read hong4, read `hang⁴`, and read `Hang4`; review a New 搭𨋢 in a `yue` deck; review a New 唔該 in a `zh-yue` deck and reveal it; with 銀行 Known, review a New 行業 whose example is 呢個行業好難行, reveal it, and open its card page.

## End state

行 hong4 and 行 hang4 are added and `Hang4` is skipped as hang4, which the second add stored with `normalized` `pronunciation`. On the 搭𨋢 cue the `rt`s read daap3 and lip1, lip1's ruby holds 𨋢, and the cue's `lang` is `yue` with a computed font naming PingFang TC. 唔該's cue reads m4 and goi1 in a `lang="zh-yue"` line in the same face, and the pinyin face is never used. After the 行業 reveal the visible `rt`s read hong4 and jip6 over the term, then ni1, go3, jip6, hou2, naan4 and hang4 in the example: the example's hong4 is attached but hidden because the Known 銀行 reads 行 hong4, while 難行's hang4 stays. The card page shows the same.

## Gotchas

- The `rt` is `aria-hidden`, so find Jyutping with a `rt` locator, never by role or accessible name, and leave out the hidden copy that sizes the card.
- The Known pairs come from deck card lists the app warms after it loads, so poll for the fade.
- PingFang is named first but drawn only where the system has it; the check reads the computed `font-family`, not the face drawn.

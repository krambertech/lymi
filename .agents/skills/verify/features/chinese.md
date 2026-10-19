# Chinese cards

What a card's language changes for Chinese: review draws the pinyin in `pronunciation` over the hanzi, one syllable per character, on the same rule as [furigana](furigana.md); the hanzi take the simplified or traditional face their tag names; pinyin sent with tone numbers is stored with tone marks; and the duplicate rule keeps two toned readings of one term apart.

## Reach

No persona has Chinese cards, so the recipe makes decks as `fresh` through `/api/decks` and `/api/cards/batch`, grades one card Easy forty days ago through `/api/review/grade` so it is Known and due, and reviews each deck at `/review?deck=<id>`.

## Drive

[`chinese.mjs`](chinese.mjs): add 行 read háng, read `xing2`, and read Xíng; review a New 一点儿 sent as `yi4 dian3r` and reveal it; review a New 學習 in a `zh-TW` deck; review a Known 东西 and reveal it.

## End state

行 háng and 行 xíng are added and Xíng is skipped as xíng, which the second add stored with `normalized` `pronunciation`. On the New 一点儿 cue the `rt`s read yì and diǎnr, diǎnr's ruby holds 点儿, the cue's `lang` is `zh` and its computed font names PingFang SC, and no line under it repeats the pinyin; after the reveal the meaning shows and the pinyin stays. 學習's cue reads xué and xí in a `lang="zh-TW"` line whose font names PingFang TC. On the Known 东西 no `rt` shows before the reveal, and dōng and xi show after it.

## Gotchas

- The `rt` is `aria-hidden`, so find pinyin with a `rt` locator, never by role or accessible name, and leave out the hidden copy that sizes the card.
- Each deck holds one card so the review opens on it; a deck with several New cards draws them in any order.
- PingFang is named first but drawn only where the system has it; the check reads the computed `font-family`, not the face drawn.

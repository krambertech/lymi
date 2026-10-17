# Furigana

A Japanese card's reading drawn over its kanji. The term's reading is its pronunciation, aligned at display; an example carries readings inline, `食[た]べ物[もの]`. In review the term shows furigana on the cue while the card is New or Learning, keeps the reading's room but hides it once Known, and always shows it after the reveal. An example's reading fades, keeping its room, over a word whose kanji and reading match one of the learner's Known cards in any deck; the card form's preview shows every reading. The card form calls the pronunciation **Reading** on a Japanese card.

## Reach

No persona has Japanese cards with readings, so the recipe makes two decks as `fresh` through `/api/decks` and `/api/cards/batch`: one asked by recognition only, and one card graded Easy forty days ago through `/api/review/grade` so it is Known and due. A third card, 好き, is graded Easy a day ago, Known and not due, so its す fades in the first deck's example, as does 学校's がっこう until the recipe grades 学校 Forgot in review. Review is `/review?deck=<id>`, the card page `/library/<deck>?card=<id>`.

## Drive

[`furigana.mjs`](furigana.mjs): review the New card's cue, reveal it; review the Known card's cue, reveal it; open the New card's page and its editor.

## End state

On the New card's cue the `rt` reading たべもの is visible; after the reveal the example's た and もの are visible and its す is attached but hidden, and the reading's only other line is `sr-only`, for a screen reader, which never hears the `aria-hidden` furigana. On the Known card's cue the `rt` is hidden and becomes visible after the reveal. Each term's accessible text is the term as written, without its reading. The card page shows 食べ物 with furigana and hides the example's す, while がっこう is back over 学校 because of the Forgot, with no refetch of 漢字's cards, and the editor labels the field **Reading** and shows one preview of the term and the example with their readings under the Reading and Source row.

## Gotchas

- The `rt` is `aria-hidden`, so find readings with a `rt` locator, never by role or accessible name.
- The Known pairs come from deck card lists the app warms about two seconds after it loads, so a fade can arrive a moment after the reveal; assert with a polling `expect`.
- The hidden copy that sizes the card holds the answer before the reveal, so filter for visible elements.

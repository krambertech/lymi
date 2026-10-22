# Right-to-left cards

A deck in a right-to-left language, such as Arabic, Hebrew, Persian or Urdu, keeps the English interface left to right while its own text runs right to left: the cue, the example and the term on the card take `dir` from the card's tag through `textDirection` in core, a Latin word or a number inside them stays in order, the meaning and notes take the direction of their first letter, every input turns right to left as Arabic is typed, and a toast that names the term draws it in `<bdi>` so the sentence around it never reorders. No Arabic record exists yet, so nothing draws harakat.

## Reach

No persona has Arabic cards, so the recipe makes an `ar` deck as `fresh` through `/api/decks` and adds كتاب PDF, meaning "book (as a PDF)", with the example قرأتُ كتاب Harry Potter مرتين, through `/api/cards/batch`; it searches the deck at `/library/<id>` and reviews it at `/review?deck=<id>`.

## Drive

[`right-to-left.mjs`](right-to-left.mjs): type كتاب into **Search this deck**; review the card and reveal it; open **Card options** and **Archive card**.

## End state

The search field matches `:dir(rtl)` once Arabic is in it and `:dir(ltr)` while empty. The cue is a `lang="ar"` `dir="rtl"` line whose computed `direction` is `rtl`, with كتاب drawn to the right of PDF. After the reveal the example reads from the right, قرأتُ first, Harry Potter as one left-to-right run, مرتين last, and the meaning's computed `direction` is `ltr`. The archive toast's title holds a `<bdi>` reading كتاب PDF, drawn after "Archived" with كتاب to the right of PDF. The stored card is archived.

## Gotchas

- Read order from bounding boxes, never from the DOM or the accessible name: both hold the logical order whatever is drawn.
- WebKit ignores U+2068 and U+2069 in text, so the web turns isolated runs into `<bdi>` in toasts, dialog titles and every `<Trans>`; a `t` string set straight into other markup still carries only the characters and isolates in Chromium alone.

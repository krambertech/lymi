# Right to left

A deck in a right-to-left language, such as Arabic, keeps the English app left to right while its own text runs right to left. The term and example take iOS's `writingDirection` from the card's tag through `textDirection` in core, a block of them, the cue and the example, aligns to the right, a Latin word inside one stays in order, and a toast that names the term isolates it so the sentence around it never reorders. No Arabic record exists yet, so nothing draws harakat.

## Reach

No persona has Arabic cards, so [`right-to-left.mjs`](right-to-left.mjs) adds to `learner` an `ar` deck, عربي, holding كتاب PDF with the meaning "book (as a PDF)" and the example قرأتُ كتاب Harry Potter مرتين; the flow opens it by link.

## Drive

[`right-to-left.yaml`](right-to-left.yaml): open the deck, press **Review**, tap low on the card to reveal it, end review, then hold the card's row and choose **Archive card**.

## End state

`01-deck` shows the row's term drawn PDF to the left of كتاب. `02-cue` shows the cue on the right of the card with PDF to the left of كتاب, and the card's label reads "Recognition card for كتاب PDF. Tap to reveal". `03-revealed` shows the meaning on the left and the example on the right, read from the right: قرأتُ, كتاب, Harry Potter in its own order, مرتين. `04-archived-toast` reads Archived “كتاب PDF” with the quotes around the whole term. The check reads the card back archived, its term and example stored without isolates.

## Gotchas

- The isolates are invisible in the label, so every match on learner text inside interface text has `.?` on each side.
- iOS draws order from the tag only on iOS: Android ignores `writingDirection`, which the alignment does not depend on.

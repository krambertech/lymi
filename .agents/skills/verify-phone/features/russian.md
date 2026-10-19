# Russian

A Russian card whose pronunciation is its term with U+0301 over the stressed vowel draws that marked form in place of the term: on the cue while the card is New or Learning and always after the reveal, the same rule as [chinese.md](chinese.md)'s pinyin. The card page calls the field Stress.

## Reach

No persona has Russian cards, so [`russian.mjs`](russian.mjs) adds to `learner` a Русский deck holding замок stressed замóк, typed with a Latin ó; the flow opens it from Library and presses its **Review**.

## Drive

[`russian.yaml`](russian.yaml): look at the deck's row, review замок, check its label reads the stress and the meaning is not on screen, tap low on the card to reveal it, end review, and open the card from the deck.

## End state

The deck's row and the cue draw замо́к with the acute over о; the card's label reads "Recognition card for замок, read замо́к"; after the reveal the grades and the meaning show with the stress still on the term; the card page names its field Stress. The check reads the card back with its Latin ó stored as о and U+0301.

## Gotchas

- Before the reveal the card is one button whose label says the term and its stress, so the flow matches the stress inside that label.
- A Known card would draw the plain term until the reveal; the seeded card is New, so this flow checks the New side only, and the web's component tests and [the web's Russian feature](../../verify/features/russian.md) check the Known side.

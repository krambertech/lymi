# Adaptive pronunciation

The deck switch, each learner's own, that decides whether review's cue draws the term's pronunciation. On, the default, the cue draws it until the card is Known; off, the answer shows it as its own line and the term is plain. It is the last of the deck's rows in deck settings and in About this deck, for a deck whose language draws pronunciation on the term.

## Reach

`env()` makes a Chinese deck with one New card, 学习 xuéxí, through `/api/decks` and `/api/cards/batch`. The flow reviews it from the deck page and opens deck settings from the deck page's **Deck options**.

## Drive

[`adaptive-pronunciation.yaml`](adaptive-pronunciation.yaml): review the cue, end the review, turn the switch off, review the same cue again and reveal it.

## End state

The first cue's label says the term is read xuéxí. After the switch, its line says pinyin shows on its own line, the cue's label is the term alone, the revealed card shows xuéxí as a line of its own, and `check()` reads `pronunciationDisplay: "separate"` on the deck.

## Gotchas

- VoiceOver hears the pinyin only through the cue's label, so the flow asserts the label; the screenshots show the drawing.
- The row's text and its switch share the label **Adaptive pronunciation**, so the flow taps the one that is `checked`.

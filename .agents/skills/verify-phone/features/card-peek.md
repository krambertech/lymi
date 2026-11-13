# Card peek

A long press on a card's row lifts its revealed side above iOS's menu, in a height counted from what the card holds because iOS needs it before the peek is drawn. The word takes up to two lines, the meaning three and the example two, and the text must fit the peek at every text size up to the 420 pt cap ([phone.md](../../../../docs/design/system/phone.md#menus)).

## Reach

Hold a card's row on a deck's page or in search.

## Drive

[`card-peek.yaml`](card-peek.yaml), as `learner`: the setup gives a card in Lezione 12 a long meaning, an example and its translation. Set the text size first, hold the card on its deck's page and read the peek in `01-peek`.

```bash
xcrun simctl ui <udid> content_size accessibility-medium
```

## End state

[`card-peek.mjs`](card-peek.mjs) reads the card, which the peek leaves as it was. The picture is the proof: the translation's line stands clear of the peek's bottom edge.

## Gotchas

- The runner does not set the text size, so set it before the run and put it back with `content_size large` after.
- A card that counts past 420 pt ends at the peek's edge by design, so a sizes test needs a card that stays under the cap.

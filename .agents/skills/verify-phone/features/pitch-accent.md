# Pitch accent

A Japanese Reading's accent, `としょかん [2]`, drawn as a chart under the term after the reveal and on the card page.

## Reach

[`pitch-accent.mjs`](pitch-accent.mjs) adds the deck ピッチ to `learner`, holding two New cards: 図書館 read `としょかん [2]` and 考える read `かんがえる [4][3]`.

## Drive

[`pitch-accent.yaml`](pitch-accent.yaml): review the deck, reveal both cards, end review and open 図書館.

## End state

`01-cue` shows the term with no chart. `02-revealed` and `03-revealed-second` show the chart under the term, with one chart on each card, including 考える, whose Reading holds two accents. `04-card-page` shows the chart in place of the Reading's text. No screen shows `[2]`.

## Gotchas

- The chart is one accessibility image whose label says the kana and the accent, so the flow finds it by `pitch falls after sound`.

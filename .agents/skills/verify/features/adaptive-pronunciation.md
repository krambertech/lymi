# Adaptive pronunciation

A deck switch, each learner's own, for a language whose pronunciation Lymi draws on the term: Japanese, Chinese, Cantonese, Tamil, Russian and Ukrainian. On, the default, review's cue draws it until the card is Known. Off, the cue never draws it and the answer always does. It closes the Deck group of deck settings, and of About this deck for a member.

## Reach

The recipe signs in as `fresh` and makes a Chinese deck with one New card, 学习 xuéxí, through `/api/decks` and `/api/cards/batch`, then a Spanish deck. Deck settings are `/library/<deck>/settings`; review is `/review?deck=<id>`.

## Drive

[`adaptive-pronunciation.mjs`](adaptive-pronunciation.mjs): review the New card's cue, turn the switch off in deck settings, review the cue again and reveal it, then open the Spanish deck's settings.

## End state

With the switch on, the cue shows the `rt` syllables xué and xí. After it is turned off, `GET /api/decks/<id>` reports `frontPronunciation: "hidden"`, the line under the switch says pinyin shows only with the answer, the cue shows no `rt`, and the reveal shows both syllables. The Spanish deck's settings have no **Adaptive pronunciation** switch.

## Gotchas

- The `rt` is `aria-hidden`, so find readings with a `rt` locator, never by role or accessible name.
- The hidden copy that sizes the card holds the answer before the reveal, so filter for visible elements.

# Example translation

A card's example in the meaning language, kept beside the example. Review shows it after the answer, on its own line under the example; the card page shows it there too, and the card form edits it in a Translation field under Example. A translation written for an earlier example is kept and marked, and review leaves it out. ADR 0038.

## Reach

A deck's card, its **Edit card** button, or review after **Reveal the card**. The `long` persona's **der Hund** has an example and a translation the learner wrote.

## Drive

[`example-translation.mjs`](example-translation.mjs), as `long` from Library: type an example and its translation one key at a time in **Add a card**; open **Lange Karten**, then **der Hund**; change its example in **Edit card** and save; edit the **Translation** and save; then type an example over 250 characters and save.

## End state

Typing keeps the caret in the Example and then the Translation, with every character kept. The card page reads `Der Hund schläft.` with `The dog is sleeping.` on the line under it, as `/api/cards/<id>` stores. While the new example is typed the form says **Translated from an earlier example.** under the translation. After the new example the translation is unchanged, the page says **Translated from an earlier example. Edit it to match.**, and the card reads `exampleTranslationStale: true` with source `manual`. A rewritten translation shows under the example, the stale line goes, and `exampleTranslationStale` is false. An example over 250 characters is refused with **Keep the example under 250 characters.** and the stored example is unchanged.

## Gotchas

- Without an AI key the local server writes no translation, so the AI's path is the services' tests; the dev palette's sample enrichment writes an Italian example with one.
- The translation counts 250 characters as typed; the example counts what is shown, so inline readings and stress marks take no room.

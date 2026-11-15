# Yomitan

Yomitan, a pop-up dictionary extension, adds cards through Lymi's AnkiConnect address with a write key. Its page, on the app page template, hands over both. The real extension is not driven here: the recipe sends the calls Yomitan 26.10 sends, from the page, as an extension would.

## Reach

Settings, the **Yomitan** row, which opens `/settings/yomitan`.

## Drive

[`yomitan.mjs`](yomitan.mjs), as `japanese` from Settings: open **Yomitan**, read the **AnkiConnect server address**, press **Make a key for Yomitan** and read the key from its panel. Then post Yomitan's calls to that address: `version`, `deckNames`, `modelFieldNames` for **Lymi card**, `canAddNotesWithErrorDetail` and `addNote` for 散歩 into 日本語 N5–N4 with a JMdict-shaped glossary, then the duplicate check again, and `addNote` for `trattoria` into the same deck.

## End state

The address ends in `/api/anki-connect` and the key starts `lymi_`. `version` answers the bare `6`, the deck list holds 日本語 N5–N4, and the fields are Term, Reading, Meaning, Sentence, URL and Audio. `/api/cards?term=散歩` returns one card with the reading さんぽ, the meaning `walk; stroll`, the sentence as its example and the page as its source. The second duplicate check answers `cannot create note because it is a duplicate`, and `trattoria` is refused as not Japanese and is not a card. **Activity** lists the add under **Yomitan**. On reload the page says **Connected**, its own Activity shows "Added 1 card to 日本語 N5–N4" with **Everything Yomitan did, in Activity**, and back in Settings the Yomitan row says when its key was used.

## Gotchas

- A reseed keeps API keys, so after an earlier run the page is already connected and **Replace the key** sits under Settings; it revokes the earlier key.
- The key is shown once; read it from the panel's **API key for Yomitan** output before pressing **Done**.
- Yomitan sends `version: 2`, so replies are bare values, not `{ result, error }`.
- Locally, Vite answers a cross-origin preflight itself; the recipe posts from the product's own page, which needs none.

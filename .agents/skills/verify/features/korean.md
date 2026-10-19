# Korean cards

Korean is a configured language: its enrichment writes the pronunciation as the term is said, in Hangul and only where that differs from the spelling, and gives a Sino-Korean word's roots in its notes. `GET /api/languages` gives the same format to any client.

## Reach

No persona has Korean cards, so the recipe makes a deck as `fresh` through `/api/decks`, adds cards through `/api/cards/batch` with `enrich: true`, and reviews the deck at `/review?deck=<id>`.

## Drive

[`korean.mjs`](korean.mjs): read `/api/languages`; make two Korean decks and add 학교 to one and 사랑 to the other with `enrich: true`; wait for both to settle; review 학교's deck and press **Reveal the card**.

## End state

`/api/languages` lists `ko` with label `pronunciation` and sample 학교 → 학꾜. The enriched 학교 has `pronunciation` 학꾜 with `pronunciationSource` `ai` and notes naming 學, and 사랑, said as written, has no pronunciation. Neither card's notes romanize the term. After the reveal of 학교 the line 학꾜 shows.

## Gotchas

- Enrichment calls the real model: `apps/web/.dev.vars` needs `OPENAI_API_KEY` and `AI_GATEWAY_TOKEN`, and a run without them leaves both cards `failed`.
- The model's notes vary; check for the root's hanja, not for the wording.
- The hidden copy that sizes the card holds the answer before the reveal, so check visible text.

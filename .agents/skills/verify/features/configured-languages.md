# Configured languages

Filipino, Vietnamese, Georgian, Armenian, Tamil and Lithuanian are configured languages with their own pronunciation formats, and Estonian, Finnish, Latvian, Norwegian, Danish and Dutch are configured without one. Enrichment fills a new deck's cards unasked only in a language whose evaluation passes the bar, which every shipped row does; `packages/core/src/enrichment.test.ts` covers a row below it. Georgian, Armenian and Tamil terms draw in their script's face. [The proposal](../../../../docs/proposals/long-tail-languages.md) has the gate.

## Reach

No persona has cards in these languages, so the recipe makes decks as `fresh` through `/api/decks`, adds cards through `/api/cards/batch` with `enrich: true`, and reviews at `/review?deck=<id>`.

## Drive

[`configured-languages.mjs`](configured-languages.mjs): read `/api/languages`; make a Tagalog deck and a Georgian deck; add bahay and წყალი with `enrich: true` and wait; make a Lithuanian and a Norwegian deck, add vyras with `enrich: true`, review it and reveal it; review წყალი's deck and press **Reveal the card**.

## End state

`/api/languages` lists `fil` once, with no `tl` entry, and `vi`, `ka`, `hy`, `ta` and `lt`, but not `et` or `nb`, which have no format of their own. The Tagalog deck's `enrichFields` are all four fields and the Georgian deck's are meaning, example and pronunciation. bahay has a meaning and a pronunciation with a stress mark, both `ai`. წყალი has `pronunciation` ts'q'ali from `ai`. vyras has a `pronunciation` from `ai` with an accent mark on its y, such as výras, and its reveal shows that exact text; the Norwegian deck starts with meaning, example and notes. After the reveal of წყალი the line ts'q'ali shows, and the term's font family names `Helvetica Neue` from `--face-geor`.

## Gotchas

- Enrichment calls the real model: `apps/web/.dev.vars` needs `OPENAI_API_KEY` and `AI_GATEWAY_TOKEN`, and a run without them leaves the cards `failed`.
- Which vowel the model marks in bahay, and which accent it puts on vyras, varies; check that a mark is there and survives, not which one.
- The hidden copy that sizes the card holds the answer before the reveal, so check visible text.

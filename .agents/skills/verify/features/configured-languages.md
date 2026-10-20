# Configured languages

Filipino, Vietnamese, Georgian, Armenian and Tamil are configured languages, each with its own pronunciation format. Enrichment fills a new deck's cards unasked only in a language whose evaluation passes the bar; Filipino is below it, so a Tagalog deck starts with no AI fields, and the AI fills its cards once the owner turns fields on. Georgian, Armenian and Tamil terms draw in their script's face. [The proposal](../../../../docs/proposals/long-tail-languages.md) has the gate.

## Reach

No persona has cards in these languages, so the recipe makes decks as `fresh` through `/api/decks`, adds cards through `/api/cards/batch` with `enrich: true`, turns AI fields on at `/library/<id>/settings`, asks for enrichment with `POST /api/cards/<id>/enrich`, and reviews at `/review?deck=<id>`.

## Drive

[`configured-languages.mjs`](configured-languages.mjs): read `/api/languages`; make a Tagalog deck and a Georgian deck; add bahay and წყალი with `enrich: true` and wait; in the Tagalog deck's settings tick **Meaning** and **Pronunciation**; ask Enrich on bahay and wait; review წყალი's deck and press **Reveal the card**.

## End state

`/api/languages` lists `fil` once, with no `tl` entry, and `vi`, `ka`, `hy` and `ta`. The Tagalog deck's `enrichFields` is empty and the Georgian deck's is meaning, example and pronunciation. bahay gains nothing on add; once the fields are on and Enrich is asked, it has a meaning and a pronunciation with a stress mark, both `ai`. წყალი has `pronunciation` ts'q'ali from `ai`. After the reveal the line ts'q'ali shows, and the term's font family names `Helvetica Neue` from `--face-geor`.

## Gotchas

- Enrichment calls the real model: `apps/web/.dev.vars` needs `OPENAI_API_KEY` and `AI_GATEWAY_TOKEN`, and a run without them leaves the cards `failed`.
- Which vowel the model marks in bahay varies, which is why Filipino is below the bar; check that a mark is there, not which one.
- The hidden copy that sizes the card holds the answer before the reveal, so check visible text.

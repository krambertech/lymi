---
status: accepted
date: 2026-10-23
---

# Example translations have their own field

A card's example stays one sentence in the language being learned, and its translation into the meaning language is a field of its own, `exampleTranslation`, with its own field source. The example and its translation are each at most 250 characters as a reader sees them: inline readings and stress marks do not count.

Where the deck allows it, the AI translates every example, whoever wrote it, reading the term and meaning for the sense. It translates during an add that enriches, Enrich on one card, and an edit that changes the example; opening or reviewing a card never asks it.

In every mode, review shows the translation after the answer, directly after the example in muted text and parentheses; an example that reads in the other direction puts it on its own line. A Lymi file keeps the mark that a translation is stale, so an export and import does not make it current. [Issue #943](https://github.com/krambertech/lymi/issues/943).

## Context

Learners wrote translations into the example in brackets or into the notes, and Anki imports put a sentence's translation in the notes. The AI could not add one without rewriting the learner's sentence, and nothing knew a translation had gone wrong when its sentence changed. An edition needs its own translation, which a translation inside the example would make impossible without a copy of the example.

## Considered options

- **A translation in parentheses inside the example:** rejected. Combining them loses separate field sources and complicates refresh on edit, editions, text direction and speech.
- **The enrichment prompt writes the translation with the example:** rejected. A translation has to read the saved example, often the learner's own, and changing that prompt reopens every language's evaluation for a field it does not otherwise need.
- **A translation shown only on request:** rejected for now. It costs a tap on every card; the translation is past the answer, so showing it gives nothing away.
- **Its own deck setting, beside the example's:** accepted. A deck with AI examples off still has learners who write examples. It starts on wherever the deck's default fills examples, and on for a deck whose owner already chose examples.

## Consequences

- `cards.example_translation`, its source, `example_translation_of` and `example_translation_status`. The fingerprint is of the example as shown, so readings added to the same sentence keep the translation current. Empty is a deliberate clear that the AI leaves alone, as for every field, and Enrich reopens it.
- A changed example drops the AI's translation and queues one run from any channel, since that is upkeep of the AI's own text. A person's translation stays and is marked stale, and review leaves it out until it is rewritten. A first translation after an edit is asked only from the app, as ADR 0002 keeps API and MCP edits from enriching.
- Each run reads the example when it starts and writes only while the card still holds it with no translation, so an edit made meanwhile wins and out-of-order runs never land an older sentence's translation. A run that gives up leaves the card at `failed` and the card stays usable.
- The prompt lives in `apps/web/src/server/enrichment/translation.ts`, and `TRANSLATION_PROMPT_VERSION` rises with any change to what it reads. It runs as a step of the enrichment workflow after each wave of fills, with its own `$ai_generation` span.
- The translation is not text an edition translates from, so changing it leaves editions current; changing the example still makes them stale. `card_localizations.example_translation` holds each edition's own, reaching a reader only while it is approved and current, never falling back to the original's.
- An AI translation the owner rewrites is a correction counted in `ai_text_corrected`, kept out of the deck's style. `example_translated` records each call's outcome.
- A phone release before 0.0.9 has no name for the deck setting, so its responses leave it out and its saves keep the deck's choice.

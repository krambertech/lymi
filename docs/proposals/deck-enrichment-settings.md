# Deck enrichment settings

Status: accepted. [ADR 0033](../adr/0033-a-deck-decides-what-enrichment-fills.md) holds the decision; asking a deck's purpose is [issue #567](https://github.com/krambertech/lymi/issues/567).

## Problem

Every card added in the app gets meaning, example, pronunciation and language filled by AI, and the meaning reads as a one-sentence definition. Learners clear fields by hand on most cards, and a gloss such as "знать" arrives as "знать ответ или факт". Nothing tells the AI what a deck is about or how its cards are written.

## Learner-facing behavior

Deck settings gain an owner-only **AI enrichment** group: checkboxes for Meaning, Example, Notes and Pronunciation, with Meaning and Example on by default, and an optional **Instructions for AI** box of up to 1000 characters that says what the deck is about and how to write its cards. Members never see the instructions.

Checking a field allows the AI to fill it when relevant. For each card it decides which of them are worth filling, following the deck's own pattern: a deck that keeps examples inside its notes gets no separate example, and a card with nothing worth noting gets no notes. The language is always filled, because audio needs it. This covers the learner's adds in the app and integration adds sent with `enrich: true`.

Enrich on one card still fills every empty field, because it is an explicit ask.

While a run is outstanding, only the fields it may fill shimmer, and a field the AI chose to skip settles empty.

## Purpose and language presets

The language presets shipped with ADR 0033. Asking the purpose is [issue #567](https://github.com/krambertech/lymi/issues/567).

Creating a deck asks what it is for: a language, with the language picked, a subject or exam, or something else. It is stored as the deck's purpose. An existing deck with a language counts as a language deck and any other as something else; Welcome's answer seeds the first deck. The purpose and language choose the deck's starting fields until the owner changes them:

- Language: meaning and example. Notes too for a language whose cards list forms (Estonian, Finnish, German). Pronunciation too where the spelling does not show it (Chinese, Japanese, Korean, Russian, Ukrainian).
- Subject or exam: meaning, written as a short explanation.
- Something else: meaning.

The prompt also carries conventions for the deck's language, such as Estonian words in three forms or Russian stress marks in place of IPA. The table lives beside the prompt in `apps/web/src/server/services/enrichment-prompt.ts`, starts with twelve languages, and is advice the deck's samples and instructions override.

## Format

- Meaning: the gloss a bilingual dictionary gives first, one to four words, not a definition. A second sense follows a semicolon only when the term really has two, never more than three. A sentence gets its natural translation. A term in the meaning language itself, or a concept, gets the shortest accurate explanation. A term listing forms separated by ` · ` is one word.
- Example: one everyday sentence under twelve words in the term's language.
- Notes: only what helps recall and use: irregular forms, grammar needed to understand a sentence, a word it is easily confused with. In the notes Markdown subset, a few short lines, shaped like the deck's own notes. Empty when there is nothing of that kind.
- Pronunciation: IPA with stress, without slashes, for Latin, Cyrillic and Greek scripts; the usual reading aid otherwise.

Without samples from the deck, the defaults decide relevance: a meaning always, an example for a word or short phrase but not for a full sentence, and notes only when one of the cases above applies.

## Deck context

Each model call receives the deck's name, description, language and instructions, and up to five recent cards from the same deck whose text the learner or a lesson wrote, as samples. A sample shows every enrichable field, empty ones marked empty, so the model sees which fields the deck fills as well as their form. Notes in a sample are cut to a bounded length. Precedence is instructions, then samples, then the default rules. Instructions never change the response format or the language a meaning is written in. This needs no extra model call and stores nothing that can go stale.

## Data and API

- `decks.purpose`: `language`, `subject` or `other`, null inferred from the language.
- `decks.enrich_fields`: JSON list, null follows the preset for the deck's purpose and language, so a better default reaches decks whose owner never chose.
- `decks.enrich_instructions`: text, owner-only.
- `cards.notes_source`: notes join the per-field sources, so AI notes carry the AI badge and an edit makes them the learner's. Filling notes raises the card's revision, because notes are an edition field.
- `cards.enrichment_fields`: the fields the outstanding run may fill, so screens shimmer only those.
- `DeckInput`, `DeckOut`, `DeckSummaryOut`, and MCP `create_deck` and `update_deck` carry `enrichFields` and `enrichInstructions`; a member reads null instructions. `CardOut` carries `notesSource` and `enrichmentFields`.

## Instrumentation

- `deck_enrichment_changed` (worker): `meaning`, `example`, `notes`, `pronunciation`, `has_instructions`, on a saved change only. Answers whether learners change the fields or write instructions.
- `enrichment_finished` gains optional `trigger` (`add` or `card`), `has_instructions`, `samples`, and `skipped`, the allowed fields the AI chose not to fill. Answers whether deck context changes which fields are filled.

## Delivery

- Deck settings gain an owner-only AI group: the fields the AI may fill, and instructions for AI.
- Enrichment follows the deck on every add and on Enrich, fills notes with their own source, and reads the deck's guide, instructions and own cards.
- The prompt, language guides and an evaluation live in `apps/web/src/server/enrichment`.

## Later

The AI-maintained deck profile shipped as a deck's learned style: [ADR 0037](../adr/0037-a-deck-learns-its-style-from-the-owners-cards.md).

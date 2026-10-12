---
status: accepted
date: 2026-10-11
---

# A deck decides what enrichment fills

Each deck lists the fields the AI may fill: meaning, example, notes and pronunciation. The language is always filled, because audio needs it. A deck whose owner never chose follows a default set by its language: meaning alone without a language, meaning and example for most languages, notes too where words are learned with their forms (Estonian, Finnish, German, Dutch, Swedish), and pronunciation too where spelling does not show how a word is said or stressed (Chinese, Japanese, Korean, Russian, Ukrainian). The list is what the AI may fill, not what it must: it fills a field only when it suits the card and the deck's own cards fill it too. Adds in the app, adds sent with `enrich: true`, and Enrich on one card all follow the same list. This refines [ADR 0002](0002-mcp-client-extracts-server-enriches.md), which still holds: enrichment fills only empty fields and never overwrites text.

The owner may also give the deck instructions to the AI, up to 1000 characters. Only the owner sees them.

## Context

Every add filled meaning, example, pronunciation and language, and the meaning read as a one-sentence definition. Learners cleared fields by hand on most cards, and nothing told the AI what a deck was about or how its cards were written.

## Considered options

- **One list for the whole account:** rejected. Decks differ: an Estonian deck wants word forms in notes, a biology deck wants a short explanation and nothing else.
- **Fill every allowed field:** rejected. The deck's own cards show which fields it fills, and a field the learner deletes costs more than one never written.
- **Enrich on one card fills every empty field:** rejected. Enrich follows the same rules as an add, so it never fills a field the deck has turned off.
- **A stored deck profile, kept up to date by a model:** deferred. Showing the model up to five of the deck's own cards on every call gives the same signal with no extra call and nothing to go stale. Asking a deck's purpose when it is created is [issue #567](https://github.com/krambertech/lymi/issues/567).

## Consequences

- `decks.enrich_fields` is null until the owner chooses, so a better default reaches every deck nobody changed. `decks.enrich_instructions` is the owner's alone and reads as null for a member.
- Notes join the field sources. `cards.notes_source` lets AI notes carry the AI badge, and an edit makes them the learner's.
- `cards.enrichment_fields` records what an outstanding run may fill, so a screen holds space only for those fields and a field the AI skips settles empty.
- Each model call carries the deck's name, description, language, a short guide for that language, the owner's instructions, and up to five recent cards whose meaning a person wrote. Text the AI wrote is never shown to it as an example. Order of precedence: instructions, then the deck's cards, then the language guide, then the prompt's defaults. Instructions cannot change which fields are filled, the reply's shape, or the language meanings are written in.
- The prompt and the language guides live in `apps/web/src/server/enrichment`. `ENRICHMENT_PROMPT_VERSION` rises with any change to what the model reads; a test fails until it does. `pnpm --filter @lymi/web eval:enrichment` scores the prompt against invented cards, and real cards stay outside the repository.
- `deck_enrichment_changed` records a changed choice as flags. `enrichment_finished` adds the trigger, whether instructions were used, how many sample cards were sent, how many allowed fields the AI chose to skip, and the prompt version. Neither carries text.

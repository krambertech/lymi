---
name: tend-cards
description: Change, improve or tidy Lymi cards. Use when the learner asks to fix a card, write an example or a memory hook, fill empty fields, deal with a card they keep forgetting, move, archive or restore cards.
---

# Tend cards

## Find the intended cards

Use `get_card` for a known id, or `search_cards` by term with the learner's deck and language when known. Search with `archived: true` for a restore; ordinary search finds active cards. If several cards could match, ask which one before writing. For a change to every matching card, follow `nextCursor` until it is null; a short or empty page does not prove the search is finished.

Choose the operation that matches the request:

```
What does the learner want?
├── Change text on a card → update_card with only the fields that change
├── Change many cards → one update_cards call, up to 200
├── An example → write it in the card's language, short and natural, using the term as the card has it
├── A memory hook → see "Hooks" below
├── Lymi's AI to fill empty fields → enrich_card
├── A card they keep forgetting → see "Often forgotten" below
├── Move cards into a section → move_cards_to_section
├── Archive cards → archive_card or archive_cards
└── Restore archived cards → restore_card or restore_cards
```

Carry out an explicit edit, archive or restore request without asking for the same approval again. If they ask for ideas, show proposed wording and wait before saving. Keep writes within that request: improving an example does not authorise replacing the meaning or changing review modes.

Text you write for the learner is theirs: leave its source out. Set a source of `"lesson"` only for text taken from their lesson. Write examples in the card's language, and meanings and hooks in its meaning language; use `get_settings` for the learner's `meaningLanguage` when it is not already known. A member cannot edit the owner's shared cards: explain an ownership refusal and direct them to the owner.

## Hooks

A hook is a short association in the meaning language that leads back to the term: a sound-alike word, or a picture in the mind. It gives away none of the answer: no first letters, translation or part of the term. Review can show it under the cue before reveal, so it should help recall without answering for the learner.

## Often forgotten

`search_cards` with `filter: { reviews: { slipping: { eq: true } } }` finds cards the learner keeps forgetting. Inspect the card before deciding what might help: a hook, a clearer meaning, or separating distinct senses into cards. If splitting a card, explain which existing text will change and which cards will be added before saving the agreed change.

## Confirm the outcome

Read the returned result before reporting success. Bulk edits, archives and restores can partly succeed: identify what changed and what failed. Retry only failed items whose error permits a retry, such as `unavailable`; resolve missing cards, permissions or conflicts first. If a result is uncertain, fetch the affected cards before deciding what to send again.

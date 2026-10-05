---
name: tend-cards
description: Change, improve or tidy Lymi cards. Use when the learner asks to fix a card, write an example or a memory hook, fill empty fields, deal with a card they keep forgetting, move, archive or restore cards.
---

# Tend cards

Find the card first: `search_cards` by term, or `get_card` by id. Then pick the branch:

```
What does the learner want?
├── Change text on a card → update_card with only the fields that change
├── Change many cards → one update_cards call, up to 200
├── An example → write it in the card's language, short and natural, using the term as the card has it
├── A memory hook → see "Hooks" below
├── Lymi's AI to fill empty fields → enrich_card
├── A card they keep forgetting → see "Often forgotten" below
├── Move cards into a section → move_cards_to_section
└── Remove cards → archive_card or archive_cards; restore_card or restore_cards undoes it
```

Text you write for the learner is theirs: leave its source out. Set a source of `"lesson"` only for text taken from their lesson. Show the new text before saving when the learner did not dictate it, and save on their yes.

## Hooks

A hook is a short association in the meaning language that leads back to the term: a sound-alike word, or a picture in the mind. It never gives away any of the answer: no first letters, no translation, no part of the term. Review shows it under the cue, so it has to work before the reveal. Offer one hook, and a second only if the learner asks.

## Often forgotten

`get_card` carries a `diagnosis` once Lymi has judged why the card keeps being forgotten.

- With a named cause and a drafted fix: tell the learner the cause in one sentence and show the fix. Apply it with `accept_card_fix` only on their yes. `undo_card_fix` takes it back.
- The learner says the cause is wrong: `dismiss_card_diagnosis`. `undo_dismiss_card_diagnosis` takes that back.
- `unclear`, or no diagnosis yet: offer a hook, a clearer meaning, or splitting the card in two with `add_cards` and `update_card`.

A member of a shared deck cannot change the owner's cards. Say so when a write is refused for that reason, and suggest they ask the deck's owner.

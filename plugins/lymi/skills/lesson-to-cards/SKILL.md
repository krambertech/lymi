---
name: lesson-to-cards
description: Turn lesson material into Lymi cards. Use when the learner shares a lesson, transcript, class notes, a worksheet photo or any text and wants to keep its words and phrases.
---

# Lesson to cards

The learner wants to remember what the lesson taught without spending the evening making cards. You do the extraction; Lymi stores, enriches on request, and schedules review.

## Read the request and material

A request to add cards authorises saving them; a request to inspect what is worth keeping calls for a preview without writes. Resolve unclear text in a photo or transcript with the learner, or leave it out and say so: uncertain extraction should not become a confidently saved term.

Call `list_decks` for the destination and `meaningLanguage`. Honour the learner's named deck; a matching language helps choose a destination but does not override their choice. Ask when the destination is ambiguous. If the deck has lesson sections, use `list_sections` to find the one this lesson belongs to. Plan any new deck or section here, and create it only when saving is authorised.

## Extract the cards

Use the material's teaching intent:

```
Did the lesson teach it?
├── A new word, set phrase, collocation or idiom → a card
├── A form the lesson drills (principal parts, plural, gender, case) → on the term's card, in notes, as the lesson writes it
├── A whole sentence → a card only when the sentence itself is the thing taught
└── Instructions, names, filler, words the lesson only used in passing → leave out
```

One card per term. Keep the lesson's own spelling, form and wording.

Preserve the source when writing fields:

- `term` as the lesson has it.
- `meaning` in the meaning language. Set `meaningSource: "lesson"` only when the material gives that meaning; a meaning you composed has no source.
- `example` from the lesson, with `exampleSource: "lesson"`, when the lesson uses the term in a sentence.
- `source` names the lesson, such as "Lesson 12, 1 Oct".
- Leave any other field out rather than guess. Set `enrich: true` only when the learner asks Lymi to fill the gaps.

Set `notesSource: "lesson"` for grammar notes taken from the material. Composed or translated wording is not a verbatim lesson field: leave its source out, so provenance stays honest.

## Save and report

When saving is authorised, create any agreed destination with `create_deck` or `create_section`, then use its returned id. Send cards together with `add_cards`, up to 200 per call. If no usable terms were found, explain what is missing instead of creating an empty destination or sending an empty batch.

Report the confirmed added and skipped counts, where skipped terms already live, and any unresolved material or batch that did not save. If a later batch fails, earlier successful batches still count; do not describe the whole lesson as saved. When the host already shows the cards, summarise the outcome without repeating the list.

Review and grading happen only in Lymi. Offer that next step when it helps the learner continue.

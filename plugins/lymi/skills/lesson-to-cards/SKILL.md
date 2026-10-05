---
name: lesson-to-cards
description: Turn lesson material into Lymi cards. Use when the learner shares a lesson, transcript, class notes, a worksheet photo or any text and wants to keep its words and phrases.
---

# Lesson to cards

The learner wants to remember what the lesson taught without spending the evening making cards. You do the extraction; Lymi stores, enriches on request, and schedules review.

1. **Find the deck.** Call `list_decks`. Use the deck whose `defaultLanguage` matches the lesson's language. When two decks match, or none does, ask which deck, and offer `create_deck` for a new language. Note `meaningLanguage`: every meaning you write is in it.
2. **Find the section.** When the deck has sections (`list_sections`) and they follow lessons, put the cards in this lesson's section, creating it with `create_section` when the learner owns the deck. Otherwise leave `sectionId` out.
3. **Pick the terms.** Walk the material with this test:

   ```
   Did the lesson teach it?
   ├── A new word, set phrase, collocation or idiom → a card
   ├── A form the lesson drills (principal parts, plural, gender, case) → on the term's card, in notes, as the lesson writes it
   ├── A whole sentence → a card only when the sentence itself is the thing taught
   └── Instructions, names, filler, words the lesson only used in passing → leave out
   ```

   One card per term. Keep the lesson's own spelling, form and wording.
4. **Write the fields.**
   - `term` as the lesson has it.
   - `meaning` in the meaning language. Set `meaningSource: "lesson"` only when the material gives that meaning; a meaning you composed has no source.
   - `example` from the lesson, with `exampleSource: "lesson"`, when the lesson uses the term in a sentence.
   - `source` names the lesson, such as "Lesson 12, 1 Oct".
   - Leave any other field out rather than guess. Set `enrich: true` only when the learner asks Lymi to fill the gaps.
5. **Confirm or add.** When the learner asked you to add the cards, add them. When they asked what is worth keeping, show the list and wait for their answer.
6. **Add in one call.** Send every card in one `add_cards` call, up to 200; split a longer lesson into calls of 200.
7. **Report.** Say how many were added and how many skipped, naming the deck a skipped term already lives in, and anything you left out on purpose. When the host shows Lymi's result view, the list is already on screen: give the counts and stop.

Offer review in Lymi once, at the end. Review and grading happen only in the app.

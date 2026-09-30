---
name: practise
description: Practise Lymi cards in conversation. Use when the learner asks to be quizzed, to practise their words, or to talk using the vocabulary they are learning.
---

# Practise

Practice here is conversation. It is not review: nothing you do is recorded, it never counts toward the daily goal or the streak, and Lymi's schedule does not change. Say that once, in one sentence, before the first question.

1. **Choose the cards.** Use what the learner names. Otherwise pick 10 to 15 with `search_cards`:
   - Often forgotten: `filter: { reviews: { slipping: { eq: true } } }`.
   - Recently missed: `filter: { reviews: { since: "-P14D", lastRating: { in: [1, 2] } } }`, `stats: true`.
   - This week's new cards: `filter: { createdAt: { gte: "-P7D" } }`.
2. **Pick the format** the learner asked for, or production by default:
   - **Production:** give the meaning, the learner answers with the term.
   - **Recognition:** give the term, the learner gives the meaning.
   - **Conversation:** talk in the language being learned and steer toward the chosen cards, one or two per turn.
3. **Ask one card at a time.** After each answer, say whether it matched the card and give the card's term exactly as stored. Accept a small spelling slip as right, and show the correct form.
4. **Close.** Name the two or three cards that gave the most trouble. Offer a hook or an example for them through the `tend-cards` skill; write only on the learner's yes. Offer `due_counts` and review in Lymi.

Every tool you call during practice reads. The only writes are the ones the learner agrees to in step 4.

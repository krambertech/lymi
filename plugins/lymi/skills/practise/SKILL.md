---
name: practise
description: Practise vocabulary from Lymi cards through a quiz or conversation. Use when the learner wants to practise saved material; scheduled review and grading happen in Lymi.
---

# Practise

Practice here does not record review grades or change Lymi's schedule, daily goal or streak. Make that distinction clear when starting, without repeating it through the conversation.

## Choose material and format

Use the cards or deck the learner names. Otherwise use `search_cards` to choose a manageable set that fits their request. Useful starting filters:

- Often forgotten: `filter: { reviews: { slipping: { eq: true } } }`.
- Recently missed: `filter: { reviews: { since: "-P14D", lastRating: { in: [1, 2] } } }`, `stats: true`.
- Added in the past seven days: `filter: { createdAt: { gte: "-P7D" } }`.

Include the named deck's `deckId` when searching within it. An empty page can still have `nextCursor`; continue until you have suitable cards or the search is exhausted. Use cards with enough information for the exercise, and offer another set if none fit. Leave missing meanings or examples unchanged unless the learner asks to improve the cards.

Use the requested format, or start with meaning-to-term recall:

- **Production:** give the meaning, the learner answers with the term.
- **Recognition:** give the term, the learner gives the meaning.
- **Conversation:** talk in the language being learned and steer toward the chosen cards, one or two per turn.

## Practise and close

In a quiz, ask one question at a time and wait for the answer before revealing it. In conversation, keep the exchange natural and use the chosen vocabulary. Give feedback against the card's intended meaning, accepting valid alternatives; show the stored form when correcting spelling, and distinguish a harmless typo from a change of meaning.

End when the chosen set is covered, the agreed time is up, or the learner wants to stop. Summarise difficulties actually observed; a smooth round does not need invented problem cards. Offer another round, review in Lymi, or help through [tend-cards](../tend-cards/SKILL.md) when useful.

Practice uses read tools. Saving a hint, example or correction is a separate action the learner must request or agree to; a wrong answer alone does not authorise a card edit.

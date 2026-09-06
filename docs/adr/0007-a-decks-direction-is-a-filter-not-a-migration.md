---
status: accepted
date: 2026-09-06
---

# A deck's direction is a filter over card states, not a migration of them

A deck says how its cards are asked: recognition, production, or both. That choice can be changed at any time from the deck's settings screen, and the change has to reach the cards already in the deck.

Turning a direction **on** creates the missing `card_states` rows, due now, for every card that follows the deck. Turning one **off** deletes nothing. Every due count and the review queue instead share one predicate, `asked` in `services/decks.ts`:

```sql
coalesce(cards.directions, decks.directions) = 'both'
or card_states.direction = coalesce(cards.directions, decks.directions)
```

A state row for a direction the card is no longer asked in stays where it is and stops being counted. Turn the direction back on and its stability, its difficulty and its next due date are exactly where they were left.

## Considered options

- **Delete the state rows for the direction that was turned off.** Rejected. `reviews.card_state_id` cascades on delete, so a learner who tried "both ways" for a week and went back to recognition would silently lose that week of review history. A setting must not be able to destroy data, and this one is two taps deep in a screen whose whole promise is that it can be changed later.
- **Leave the rows and keep asking them.** Rejected. The setting would then only apply to cards added after it, which is the behaviour it had before this change and reads as a bug: a deck says "Recognition" while producing production cards every morning.
- **Rewrite the states on the next review instead of on the change.** Rejected. The due count on Library and Today would disagree with the queue until the learner opened review.

## Consequences

- Changing the direction is instant and free at deck sizes this app sees. The backfill is one query and a batched insert per 50 cards.
- Every place that counts what is due joins `cards` and `decks` and applies `asked`: `listDecks`, `reviewQueue`, and the reminder query in `push-delivery.ts`. A new due count that skips it will over-count.
- The queue also excludes cards in an archived deck, which the reminder query already did. Archiving a deck now stops its cards coming up everywhere, not just in the lists.
- The card-level override, `cards.directions`, wins over the deck's wherever it is set. Nothing in the interface writes it yet; the API and MCP can.

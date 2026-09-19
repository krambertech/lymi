---
status: accepted
date: 2026-09-19
---

# A member catches up on card states at their next request

A change to a shared deck's cards writes states for the deck's owner only. Each member gets their missing states on their own next request that reads progress. Every reader still sees a row for every mode a learner is asked, so the draw, counts, stats, section gating and exports do not change.

This refines [ADR 0011](0011-a-shared-deck-is-one-deck-with-many-learners.md). [#249](https://github.com/krambertech/lymi/issues/249) tracks the published deck library that needs it.

## Context

Every asked mode of every card has one `card_states` row per learner. `stateStatementsForCard` used to insert that row for the owner and every member in one statement. At 10,000 members, one new card wrote 20,000 rows, and a lesson of 99 cards wrote about 2 million inside a single request. Most members of a published deck will be inactive, so most of those rows would never be read.

Everything that reads progress assumes the row exists. The draw in [ADR 0019](0019-the-review-queue-is-a-deterministic-weighted-draw.md) reads a state's `created_at` as when the card was added, and an unseen card's odds halve with that age.

## Decision

**Owners are written at once.** Adding, restoring or moving a card, changing a card's or deck's modes, and describing a picture insert the owner's missing states and raise `decks.states_version` in the same batch.

**Members catch up on request.** `deck_members.states_version` is the deck version the member's states last matched. `catchUpStates` finds the member's decks whose version is ahead. For each one, it inserts every missing state and copies the deck's version onto the membership in one batch, so the version always matches the cards that batch scanned. A member who is up to date costs one indexed read of their memberships.

**Where the catch-up runs.** Before `/api/decks`, `/api/series`, `/api/sections`, `/api/cards`, `/api/review`, `/api/stats`, `/api/exports` and `/api/settings`, which settles today against the queue when the goal changes, before every MCP request, and before a push reminder counts. Joining a deck writes every state and sets the version directly.

**When a caught-up state counts as added.** A state's `created_at` is when its card was created, or when the member joined if that was later. A state added at catch-up time would make a months-old card look new to the draw. The state is due from the catch-up, like any other new state.

**Catch-up is not audited.** It writes rows every learner was already owed and changes nothing anyone chose, so it writes no Activity row. The change that raised the version is audited where it happened.

## Considered options

- **Write every member's states on every change.** Rejected: the write grows with membership and can exceed a D1 request's limits.
- **No row until the first review.** Rejected for now: this is the usual shape in large learning apps, but every reader would have to invent virtual rows from cards and modes, and each draw would scan every card the learner studies instead of the rows due. Catch-up does not rule it out later.
- **Catch up on every API request.** Rejected: routes that never read progress would pay the lookup.
- **A timestamp instead of a version.** Rejected: two changes in the same millisecond would look like one.

## Consequences

- A card write costs the same for a deck with 10,000 members as for a deck with none.
- Members who never return get no new rows.
- A member's first request after a change pays for that deck's insert. The cost is the same as joining: one statement per mode, over the deck's cards.
- Requests that arrive together, such as the ones Today sends on open, can each run the same catch-up before any finishes. The inserts skip rows that exist, so the result is right, but the work repeats. A lock per membership would remove it if the cost ever shows.
- MCP catches up before every message, `initialize` and `tools/list` included, rather than per tool.
- A new reader of progress outside the routes above must call `catchUpStates` first, or it shows a member's deck without the newest cards until they next open the app.
- A mode turned on for an old card counts as added when the card was created, not when the mode was turned on. The owner's own rows still use the time of the change.

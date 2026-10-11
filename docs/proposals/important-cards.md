---
status: in_progress
date: 2026-10-11
decision: one personal Important mark that multiplies a card's odds in the draw; scheduling unchanged
---

# Important cards

A learner can mark a card as important, and on a day with more to review than the goal, an important card is more likely to come up. That is the whole feature: one mark, no levels, no setting, nothing to fill in when adding a card. FSRS intervals do not change. Not decided yet: the multiplier, which the simulation below picks.

## Evidence

**The problem ([#462](https://github.com/krambertech/lymi/issues/462)).** When more cards are due than the goal, the draw has no way to know which ones matter to the learner, so exam terms and work vocabulary wait with everything else.

**Other apps (checked 11 October 2026, from manuals, help pages and forums).**

| App | How a learner says "this matters more" | What it changes |
| --- | --- | --- |
| SuperMemo | A priority from 0 to 100% on every item | Auto-postpone pushes low-priority items back when overloaded |
| Anki | No priority; flags, a "marked" tag and filtered decks stand in | Nothing in the normal queue; a higher desired retention per deck preset shortens intervals |
| Quizlet | A star on a term, private to the learner | "Study starred" reviews only those |
| Memrise | Nothing; the app picks "difficult words" | A separate practice |
| Readwise | Frequency tuning per source | How often a source resurfaces, as a weight |

Learner-set marks in consumer apps are binary. Only SuperMemo has levels, and it is the example of the wall of settings [PRODUCT.md](../../PRODUCT.md) says Lymi is not.

**Our own decisions.** The draw is a weighted random pick, not a sorted list, and a weight of w makes a card w times as likely ([ADR 0019](../adr/0019-the-review-queue-is-a-deterministic-weighted-draw.md)). [ADR 0010](../adr/0010-the-review-queue-is-ordered-by-retrievability.md) rejected letting the learner choose the order, because it asks for an opinion about the scheduler.

## Decision

- **One mark.** A card is important or it is not. Three levels would ask for a decision on every card, and the default would absorb almost all of them.
- **A weight, not a sort.** The draw multiplies an important card's weight by a constant, for reviews and for unseen cards alike. A strict "important first" would stop ordinary cards for a learner who marks hundreds, and would bring back an order the learner could learn. A weight degrades gracefully and keeps the variety the draw was built for. It also counters the draw's lean towards cards still known: an important card that is slipping gets its odds back.
- **Unseen cards too.** After a large lesson, the marked cards start first. This may be where most of the value is.
- **Personal.** The mark belongs to the learner, like a schedule, not to the card, so a member of a shared or published deck can mark its cards and nobody else sees it. It is stored per learner and card, never on `cards`.
- **Scheduling unchanged.** The mark changes only which drawable card comes next, never when a card is due. A test holds this.
- **Every scope of the draw.** The day's draw, a deck, a section and a series weight the same way. A round keeps its own order, since it takes every card in its set.

## Where it is set

- The card screen, as a toggle.
- Review, from the revealed card's menu, so a card can be marked at the moment it matters.
- The API and MCP, so an assistant can mark the exam terms it extracts ([#531](https://github.com/krambertech/lymi/issues/531)).

The card screen and Library show the mark; a Library filter waits until learners ask for one.

## Boundaries

- The mark is not a separate review, a cram mode or a round.
- It does not change desired retention. A per-card retention target is the stronger lever and is held in reserve: it costs extra reviews every day and changes scheduling.
- A day with no backlog is barely changed by it. The copy says "more likely to come up", never "first".

## Simulation

`pnpm --filter @lymi/core simulate` runs a year at the default goal with a share of cards marked, for several multipliers, and reports how many important and ordinary cards are remembered and how many are late. The chosen multiplier should lift the important cards clearly without leaving ordinary cards noticeably later. Results land here with the first slice.

## Delivery

1. **The draw and storage.** A per-learner mark, the multiplier in `DRAW_POLICY`, the draw inputs on the server and in the shared client, the REST API, and the simulation.
2. **Web.** The toggle on the card screen and in review, the mark on the card screen and in Library, the copy in every catalog, and the event.
3. **MCP** ([#531](https://github.com/krambertech/lymi/issues/531)). `add_cards`, `update_card` and `search_cards`.
4. **Phone.** The same toggles, through a linked phone issue once the web is verified.

## Open questions

- The icon: a star is the convention, but it must not read as a rating or a favourite.
- Whether the mark should outlive archiving and restoring a card. The leaning is yes, since nothing about the learner's intent changed.

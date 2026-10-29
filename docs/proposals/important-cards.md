---
status: in_progress
date: 2026-10-11
decision: one personal Important mark that makes a card four times as likely in the draw; scheduling unchanged
---

# Important cards

A learner can mark a card as important, and on a day with more to review than the goal, an important card is more likely to come up. The feature adds one optional mark, with no levels or new fields in the add flow. FSRS intervals do not change. Not decided yet: the icon, and whether Library filters by the mark.

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

Among the apps compared here, only SuperMemo uses priority levels. A binary mark fits [PRODUCT.md](../../PRODUCT.md)'s rule against excessive settings.

**Our own decisions.** The draw is a weighted random pick, not a sorted list, and a weight of w makes a card w times as likely ([ADR 0019](../adr/0019-the-review-queue-is-a-deterministic-weighted-draw.md)). [ADR 0010](../adr/0010-the-review-queue-is-ordered-by-retrievability.md) rejected letting the learner choose the order, because it asks for an opinion about the scheduler.

## Decision

- **One mark.** A card is important or it is not. Three levels would ask for a decision on every card, and the default would absorb almost all of them.
- **Weighted selection.** The draw multiplies an important card's weight by four (`IMPORTANT_ODDS`), for reviews and for unseen cards alike. A strict "important first" would stop ordinary cards for a learner who marks hundreds, and would bring back an order the learner could learn. Weighted selection keeps ordinary cards eligible even when many cards are marked. It also counters the draw's lean towards cards still known: the multiplier increases the selection odds of an important card that is slipping.
- **Unseen cards too.** After a large lesson, the marked cards start first. This may be where most of the value is.
- **Personal.** The mark belongs to the learner, like a schedule, not to the card, so a member of a shared or published deck can mark its cards and nobody else sees it. It is stored per learner and card, never on `cards`.
- **Scheduling unchanged.** The mark changes only which drawable card comes next, never when a card is due. A test holds this.
- **Every scope of the draw.** The day's draw, a deck, a section and a series weight the same way. A round keeps its own order, since it takes every card in its set.

## Where it is set

- The card screen, from its menu (Mark important, Unmark important), with an amber star and the word Important under the term.
- Review, from the revealed card's menu (Mark important, Unmark important), so a card can be marked at the moment it matters.
- The API and MCP, so an assistant can mark the exam terms it extracts ([#531](https://github.com/krambertech/lymi/issues/531)).

The card screen and a deck's list show the mark; a filter waits until learners ask for one. A mark made offline waits in the write outbox like any card edit.

## Boundaries

- The mark is not a separate review, a cram mode or a round.
- It does not change desired retention. A per-card retention target remains a possible later choice: it costs extra reviews every day and changes scheduling.
- A day with no backlog is barely changed by it. The copy says "more likely to come up", never "first".

## Simulation

`pnpm --filter @lymi/core simulate` plays a backlogged year through the real draw and FSRS: goal 50, 20 new cards a day, four seeds. Shares are of the cards added to each group.

| Marked | Odds | Important remembered | Important late | Ordinary remembered | Ordinary late |
| --- | --- | --- | --- | --- | --- |
| 1 in 10 | 1 | 81% | 36% | 81% | 33% |
| 1 in 10 | 2 | 86% | 21% | 81% | 35% |
| 1 in 10 | **4** | **91%** | **8%** | **80%** | **37%** |
| 1 in 10 | 8 | 94% | 2% | 79% | 39% |
| 1 in 10 | 16 | 94% | 0% | 79% | 39% |
| 1 in 2 | 4 | 87% | 19% | 73% | 54% |
| 1 in 2 | 16 | 91% | 9% | 66% | 73% |

Late is more than a week overdue at the year's end. The multiplier of four captures most of the measured gain: with a few cards marked, late important cards fall from a third to under a tenth, and ordinary cards lose about a point. Beyond four, important cards gain little more while a learner who marks half their cards pays far more on the rest, which is the case a strict sort would make worst. Marked cards also start a day sooner after they are added. `src/simulation.test.ts` holds these claims.

## Delivery

1. **The draw and storage.** A per-learner mark, the multiplier in `DRAW_POLICY`, the draw inputs on the server and in the shared client, the REST API, and the simulation.
2. **Web.** The toggle on the card screen and in review, the mark on the card screen and in Library, the copy in every catalog, and the event.
3. **MCP** ([#531](https://github.com/krambertech/lymi/issues/531)). `add_cards`, `update_card` and `search_cards`.
4. **Phone.** The same toggles, through a linked phone issue once the web is verified.

## Open questions

- The mark outlives archiving and restoring a card, since nothing about the learner's intent changed. Confirm this reads right in Archived.

# How a review works

The rules of the daily goal, the streak, the draw and the end of a review. They apply on the web, the phone and through the API alike. The words are defined in [CONTEXT.md](../CONTEXT.md); how the streak looks is in [the streak's design](design/streak.md), and the flame is in [the brand rules](design/system/brand.md#flame).

## The daily goal and the streak are one mechanic

The learner chooses how many recall attempts they want to complete per learner-local day. Reaching that number satisfies the day's streak goal; if at least one review is available but fewer than the goal, completing all available reviews also satisfies it without pulling future cards forward.

A new account starts on 25 attempts from its first visit to Today; the phone's Welcome still offers the choice, and skipping it leaves 25. An account from before either keeps 50 until the learner chooses. The same control later lives in the streak modal, with quick choices of 10, 25, 50, and 100 plus a custom whole number from 1 to 200. The saved choice applies on later days; Today and Settings do not introduce separate goal editors.

Every accepted, non-undone grade counts exactly once toward the daily goal, including Forgot and every later attempt at the same card. The goal counts recall attempts, not distinct cards or correct answers, so forgetting never increases the required work. Reviews already completed that day count toward the total, and Undo removes the undone attempt.

## A short day is a rest day once a week

The streak counts consecutive learner-local days whose goal was satisfied. A day that ends without satisfying the goal becomes a rest day when the current run has had no other rest day in the six days before it: the run carries on through it without growing. Any other short day resets the current streak to zero, while the learner's review history remains intact.

Rest is automatic and worked out on every read, so it applies to all history; misses from before the run began don't count, and nothing counts rest days down or warns about them. When zero cards are eligible, opening Lymi and letting it confirm that nothing is due protects the current streak without increasing it; not opening still makes the day missed.

## The day follows the learner's timezone

The learner-local day initially uses the current device timezone without asking during setup. While the timezone remains automatic, the most recently foregrounded device may update it when its timezone changes during travel; a background device cannot overwrite that choice. A timezone chosen explicitly in Settings becomes a manual override and is not changed automatically until the learner returns it to automatic. Timezone changes affect current and future day boundaries without rewriting completed review history.

## The next card is recomputed, never stored

Lymi recomputes the next card from the cards, today's reviews, and the date. The same synced state gives the same next card after a reload, offline, on another device, or in another scope. A grade from another device can change the next card, and an offline grade that arrives after a later grade of the same card does not count. The rules are in [ADR 0019](adr/0019-the-review-queue-is-a-deterministic-weighted-draw.md).

Cards are drawn with weighted randomness rather than a strict order, so capture or edit order does not become a memorisation cue and a large deck cannot hide new material. When both reviews and new cards are available, one attempt in five is a new card. If either runs out, the other fills the goal. The draw favours reviews you still know, recently added cards, and cards the learner marked important, but anything eligible can appear. An important card is four times as likely to come up, as a review and as a new card, and its schedule is unchanged ([the proposal](proposals/important-cards.md)). Every fourth new card is the oldest not yet started, so a large deck keeps moving. These proportions are internal rules, not settings or quotas.

## A forgotten card comes back the same day

A forgotten card returns in the same direction a few cards later, then after longer gaps, up to three times a day. After that it waits until tomorrow. Hard on a card still being learned brings it back the same way. A card left in learning from an earlier day returns early in the next review. Once one direction of a card is reviewed, the other waits until tomorrow, because the answer would give it away. A card starts one direction at a time in its deck's order, which begins with production by default.

## A review runs to its end and stops once at the goal

A review runs until what it was opened for is empty: the whole day from the Review button, one deck, one section of a deck, one series, or a round. Only the day's draw stops, once, at the goal when it began below it, and Continue carries on from there to the end of the day. Crossing the goal in a deck, a section, a series or a round shows in the flame and never stops it. The header counts the goal while the day's draw is heading for it, and the stretch's own cards otherwise. The rules are in [ADR 0021](adr/0021-a-review-runs-to-its-end-and-stops-once-at-the-goal.md).

Every ending is the same success screen, whether the stretch reached the goal, ran out, or the learner pressed X after grading: it shows today's total rolling up from the last screen, embers for what was added, and the streak ticking when the day just turned. While the day is open, **Continue** leads and says how many more reviews reach the goal; once it is satisfied, **Done** leads. **Nothing left in** a deck leaves the day open while other decks have cards; **You're done for today** means every deck ran out, and the day counts. **Review forgotten** is offered at any end with forgotten cards. Continuing is optional and cannot make a completed streak goal incomplete.

When zero cards are due, the empty state protects but does not increase the streak and offers **Add cards**; adding alone does not count toward the review goal. Running out of cards while offline or after a failed refresh is not evidence that all useful reviews are finished.

## Today offers three rounds beside the day's draw

**New cards** starts unseen cards in the order the draw introduces them. **Forgotten today** is the same set as Review forgotten. **Often forgotten** holds slipping cards: the first grade of the day was Forgot on at least 3 of the last 5 days the card was reviewed, before today ([ADR 0024](adr/0024-returns-widen-and-an-often-forgotten-card-returns-once.md)). A slipping card comes whether or not it is due and is graded like any review, so its schedule moves and the attempt counts toward the goal. Each card comes once per round, and a card already reviewed today waits for tomorrow.

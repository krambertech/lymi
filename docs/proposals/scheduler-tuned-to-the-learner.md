---
status: accepted
date: 2026-11-17
decision: fit FSRS weights per learner on the server and adopt them only when they predict better, then offer three recall levels with a load preview; free
---

# A scheduler tuned to the learner

Every learner gets the same FSRS-6 weights and the same 90% recall level from [`fsrs.ts`](../../packages/core/src/fsrs.ts). A learner who forgets faster than the defaults assume gets intervals that are too long, and nobody can trade reviews for recall. This proposal fits the weights to each learner's own grades, then lets them pick one of three recall levels. [The shaping page](https://claude.ai/artifact/PgJwZQSbK7gY6ho1LZXqpi) has the research, option mockups and a cost calculator. The five questions at the end are not decided.

**Recall level** is the chance of recalling a card when it comes up, which FSRS calls desired retention. It needs its own term because [CONTEXT.md](../../CONTEXT.md) lists "target" as a word to avoid for the daily goal.

## Evidence

**How Lymi schedules (17 November 2026).** Only the server runs FSRS: `schedule()` on each accepted grade and `preview()` for the grade buttons, both in `apps/web/src/server/services/review.ts`. The `reviews` table keeps `rating`, `reviewed_at`, `elapsed_days` and `aid` for every grade, which is all a fit needs. A shared deck already gives each member their own `card_states` ([ADR 0011](../adr/0011-a-shared-deck-is-one-deck-with-many-learners.md)). Imports with a review log are Anki (four grades) and Mochi (pass or fail); Noji, Pleco and Quizlet bring none ([importing](importing-from-other-apps.md)).

**What a fit buys.** In srs-benchmark (about 10,000 Anki users, January 2026), FSRS-6 fitted per user cut calibration error from 0.092 to 0.065 and log loss from 0.366 to 0.346 against default weights. One fit per user beat one fit per deck (0.3554).

**What a fit costs.** fsrs-rs compiled to WASM (fsrs-browser 6.6.0) fitted 5,000 synthetic reviews in 67 ms of CPU and 100,000 in 2.5 s on a laptop, and recovered the weights the synthetic learner was built with. At list prices one fit costs about €0.00004 with VAT even when nothing falls inside the Workers plan's allowance; workflow steps are most of that.

**What a recall level costs.** A simulated year of 10 new cards a day gives 74 reviews a day at 80%, 107 at 90% and 152 at 95%, with 89%, 95% and 97% of all cards recallable at the end. Above 90% each point costs more reviews; below 85% the savings shrink.

**Other apps (checked 17 November 2026).** Anki and RemNote fit weights; Anki keeps the old ones when a new fit is not better. Anki and Mochi expose retention. On the Anki forum, raising retention from 90% to 95% with rescheduling turned one learner's 150 daily reviews into 4,000.

## Decision

- **Per learner, on the server.** One fit covers all of a learner's decks. Each member of a shared deck is fitted from their own grades. The fit runs in a Cloudflare Workflow step, one learner per step. The phone cannot fit on the device because Hermes has no WebAssembly.
- **FSRS-6.** The fit matches the 21 weights `ts-fsrs` 5.4.2 schedules with. FSRS-7 is a separate change.
- **When it runs.** The 15-minute cron queues a learner after an import that brought a log, once they have 64 history items (fsrs-rs fits all weights from 64), then at most monthly or when their review count doubles.
- **Adopt only a better fit.** The fit leaves out grades with an `aid`, since a hint or a choice is not unaided recall. It scores old and new weights on the newest 20% of reviews and keeps the new weights only when they score better. Weights are clipped to FSRS bounds.
- **Nothing moves on its own.** A new fit or a new recall level applies from each card's next grade. Due dates never change in bulk, which is the step that buried the Anki learner above.
- **Three recall levels.** "How much to review" offers Fewer reviews (85%), Balanced (90%, the default) and Remember more (95%). Beside them, a preview runs the learner's own cards, weights and recent pace of new cards forward 30 days and shows reviews a day against the daily goal. A higher level shows up as cards waiting at the end of a day, because the goal counts attempts and Lymi never pulls cards forward ([review.md](../review.md)).
- **Way back.** "Use the standard schedule" returns to default weights and 90%.
- **Learner data.** Weights and recall level go into export and leave with the account.
- **Free.** Scheduling stays on the free plan. A paywall would save a fraction of a cent per learner, and [the payments proposal](premium-subscription-and-payments.md) keeps review free.
- **Exam dates.** The exam-date shaping may raise one deck's recall level near a test. That layer sits on top of this one and is owned there.

Anki-style controls (a retention slider, an Optimize button, the 21 weights) are rejected: the forum confusions come from them, and [PRODUCT.md](../../PRODUCT.md) avoids excessive settings. Weights or levels per deck wait, because the benchmark found per-deck fits worse and exam decks get their own layer.

## Instrumentation

| Question | Event |
| --- | --- |
| Does a tuned schedule predict recall better? | `review_graded` gains `scheduler` (`default`, `tuned`) and a retrievability bucket; compare expected and actual recall on review-state cards. |
| Do fits run, and do they help? | New server event `schedule_fitted`: `outcome` (`adopted`, `kept`, `too_little_history`, `failed`), `trigger` (`import`, `monthly`, `doubled`), a review-count bucket, the rounded change in score. |
| Do learners pick a level, and does it change return? | New server event `recall_level_set`: `value`, `is_change`; the level as a person property for the retention charts. |

Each goes into [analytics.md](../analytics.md) with its slice.

## Delivery

1. **Measure.** Add `scheduler` and the retrievability bucket to `review_graded`, so the gap between default weights and real recall is known before anything changes.
2. **Quiet tuning.** First a spike: run an fsrs-rs WASM build in a Worker. fsrs-browser uses threads and shared memory, which Workers may refuse; `@open-spaced-repetition/binding` has a single-thread WASI build that is still beta; building fsrs-rs 7 for plain WASM is the fallback. Then the fit Workflow, per-learner weights in D1, `schedule_fitted`, a line in Insights, export and deletion. Done when a learner with an Anki import is fitted within an hour of it and the next grade uses the new weights.
3. **Recall levels.** The choice, its preview and `recall_level_set` on the web, then the phone in a linked issue. Update [review.md](../review.md), CONTEXT.md and the public scheduling page in the same change.

## Open questions

1. Three levels at 85%, 90% and 95%, or a wider range? Lean: three.
2. Where does the choice live? Lean: the streak modal under the daily goal, since both answer "how much a day". The alternative is a Review group in Settings.
3. Does Lymi say when it tunes the schedule? Lean: one line in Insights, no toast or notification.
4. After a new fit, rewrite every card's memory state at once, as Anki does, or only from each card's next grade? Lean: from the next grade. Rewriting is cheap today, but at 100,000 learners those writes are the one cost that shows.
5. Read the weights Anki already fitted when a collection is imported? Lean: yes, if its deck config carries them; otherwise fit from the imported log.

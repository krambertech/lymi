---
name: model-check
description: Model-check the few Lymi flows where a wrong order of events loses or leaks data, with TLA+ and TLC. Use when a change touches the offline write queue (packages/client/src/writes.ts, queued.ts, the phone's Sync and sign-out screens) or how the server settles a review day (apps/web/src/server/services/review-days.ts, the grade in review.ts, nextOutcome in packages/core/src/streak.ts).
---

# Model-check the flows that can lose data

Each model is a small TLA+ description of one flow, checked by TLC over every order of its steps within stated bounds. Tests cover the orders someone wrote down; a model covers all of them. A pass covers the model and its bounds, not the whole system.

| Model | Rule | On `main` |
| --- | --- | --- |
| [Write queue](#write-queue) | A learner's queued write is never sent on another learner's session | Holds |
| [Review day](#review-day) | Once every request is answered, the day's outcome is the one its reviews call for | Holds since pull request 1164 |

## Run a check

```bash
.agents/skills/model-check/scripts/check.sh WriteQueue
.agents/skills/model-check/scripts/check.sh ReviewDay
```

It needs Java 11 or later (`brew install openjdk`, or set `JAVA`). The first run downloads TLC 1.7.4 to `~/.cache/lymi` and checks its SHA-256; set `TLA2TOOLS` to use a jar you already have. A pass prints `distinct states found`, no `violated` line, and exits 0. A broken rule prints `Invariant <Name> is violated` with the steps, and exits 12. To check another configuration, copy the model's `.cfg`, change a constant and pass the copy's path, relative or absolute, as the second argument.

To read a result as a chart or as a path in plain words, use the pstack statechart skill on the model's `.tla`, its `.cfg` and its `.view.mjs`. It is installed per machine and its commands change between releases, so take them from that skill.

## When a check fails

Read the path as a sequence of things people and the server do. Then replay it against the real code as a test, one call per step, holding a request back where the path interleaves another. The section of each model names where its replays live.

- The replay fails: the code has the bug. Report the path in the code's words and fix the code, or report it to whoever owns the fix.
- The replay passes: the model is wrong. Find the step that the code does not take, or takes together with another, and correct the model. Do not weaken the rule.

## When you change the covered code

Change the model in the same pull request, so that each step still names one thing the code does in one go: one D1 statement on the server, one synchronous stretch between awaits on the client. Add a variable when the code gains state the rule depends on. Run the check, then record the commit you confirmed in the model's section.

## Write queue

**Rule:** a write one learner queued is never sent on another learner's session. **Harm:** a card or deck made offline by one person lands in the next person's account on a shared phone, and nothing tells either of them.

The invariant is `NoCrossSend` in [`models/WriteQueue.tla`](models/WriteQueue.tla), checked with [`models/WriteQueue.cfg`](models/WriteQueue.cfg): two learners, two writes, three claims. A pass ends with `4618 distinct states found` in under ten seconds.

| Model step | Code |
| --- | --- |
| `SyncClaims` | `claimWrites` in `packages/client/src/writes.ts`, `claimQueued` in `packages/client/src/queued.ts`, called from `Sync` in `apps/mobile/src/data/sync.ts` and from `apps/web/src/client/routes/__root.tsx` |
| `Submit` | `submit` and `put` in `writes.ts` |
| `FlushStarts`, `FlushStopsOnClaim`, `SendLeavesAny`, `SendLands`, `SendStops`, `SendFails`, `FlushEnds` | `flushQueued` in `writes.ts`: the snapshot of `read()`, the `claim !== mine` checks, `sendWithin`, `remove` and `put` |
| `SessionEnds` | the session ending, with `unclaimWrites` in the cleanup of `Sync`'s effect |
| `Drops` | `dropWrites` in `writes.ts`, called from `apps/mobile/src/app/(tabs)/you/index.tsx`, `delete-account.tsx` and `delete-code.tsx` |

The model describes the code at `0d80e817a` on `main`. A request takes its session when it leaves (`config.headers()` in `packages/client/src/api/request.ts`), and the flush loop awaits `flushGrades` before each send, so the learner can change between two sends of one flush. The model keeps both facts; do not merge those steps.

Replays live in `packages/client/src/writes.test.ts`: "sends nothing after a sign-out", "does not put a write back when the learner signed out", "stops a flush that was mid-way when the learner left" and "keeps the queue but holds it".

**See it fail.** Each guard is a constant in the config, and each one set to `FALSE` breaks the rule:

- `ReleasesOnSignOut`: the queue stays claimed and in memory after sign-out, as on `main` before pull request 1156.
- `ChecksClaimBeforeSend`: a flush that was waiting on grades when the learner left sends its next write on the new learner's session.
- `ChecksClaimOnFailure`: a request that fails after the next learner claimed the queue writes the first learner's entry back, and the next flush sends it.

**Leaves out:** more than two learners, two writes and three claims; the grades outbox in `packages/client/src/grades.ts`; the retry timer and the web's cross-tab lock; the web's sign-out, which reloads the page; and whether the server accepts a write.

## Review day

**Rule:** opening Lymi confirms a day as nothing due only while no grade has landed, and once every request has its answer, today's `review_days.outcome` is the one its reviews call for, so no grade or Undo is lost. A day already confirmed may gain reviews and stay `nothing_due` below the goal, as [docs/review.md](../../../docs/review.md) says; it moves to `goal_met` or `exhausted` once it earns them. **Harm:** a day the learner reviewed only protects the streak instead of counting, or counts a goal it no longer meets, and Today shows a state the server no longer holds.

The invariants are `ConfirmsOnlyWithoutGrades` and `NoLostUpdate` in [`models/ReviewDay.tla`](models/ReviewDay.tla). [`models/ReviewDay.cfg`](models/ReviewDay.cfg) checks two grades, one Undo of a grade made earlier, and one visit (opening Lymi), on a day with a goal of two and no cards due, starting with or without that earlier grade. Each request reads and writes in separate statements, and any of them may never be sent.

| Model step | Code |
| --- | --- |
| `Reads` | `openDay` in a grade (`gradeCard` in `apps/web/src/server/services/review.ts`); the day select in `undoReview` and `checkToday` in `review-days.ts` |
| `GradeLands` | `gradeCard`'s batch: the card state and the review row |
| `UndoLands` | `restoreIfLatest` |
| `VisitCountsDue` | `drawableCount` at the top of `checkToday` |
| `VisitCounts`, `VisitConfirms` | `checkToday` before pull request 1164: `attemptsOn`, then the update to `nothing_due` |
| `ReadsAgain` | the select of the day row at the top of each try in `settleDay` |
| `Counts` | `attemptsOn` and `drawableCount` in `settleDay`, then `nextOutcome` in `packages/core/src/streak.ts` (before 1164, the same rules inlined in `settleDay`) |
| `Writes`, `Rereads` | `settleDay`'s compare-and-set update, and the next try when it misses, up to `SETTLE_TRIES` |

Two constants are the guards; the default config turns both on and describes `main` with pull request 1164 (its head `55573043b` less the `nextOutcome` clamp it is dropping). It holds: 105,573 distinct states in about a second, and 116,599 with one card due.

| Constant | Code | Off |
| --- | --- | --- |
| `CompareAndSet` | `settleDay`'s update lands only over the outcome, goal and attempts it decided from | `ConfirmsOnlyWithoutGrades` breaks |
| `ReadsDayFirst` | each try in `settleDay` selects the day row rather than deciding from its caller's copy | `NoLostUpdate` breaks |

Both `FALSE` is the code before 1164, where both rules break. The paths TLC found there, each replayed on a local D1 before 1164 fixed them:

- A grade lands while opening Lymi confirms the day as nothing due: the visit writes `nothing_due` over a grade that had landed. Breaks `ConfirmsOnlyWithoutGrades`.
- Undo of an earlier grade reads the day; another grade then meets the goal; the Undo lands and, deciding the outcome it read, writes nothing: `goal_met` with one review of two. Breaks `NoLostUpdate`.
- A grade reads the day as done; an Undo and a visit rightly confirm it nothing due; the grade lands with nothing left to review and writes nothing for the same reason: `nothing_due` where `nextOutcome` calls for `exhausted`, so a day that should count only protects the streak. Breaks `NoLostUpdate`.

Their replays are in `apps/web/src/server/services/review-days.test.ts` under "a grade that lands while the day is being settled".

**See it fail.** Set `CompareAndSet` or `ReadsDayFirst` to `FALSE` in a copy of the config. `Tries` is `SETTLE_TRIES`; within these bounds the rule still holds with `1`, so the bound on retries is not what keeps it.

**Leaves out:** changing the goal (`applyGoalToToday`), midnight and the zone, grade replays (`duplicate` in `gradeCard`), more than two grades and one Undo, cards that become due during the day, and `drawableCount` read at a different moment from `attemptsOn`.

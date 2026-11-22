---
name: model-check
description: Model-check the few Lymi flows where a wrong order of events loses or leaks data, with TLA+ and TLC. Use when a change touches the offline write queue (packages/client/src/writes.ts, queued.ts, the phone's Sync and sign-out screens), how a grade reaches the server or is taken back (packages/client/src/grades.ts, gradeCard in apps/web/src/server/services/review.ts, undoReview and restoreIfLatest in review-days.ts), how the server settles a review day (apps/web/src/server/services/review-days.ts, the grade in review.ts, nextOutcome in packages/core/src/streak.ts), or how an import's write run stops (writeChunk in import-writer.ts, finishImport, failImport, cancelImport, archiveImport and expireImports in imports.ts, imports/write-run.ts).
---

# Model-check the flows that can lose data

Each model is a small TLA+ description of one flow, checked by TLC over every order of its steps within stated bounds. Tests cover the orders someone wrote down; a model covers all of them. A pass covers the model and its bounds, not the whole system.

| Model | Rule | On `main` |
| --- | --- | --- |
| [Write queue](#write-queue) | A learner's queued write is never sent on another learner's session | Holds |
| [Grade outbox](#grade-outbox) | Once nothing waits, every grade the learner kept counts and every one they took back does not | Holds |
| [Review day](#review-day) | Once every request is answered, the day's outcome is the one its reviews call for | Holds since pull request 1164 |
| [Import writes](#import-writes) | Once an import is failed, cancelled or done, no chunk adds a card | Holds since pull request 1164 |

[`models/models.json`](models/models.json) holds, for each model, its state count, the rule each guard protects and the pull request that fixed it, the functions it covers and the tests that replay its paths. `pnpm check:models` holds the manifest to the code, as part of `pnpm check`: it fails when a covered function changes, when a replay is gone, or when a guard has no rule. CI also runs `pnpm check:models --run`, where every model must hold over the recorded number of states and every guard, turned off alone, must break the rule named for it.

## Run a check

```bash
pnpm check:models --run
```

runs everything CI runs, in under a minute. To see one model's output:

```bash
.agents/skills/model-check/scripts/check.sh WriteQueue
.agents/skills/model-check/scripts/check.sh ReviewDay
WORKERS=auto .agents/skills/model-check/scripts/check.sh GradeOutbox
.agents/skills/model-check/scripts/check.sh ImportWrites
```

It needs Java 11 or later (`brew install openjdk`, or set `JAVA`). The first run downloads TLC 1.7.4 to `~/.cache/lymi` and checks its SHA-256; set `TLA2TOOLS` to use a jar you already have. `WORKERS=auto` checks on every core; leave it out when a rule breaks, so the path found is the same each time. A pass prints `distinct states found`, no `violated` line, and exits 0. A broken rule prints `Invariant <Name> is violated` with the steps, and exits 12. To check another configuration, copy the model's `.cfg`, change a constant and pass the copy's path, relative or absolute, as the second argument.

To read a result as a chart or as a path in plain words, use the pstack statechart skill on the model's `.tla`, its `.cfg` and its `.view.mjs`. It is installed per machine and its commands change between releases, so take them from that skill.

## When a check fails

Read the path as a sequence of things people and the server do. Then replay it against the real code as a test, one call per step, holding a request back where the path interleaves another. The section of each model names where its replays live.

- The replay fails: the code has the bug. Report the path in the code's words and fix the code, or report it to whoever owns the fix.
- The replay passes: the model is wrong. Find the step that the code does not take, or takes together with another, and correct the model. Do not weaken the rule.

## When you change the covered code

Change the model in the same pull request, so that each step still names one thing the code does in one go: one D1 statement on the server, one synchronous stretch between awaits on the client. Add a variable when the code gains state the rule depends on. Then run `pnpm check:models --run`, and record the new state count in `models.json` if it moved. `pnpm check:models --confirm` writes `models/confirmed.json`, the fingerprint of the covered code with comments and spacing left out; run it only after comparing every step in the model's table with the new code.

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

A request takes its session when it leaves (`config.headers()` in `packages/client/src/api/request.ts`), and the flush loop awaits `flushGrades` before each send, so the learner can change between two sends of one flush. The model keeps both facts; do not merge those steps.

Replays live in `packages/client/src/writes.test.ts`: "sends nothing after a sign-out", "does not put a write back when the learner signed out", "stops a flush that was mid-way when the learner left" and "keeps the queue but holds it".

**See it fail.** Each guard is a constant in the config, and each one set to `FALSE` breaks the rule:

- `ReleasesOnSignOut`: the queue stays claimed and in memory after sign-out, as on `main` before pull request 1156.
- `ChecksClaimBeforeSend`: a flush that was waiting on grades when the learner left sends its next write on the new learner's session.
- `ChecksClaimOnFailure`: a request that fails after the next learner claimed the queue writes the first learner's entry back, and the next flush sends it.

**Leaves out:** more than two learners, two writes and three claims; the grades outbox, which [has its own model](#grade-outbox); the retry timer and the web's cross-tab lock; the web's sign-out, which reloads the page; and whether the server accepts a write.

## Grade outbox

**Rule:** once nothing waits on this device and no request is in the air, every grade the learner made and kept is counted, every grade they took back is not, and the card's schedule holds exactly the counted grades in order. A later grade from another device may beat one of them. **Harm:** a review disappears, a grade the learner undid still moves the card, or a regrade lands before the Undo it replaces.

The invariants are `KeptGradesCount`, `TakenBackGradesDoNot` and `ScheduleHoldsTheCounted` in [`models/GradeOutbox.tla`](models/GradeOutbox.tla). [`models/GradeOutbox.cfg`](models/GradeOutbox.cfg) checks one card in one mode: two grades from this device and one from another, four requests and one kill of the app. Any answer may be lost, and any request may land after the device gave up on it.

| Model step | Code |
| --- | --- |
| `Make`, `TakeBack` | the write at the top of `recordGrade` and of `undoGrade` in `packages/client/src/grades.ts`; only the last grade can be taken back, as `last` in `packages/client/src/review-flow/core.ts` |
| `Starts`, `Stops` | `serial`, around `recordGrade`, `flushOutbox` and `undoGrade` |
| `SettleForgets`, `SettleReplays`, `SettleUndoes`, `SettleEnds` | the loop in `settleUndos` |
| `FlushSkips`, `FlushSends`, `FlushEnds` | the loop in `flushQueued` over its snapshot, and the mark `send` stores before the request leaves |
| `ElsewhereAnswers` | the same loops awaiting a request of another mode |
| `GradeAnswered`, `UndoAnswered`, `ServerFails`, `TurnedAwayForNow`, `TurnedAway`, `GivesUp` | what `send`, `flushQueued` and `settleUndos` do with each answer: 2xx, 5xx, 401 or 426, another 4xx, and none |
| `Killed` | the app dying mid-send, with the outbox as storage holds it |
| `GradeReads`, `GradeLands` | `gradeCard`'s select, then its batch; `gradeReviewId` makes a copy collide |
| `UndoReads`, `UndoLands` | `undoReview`'s select, then `restoreIfLatest` |

The default config holds: 1,395,255 distinct states. With six requests it held over 74,711,532, checked by hand because it takes too long for CI.

| Constant | Code | Off |
| --- | --- | --- |
| `MarksBeforeSend` | `send` stores `unanswered` before its request leaves | `TakenBackGradesDoNot` breaks: a 5xx after the batch, or a kill mid-send, leaves an undone grade counted |
| `SeesLateUndo` | `flushQueued` reads the outbox again before each send | `TakenBackGradesDoNot` breaks: a regrade overtakes an undo made while the flush waited on another card |
| `ReplaysUnanswered` | `settleUndos` sends an unanswered grade again to learn its attempt | `TakenBackGradesDoNot` breaks |
| `HoldsMode` | a grade waits behind one of its mode the server could not take | `KeptGradesCount` breaks |
| `LandsOverRead` | `gradeCard`'s update lands only over the state it read | `ScheduleHoldsTheCounted` breaks |
| `DuplicateNamesAttempt` | `gradeCard` names the attempt of a grade it already stored | `TakenBackGradesDoNot` breaks |

Replays live in `packages/client/src/grades.test.ts`, in `apps/web/src/server/phone-client.test.ts` against the real Worker, and in `apps/web/src/server/services/review-days.test.ts`.

**Leaves out:** two tabs sharing one outbox, where the browser's lock keeps their runs apart; a 4xx after a send that got no answer, such as a deck left meanwhile, where the device drops the grade and the server may keep it counted; grades sent before the outbox kept attempts; more than three grades of one card; `retireGrades`; and full storage.

## Review day

**Rule:** opening Lymi confirms a day as nothing due only while no grade has landed, and once every request has its answer, today's `review_days.outcome` is the one its reviews call for, so no grade or Undo is lost. A day already confirmed may gain reviews and stay `nothing_due` below the goal, as [docs/review.md](../../../docs/review.md) says; it moves to `goal_met` or `exhausted` once it earns them. **Harm:** a day the learner reviewed only protects the streak instead of counting, or counts a goal it no longer meets, and Today shows a state the server no longer holds.

The invariants are `ConfirmsOnlyWithoutGrades` and `NoLostUpdate` in [`models/ReviewDay.tla`](models/ReviewDay.tla). [`models/ReviewDay.cfg`](models/ReviewDay.cfg) checks two grades, one Undo of any grade that has landed, and one visit (opening Lymi), on a day with a goal of two and no cards due, starting with or without a grade made earlier. Each request reads and writes in separate statements, and any of them may never be sent.

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

Two constants are the guards; the default config turns both on and describes `main`. It holds: 283,161 distinct states in a few seconds, and 286,312 with one card due.

| Constant | Code | Off |
| --- | --- | --- |
| `CompareAndSet` | `settleDay`'s update lands only over the outcome, goal and attempts it decided from | `ConfirmsOnlyWithoutGrades` breaks |
| `ReadsDayFirst` | each try in `settleDay` selects the day row rather than deciding from its caller's copy | `NoLostUpdate` breaks |

Both `FALSE` is the code before 1164, at `0d80e817a`, where both rules break. The paths TLC found there, each replayed on a local D1 before 1164 fixed them:

- A grade lands while opening Lymi confirms the day as nothing due: the visit writes `nothing_due` over a grade that had landed. Breaks `ConfirmsOnlyWithoutGrades`.
- Undo of an earlier grade reads the day; another grade then meets the goal; the Undo lands and, deciding the outcome it read, writes nothing: `goal_met` with one review of two. Breaks `NoLostUpdate`.
- A grade reads the day as done; an Undo and a visit rightly confirm it nothing due; the grade lands with nothing left to review and writes nothing for the same reason: `nothing_due` where `nextOutcome` calls for `exhausted`, so a day that should count only protects the streak. Breaks `NoLostUpdate`.

Their replays are in `apps/web/src/server/services/review-days.test.ts` under "a grade that lands while the day is being settled".

`NoLostUpdate` holds a day with no reviews to `nothing_due` once confirmed and `open` otherwise, so an Undo that reopens a confirmed day breaks it.

**See it fail.** Set `CompareAndSet` or `ReadsDayFirst` to `FALSE` in a copy of the config. `Tries` is `SETTLE_TRIES`; within these bounds the rule still holds with `1`, so the bound on retries is not what keeps it.

**Leaves out:** changing the goal (`applyGoalToToday`), midnight and the zone, grade replays (`duplicate` in `gradeCard`), more than two grades and one Undo, cards that become due during the day, and `drawableCount` read at a different moment from `attemptsOn`.

## Import writes

**Rule:** once an import is failed, cancelled or done, no chunk of its write run adds a card. **Harm:** cards appear in a deck from an import the learner was told had stopped, and after they archive that import the late cards stay active, because the archive covered only the cards that were there.

The invariants are `NoCardsAfterEnd` and `ArchiveCoversEveryCard` in [`models/ImportWrites.tla`](models/ImportWrites.tla). [`models/ImportWrites.cfg`](models/ImportWrites.cfg) checks a run of two chunks against the stall check, the learner's cancel and archive, and the run's own finish, each read and write a separate step.

| Model step | Code |
| --- | --- |
| `Confirm` | `confirmImport` in `apps/web/src/server/services/imports.ts`, which starts the Workflow |
| `RunReads` | `writeImportChunk`'s `readyWork` and `writeChunk`'s reads in `import-writer.ts`, which do not look at the status; the loop is `writeImport` in `apps/web/src/server/imports/write-run.ts` |
| `ChunkLands` | `writeChunk`'s one batch, every statement under its `guard` |
| `Finish` | `finishImport`, importing to done only over importing |
| `FailReads`, `FailWrites` | `expireImports` finding a stalled import, then `failImport`'s read and its update over the status it read; `failRun` takes the same path when a step fails |
| `CancelReads`, `CancelWrites` | `cancelImport`, which refuses once the import is importing |
| `ArchiveReads`, `ArchiveWrites` | `archiveImport` in `import-writer.ts`, which archives the cards the import added so far |

The default config describes `main`, where pull request 1164 added `status = 'importing'` to `writeChunk`'s guard and to its last update (`ChunkChecksStatus = TRUE`). The rule holds: 321 distinct states with two chunks, 653 with four.

Before 1164, at `0d80e817a` (`ChunkChecksStatus = FALSE`), the rule broke in five steps. The stall check failed a slow import between a chunk's reads and its batch; the batch checked only `written`, so it landed and added the chunk's cards to a failed import. With an archive between them, the late cards stayed active. Both paths were replayed on a local D1 with `writeImportChunk` held before its batch: ten cards landed in the failed import and nine stayed active after the archive; with the guard, none. "writes no chunk once the import has failed" in `apps/web/src/server/services/imports.test.ts` replays the first path.

**See it fail.** Set `ChunkChecksStatus` to `FALSE` in a copy of the config. It is the only guard the rule rests on: with it, no other actor's order matters, because the batch checks the status in the same statement that writes.

**Leaves out:** the pictures and recordings step (`attachImportPictures`), which can still store media on cards a chunk added before the import ended; a run handing over to the next; a step retried by Workflows, which the `written` guard makes harmless; restore after archive; and more than one run or four chunks.

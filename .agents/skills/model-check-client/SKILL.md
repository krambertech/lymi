---
name: model-check-client
description: Model-check the shared client's offline write queue against the rule that one learner's queued writes never send on another learner's session. Use when a change touches the queue's claim, the flush loop, or what sign-out and account deletion do to the queue, in packages/client/src/writes.ts, packages/client/src/queued.ts or the phone's Sync and sign-out screens.
---

# Model-check the shared client

A TLA+ model of the offline write queue, checked by TLC over every order of sign-in, sign-out, adding a card, sending and failing. Tests cover the orders someone wrote down; this covers all of them within the bounds below.

## The rule

**A write one learner queued is never sent on another learner's session.** If it breaks, a card or deck made offline by one person lands in the next person's account on a shared phone, and nothing tells either of them.

The model checks it as the invariant `NoCrossSend` in [`models/WriteQueue.tla`](models/WriteQueue.tla).

## What the model covers

| Model step | Code |
| --- | --- |
| `SyncClaims` | `claimWrites` in `packages/client/src/writes.ts`, `claimQueued` in `packages/client/src/queued.ts`, called from `Sync` in `apps/mobile/src/data/sync.ts` and from `apps/web/src/client/routes/__root.tsx` |
| `Submit` | `submit` and `put` in `writes.ts` |
| `FlushStarts`, `FlushStopsOnClaim`, `SendLeavesAny`, `SendLands`, `SendStops`, `SendFails`, `FlushEnds` | `flushQueued` in `writes.ts`: the snapshot of `read()`, the `claim !== mine` checks, `sendWithin`, `remove` and `put` |
| `SessionEnds` | the session ending, with `unclaimWrites` in the cleanup of `Sync`'s effect |
| `Drops` | `dropWrites` in `writes.ts`, called from `apps/mobile/src/app/(tabs)/you/index.tsx`, `delete-account.tsx` and `delete-code.tsx` |

The model describes the code at the commit on `main` that added this file; `git log --diff-filter=A --format=%h -1 -- .agents/skills/model-check-client/SKILL.md` prints it. A change to a file in the table after that commit means the model needs another look. After reading the changed code against each step above, replace that command here with the hash you confirmed.

A request takes its session when it leaves (`config.headers()` in `packages/client/src/api/request.ts`), and the flush loop awaits `flushGrades` before each send, so the learner can change between two sends of one flush. The model keeps both facts; do not merge those steps.

## Run it

```bash
.agents/skills/model-check-client/scripts/check.sh
```

It needs Java 11 or later (`brew install openjdk`, or set `JAVA`). The first run downloads TLC 1.7.4 to `~/.cache/lymi` and checks its SHA-256; set `TLA2TOOLS` to use a jar you already have. A pass ends with `4618 distinct states found` in under ten seconds and exits 0. A broken rule prints `Invariant NoCrossSend is violated` with the steps, and exits 12.

To read a result as a chart or as a path in plain words, use the pstack statechart skill on `models/WriteQueue.tla` with `models/WriteQueue.cfg` and the view `models/WriteQueue.view.mjs`. It is installed per machine and its commands change between releases, so take them from that skill.

## When the check fails

Read the path as a sequence of things a person and the phone do. Then replay it against the real code as a test in `packages/client/src/writes.test.ts`, one call per step; the tests named "sends nothing after a sign-out", "does not put a write back when the learner signed out", "stops a flush that was mid-way when the learner left" and "keeps the queue but holds it" are earlier replays.

- The replay fails: the code has the bug. Report the path in the code's words and fix the code.
- The replay passes: the model is wrong. Find the step that the code does not take, or takes together with another, and correct the model. Do not weaken `NoCrossSend`.

## When you change the covered code

Change the model in the same pull request, so that each step still names one thing the code does in one go. Add a variable when the code gains state the rule depends on. Run the check, then record your commit in "What the model covers".

## See it fail

The three guards are constants in `models/WriteQueue.cfg`. Set one to `FALSE` in a copy of the config and pass the copy as the second argument: `check.sh WriteQueue /path/to/copy.cfg`. Each one off breaks the rule:

- `ReleasesOnSignOut`: the queue stays claimed and in memory after sign-out, as on `main` before pull request 1156.
- `ChecksClaimBeforeSend`: a flush that was waiting on grades when the learner left sends its next write on the new learner's session.
- `ChecksClaimOnFailure`: a request that fails after the next learner claimed the queue writes the first learner's entry back, and the next flush sends it.

## What it does not cover

- Two learners, two writes and three claims. A pass says nothing about larger numbers, though the rule has no step that depends on them.
- The grades outbox in `packages/client/src/grades.ts`, which `flushGrades` sends and which has its own storage.
- The retry timer, which only starts a flush, and the cross-tab lock on the web.
- The web's sign-out, which reloads the page and so starts from the model's first state.
- Whether the server would accept the write. The model treats every request that leaves with a session as one that can land.

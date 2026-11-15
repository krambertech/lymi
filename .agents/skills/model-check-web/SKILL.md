---
name: model-check-web
description: Model-check the web client's add-a-card sheet against the rule that Undo never offers back a card that is already in, and Smart add and sign-in against answers from a read or submit the learner left. Use when a change touches closing, saving or Undo in apps/web/src/client/components/add-card-sheet.tsx or lib/sheet-phase.ts, Smart add's steps in components/smart-add.tsx or lib/smart-add-flow.ts, or the email form in routes/login.tsx or lib/login-flow.ts.
---

# Model-check the web client

Three TLA+ models, checked by TLC over every order of the steps a learner takes and the answers the server sends. Tests cover the orders someone wrote down; this covers all of them within the bounds below.

## The rules

| Model | Rule | Harm when it breaks |
| --- | --- | --- |
| `AddSheet` | `NoUndoForSaved`: Undo on "Card discarded" never offers back a draft whose card is already in. | The toast says the card was thrown away while it was saved. Undo brings it back, and adding it again gives "already in" or, offline, a second write. |
| `SmartAdd` | `NoMoveAfterLeaving`: a read the learner stopped or went back from never moves the step to its questions or term list. | The dialog jumps away from the lesson the learner went back to, onto a list from the read they stopped. |
| `Login` | `AnswerOnItsForm`: a form shows only its own answer. | A refused sign-in shows "That email and password don't match" on Create account, or a sign-up's notice replaces the reset form. |

`AddSheet` is the primary model: its break loses the learner's trust in Undo and can write twice. The other two also feed the charts below.

## What the models cover

| Model step | Code |
| --- | --- |
| `AddSheet`: `YouOpen`, `YouClose`, `YouUndo` | `close` and the `card-discarded` toast in `components/add-card-sheet.tsx`; the `open` and `close` events of `sheetPhase` in `lib/sheet-phase.ts` |
| `AddSheet`: `YouAdd`, `SaveLands`, `SaveFails` | `submit` in `add-card-sheet.tsx`: `save`, `writes.addCard`, `close(false, true)` and `settle` |
| `SmartAdd`: `YouFindTerms`, `ScanFinishes`, `ReadFails`, `BeatEnds`, `YouStop` | `start` and the Stop handler in `components/smart-add.tsx`; `read`, `finish`, `advance`, `fail` and `stop` in `lib/smart-add-flow.ts` |
| `SmartAdd`: `YouShowTerms`, `CheckAnswers`, `CheckFails`, `YouGoBack`, `YouAddCards` | `applyOwnAnswers` and the steps' `onNext`, `onBack` and `onAdd`; `checked` and `back` in `smart-add-flow.ts` |
| `Login`: every step | `submit`, `switchTo`, `resend` and `noticeFor` in `routes/login.tsx`; `loginFlow` in `lib/login-flow.ts` |

The models describe the code at commit `3e4853c44`. A change to a file in the table after that commit means the models need another look. Move this commit forward only after reading the changed code against each step above.

`EditCardSheet` in `components/edit-card-sheet.tsx` uses the same `sheetPhase`, so `AddSheet` stands for it too: its "Changes discarded" toast follows the same rule.

The server answers "already in" for a term its deck has, so in `AddSheet` a draft that added its card never adds another; `SaveFails` is that answer. Keep that guard on `SaveLands` unless the server's duplicate check changes.

## Run it

```bash
.agents/skills/model-check-web/scripts/check.sh AddSheet
.agents/skills/model-check-web/scripts/check.sh SmartAdd
.agents/skills/model-check-web/scripts/check.sh Login
```

Always name the model: the script is a copy of the shared client's and defaults to its model. It needs Java 11 or later (`brew install openjdk`, or set `JAVA`). The first run downloads TLC 1.7.4 to `~/.cache/lymi` and checks its SHA-256; set `TLA2TOOLS` to use a jar you already have. A pass ends with `No error has been found` in a second or two and exits 0: 26 distinct states for `AddSheet`, 81 for `SmartAdd`, 130 for `Login`. A broken rule prints `Invariant … is violated` with the steps, and exits 12.

To read a result as a chart or as a path in plain words, use the pstack statechart skill on `models/<Model>.tla` with `models/<Model>.cfg` and the view `models/<Model>.view.mjs`. It is installed per machine and its commands change between releases, so take them from that skill. The views use a learner's words; `Login.view.mjs` lists the steps its chart hides.

## When the check fails

Read the path as a sequence of things a learner and the server do. Then replay it against the real code as a browser test, one action per step. The tests "a sheet dismissed while its card saves stays until the card is in, with nothing to undo" in `components/add-card-sheet.browser.test.tsx`, "Stop in the beat after the scan finishes stays on the lesson" and "Back while an answer is checked…" in `components/smart-add.browser.test.tsx`, and "a sign-in answer that comes back after a switch to Create account stays off that form" in `routes/login.browser.test.tsx` are earlier replays.

- The replay fails: the code has the bug. Report the path in the code's words and fix the code.
- The replay passes: the model is wrong. Find the step that the code does not take, or takes together with another, and correct the model. Do not weaken the rule.

## When you change the covered code

Change the model in the same pull request, so that each step still names one thing the code does in one go. Add a variable when the code gains state a rule depends on, such as a new way to close the sheet or a new late answer in Smart add. Run the check, then move the commit in "What the models cover" to your commit.

## See it fail

Each guard is a constant in its model's `.cfg`. Set it to `FALSE` in a copy of the config and pass the copy as the second argument, such as `check.sh AddSheet /path/to/copy.cfg`:

- `HoldsWhileSaving` in `AddSheet.cfg`: closing while a save is in flight is allowed, as on `main` before pull request 1165. You type, press Add, close the sheet, and the card lands while Undo still offers it.
- `ChecksAttempt` in `SmartAdd.cfg`: the 700 ms beat moves the step after Stop. You press Find terms, the last words come in, you press Stop, and the beat moves you to the questions.
- `ChecksAttempt` in `Login.cfg`: a sign-in refused after a switch to Create account shows its error there.

## What it does not cover

- More than two drafts, reads or submits. A pass says nothing about larger numbers, though no rule has a step that depends on them.
- Undo pressed while a save is in flight, and Create more after an Undo: `AddSheet` takes Undo only from a closed sheet.
- The phone's drawer swipe, which reaches the same `close` but was not checked by gesture.
- What a Smart add read finds, the terms it drops, and the daily lesson limit.
- Google and Apple sign-in, the Mac app's sign-in in the browser, and the confirmation link landing on `/login?verify=1`.

---
name: verify
description: Prove a change to the web product works by driving the running app as a learner and keeping the evidence. Use before calling a product change done, when reviewing a pull request on its app preview, or when asked whether a feature works in the real app. Skip changes with no product effect; the phone app has its own verify-phone skill.
---

# Verify the web product

A change is verified when the feature it touches has been driven in a running product, by its ARIA names, and the stored state agrees with the screen. Typechecks, unit tests and green CI are not this proof, and neither is reading the code. [`local-dev`](../local-dev/SKILL.md) puts the product in a state; this skill runs a feature from the map against it and keeps what happened.

## Pick the features

[`features/`](features) has one entry per learner-facing feature: what it is, how a learner reaches it, how to drive it, the end state that proves it, and its gotchas. Drive every entry the diff can reach. When the diff touches a feature with no entry, write its entry and its `.mjs` recipe in the same pull request.

| Feature | Entry |
| --- | --- |
| Sign in | [sign-in.md](features/sign-in.md) |
| Review | [review.md](features/review.md) |
| The day turns at the end of a review | [day-turns.md](features/day-turns.md) |
| Reveal hint | [reveal-hint.md](features/reveal-hint.md) |
| Furigana | [furigana.md](features/furigana.md) |
| Add a card | [add-card.md](features/add-card.md) |
| Library and the deck page | [deck-page.md](features/deck-page.md) |
| Create a deck | [new-deck.md](features/new-deck.md) |
| Deck settings | [deck-settings.md](features/deck-settings.md) |
| Deck invitation | [deck-invitation.md](features/deck-invitation.md) |
| Import from Anki | [import.md](features/import.md) |
| Import from Pleco | [import-pleco.md](features/import-pleco.md) |
| Import recordings, pitch and translations | [import-recordings.md](features/import-recordings.md) |
| Import an HSK-shaped Chinese Anki deck | [import-chinese.md](features/import-chinese.md) |
| Offline writes | [offline-writes.md](features/offline-writes.md) |
| Japanese cards | [japanese.md](features/japanese.md) |
| Chinese cards | [chinese.md](features/chinese.md) |
| Cantonese cards | [cantonese.md](features/cantonese.md) |
| Korean cards | [korean.md](features/korean.md) |
| Filipino, Vietnamese, Georgian, Armenian and Tamil | [configured-languages.md](features/configured-languages.md) |
| Russian cards | [russian.md](features/russian.md) |
| Ukrainian cards | [ukrainian.md](features/ukrainian.md) |
| Tamil cards | [tamil.md](features/tamil.md) |
| Right-to-left cards: Arabic direction, mixed runs, inputs and isolated toasts | [right-to-left.md](features/right-to-left.md) |
| Example audio | [example-audio.md](features/example-audio.md) |
| Example translation | [example-translation.md](features/example-translation.md) |
| Rest day | [rest-day.md](features/rest-day.md) |
| First run | [first-run.md](features/first-run.md) |
| First run for a Japanese beginner | [first-run-japanese.md](features/first-run-japanese.md) |
| First run for a Chinese beginner | [first-run-chinese.md](features/first-run-chinese.md) |
| First run for a Ukrainian beginner | [first-run-ukrainian.md](features/first-run-ukrainian.md) |
| AI services | [ai-services.md](features/ai-services.md) |

## Launch

On the desktop app, start the `lymi` launch configuration with the Browser pane and use the port it reports. Anywhere else, such as a cloud session, run `node .agents/skills/verify/scripts/server.mjs start`: from a fresh clone after `pnpm install` it writes `apps/web/.dev.vars` from the example when there is none, migrates the local D1 (rebuilding it with `pnpm local db:fresh` when a migration fails), starts the product on 5241 or the next free port, and prints the origin once `/api/health` answers. The first page after a cold start waits while Vite bundles the dependencies, and each route compiles on its first visit; the runner allows the first page 90 seconds and every later action and assertion 15.

Each recipe signs in through `/api/dev/sign-in?as=<persona>&reset=1`, so it starts from the persona's own data whatever ran before. Personas are in [Become a persona](../../../docs/local-dev.md#become-a-persona).

## Doctor

```bash
node .agents/skills/verify/scripts/doctor.mjs --url http://localhost:5241 --persona learner
```

One read-only check that the instance is worth driving. `/api/health` must name `lymi-product` and serve the commit under test. A local server carries no version tag, so the doctor finds the process listening on the port and requires it to run from this worktree at `--sha`, which defaults to `HEAD`. A pull request's app preview carries no tag either: pass `--version` with the Worker version its app preview job uploaded for the head commit, and the doctor requires `/api/health` to report that version. `/api/dev/state` must report the expected persona; the runner calls the doctor with its own session after signing in and stops before driving when any check fails. Run alone, the doctor reads the persona only with `--session`, a Playwright storage state, and otherwise checks health and commit, which is enough to tell whether a failing recipe met the wrong server.

## Drive

```bash
node .agents/skills/verify/scripts/run.mjs review add-card --pr <n>
```

The runner opens Chromium at 1280 px with a pointer, or at 393 px with touch under `--phone`, with reduced motion. For each feature it signs in, runs the doctor, then the feature's recipe in `features/<feature>.mjs`, which drives by role and accessible name, never by CSS or test id. Add `--url` for another origin; a pull request's app preview also takes `--entry`, its preview link, which the runner opens first for the preview cookie, and `--version`. A recipe's `step(action, run)` takes one learner action and its check; write a new one the same way and keep each step to what a learner does.

## Evidence

Every step leaves three files: the screenshot, the ARIA snapshot of `main`, and a second read of stored state, which is `/api/dev/state` plus whatever the step read from the product API to prove its end state. `verdict.md` beside them lists the doctor's result, each step as ok or FAIL with the error, and every console error and 5xx response. A run on a page that logs errors is not a clean pass even when every step is ok; say what they were.

Evidence goes to `/mnt/project-files/evidence/pr-<n>/<feature>-<where>[-phone]-<sha>/` when the project folder exists, else to the temp directory, so it outlives the worktree and the server. Name the folder in the pull request's Verification section and attach the screenshots a reviewer needs. Persona data is local and seeded, so the files carry no private content; never drive a real account to produce them.

## Cleanup

The runner closes the browser it opened. Stop the server with `node .agents/skills/verify/scripts/server.mjs stop`, which ends only the process group `start` recorded; a server another worktree or the launch configuration started stays up. Keep the evidence. A failing step is a finding to report or fix, never a reason to delete its files.

## Review a pull request

CI gives every product pull request its live verdict on the app preview, so a reviewer reads that verdict instead of producing one. Green CI elsewhere is not a verdict, and neither is the author's run.

1. The **plan** job picks the features the diff reaches with [`scripts/verify-impact.mjs`](../../../scripts/verify-impact.mjs), whose table names the paths each feature reaches. A path the shell, the runner or shared configuration owns reaches every feature, and a product path no row claims drives `review`, `add-card` and `deck-page` and is named in the verdict. A new recipe needs its row there, which its test enforces. A pull request that reaches no feature gets no run, and the plan's summary says why.
2. Once the head commit's **app preview** is up, **verify on app preview** drives those features on it, retries a failing feature once, and uploads `verify-evidence-pr-<n>-<sha>`: every feature's screenshots, ARIA snapshots, stored state and `verdict.md`, with a retry's files under `retry/`.
3. **verify verdict** keeps one comment on the pull request, edited by every push: **PASS** when every step passed with no console error or 5xx, **PASS+NOTES** when it passed but a feature logged one or passed only on retry, and **FAIL** naming the failing step and its error. It names the head commit, the features and the evidence download.

A FAIL is a finding to fix before merging, unless the same step fails on `main`: drive it there in a local worktree with `server.mjs start` to tell, and report a failure on both as a finding about `main`. A push that changes the patch voids the verdict until the new run's comment replaces it. Drive by hand only to reproduce a failure or for a feature the plan missed: `run.mjs <features> --url <preview origin> --entry <preview link> --version <id> --sha <head> --pr <n>`, with the link from the pull request's `app-preview` deployment and the version its **app preview** job logs as `PREVIEW_VERSION_ID`. A cloud session needs network access to `workers.dev` to reach a preview.

Every run resets the preview's personas. CI drives a preview only right after the push that rebuilt it, inside the pull request's CI concurrency group, so two runs never overlap and a newer push cancels the older one. While it drives, the verdict comment reads **running**: wait for its verdict before trying the preview by hand, and never drive a preview by hand while it reads so. A run ends by reseeding `learner`, the persona the preview link opens, so whoever opens it next starts from seeded data.

The preview link carries a key. CI reads it from the deployment, masks it before printing anything, keeps it in a file rather than any step's environment, and uploads no evidence that holds it; the runner drops query strings from every URL it writes. Never paste the link into a comment. Phone pull requests get a run on the Mac or a verdict saying they were not driven.

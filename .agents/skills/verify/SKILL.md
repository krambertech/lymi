---
name: verify
description: Prove a change to the web product works by driving the running app as a learner and keeping the evidence. Use before calling a product change done, when reviewing a pull request on its app preview, or when asked whether a feature works in the real app. Skip changes with no product effect; the phone app is not covered here.
---

# Verify the web product

A change is verified when the feature it touches has been driven in a running product, by its ARIA names, and the stored state agrees with the screen. Typechecks, unit tests and green CI are not this proof, and neither is reading the code. [`local-dev`](../local-dev/SKILL.md) puts the product in a state; this skill runs a feature from the map against it and keeps what happened.

## Pick the features

[`features/`](features) has one entry per learner-facing feature: what it is, how a learner reaches it, how to drive it, the end state that proves it, and its gotchas. Drive every entry the diff can reach. When the diff touches a feature with no entry, write its entry and its `.mjs` recipe in the same pull request.

| Feature | Entry |
| --- | --- |
| Review | [review.md](features/review.md) |
| Add a card | [add-card.md](features/add-card.md) |
| Library and the deck page | [deck-page.md](features/deck-page.md) |
| Import from Anki | [import.md](features/import.md) |
| Offline writes | [offline-writes.md](features/offline-writes.md) |

## Launch

On the desktop app, start the `lymi` launch configuration with the Browser pane and use the port it reports. Anywhere else, such as a cloud session, run `node .agents/skills/verify/scripts/server.mjs start`: from a fresh clone after `pnpm install` it writes `apps/web/.dev.vars` from the example when there is none, migrates the local D1 (rebuilding it with `pnpm local db:fresh` when a migration fails), starts the product on 5241 or the next free port, and prints the origin once `/api/health` answers. The first page after a cold start waits while Vite bundles the dependencies; the runner allows it 90 seconds.

Each recipe signs in through `/api/dev/sign-in?as=<persona>&reset=1`, so it starts from the persona's own data whatever ran before. Personas are in [Become a persona](../../../docs/local-dev.md#become-a-persona).

## Doctor

```bash
node .agents/skills/verify/scripts/doctor.mjs --url http://localhost:5241 --persona learner
```

One read-only check that the instance is worth driving. `/api/health` must name `lymi-product`. Its version tag must be this worktree's `HEAD`, or GitHub's merge of `HEAD` into `main`, which is what a pull request's app preview is tagged with; a local server carries no tag, so the doctor instead finds the process listening on the port and requires it to run from this worktree. `/api/dev/state` must report the expected persona; the runner calls the doctor with its own session after signing in and stops before driving when any check fails. Run alone, the doctor reads the persona only with `--session`, a Playwright storage state, and otherwise checks health and commit, which is enough to tell whether a failing recipe met the wrong server.

## Drive

```bash
node .agents/skills/verify/scripts/run.mjs review add-card --pr <n>
```

The runner opens Chromium at 1280 px with a pointer, or at 393 px with touch under `--phone`, with reduced motion. For each feature it signs in, runs the doctor, then the feature's recipe in `features/<feature>.mjs`, which drives by role and accessible name, never by CSS or test id. Add `--url` for another origin, and for a pull request's app preview add `--entry` with the preview link from the pull request's deployment, which the runner opens first for the preview cookie. A recipe's `step(action, run)` takes one learner action and its check; write a new one the same way and keep each step to what a learner does.

## Evidence

Every step leaves three files: the screenshot, the ARIA snapshot of `main`, and a second read of stored state, which is `/api/dev/state` plus whatever the step read from the product API to prove its end state. `verdict.md` beside them lists the doctor's result, each step as ok or FAIL with the error, and every console error and 5xx response. A run on a page that logs errors is not a clean pass even when every step is ok; say what they were.

Evidence goes to `/mnt/project-files/evidence/pr-<n>/<feature>-<where>[-phone]-<sha>/` when the project folder exists, else to the temp directory, so it outlives the worktree and the server. Name the folder in the pull request's Verification section and attach the screenshots a reviewer needs. Persona data is local and seeded, so the files carry no private content; never drive a real account to produce them.

## Cleanup

The runner closes the browser it opened. Stop the server with `node .agents/skills/verify/scripts/server.mjs stop`, which ends only the process group `start` recorded; a server another worktree or the launch configuration started stays up. Keep the evidence. A failing step is a finding to report or fix, never a reason to delete its files.

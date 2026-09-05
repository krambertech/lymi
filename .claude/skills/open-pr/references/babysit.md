# Babysitting an open PR

Start this as soon as the PR is open. The watch is a default part of open-pr, not an opt-in: tell the user you are watching, then run until the PR reaches a terminal state or the user says stop.

## What watching means

Poll the PR and surface anything that needs the author's attention:

1. **CI status.** [`.github/workflows/ci.yml`](../../../../.github/workflows/ci.yml) runs `pnpm check`, `pnpm typecheck`, and `pnpm test` on every pull request.
   ```bash
   gh pr checks <number>
   gh pr view <number> --json statusCheckRollup
   ```
   On failure, pull the failing job's log, summarize the root cause, and fix it on the branch. Budget three fix attempts: a third miss, or the same failure twice in a row, goes to the user instead of another push. Surface it directly when the fix needs a decision.

2. **Review comments** — human and bot (CodeRabbit, if it is installed on the repo).
   ```bash
   gh pr view <number> --comments
   gh api repos/krambertech/lymi/pulls/<number>/comments   # inline review comments
   ```
   Summarize what each reviewer asks for. Group nitpicks apart from substantive asks.

3. **Mergeability** — conflicts with `main`, stale branch.
   ```bash
   gh pr view <number> --json mergeable,mergeStateStatus
   ```
   On a conflict, run `/sync-with-main`.

CI catches the same three commands Step 2 of the skill already ran, so a red check on a PR you opened means something changed after you ran them — a merge with `main`, or a push you did not verify. Re-run them locally before pushing a fix, and say the result in the same message as the push.

## Cadence

Use the `/loop` skill for the polling interval. This is a solo repo, so review comments arrive in bursts rather than continuously: every few minutes right after opening, then back off to a slow heartbeat. Let the user set the pace if they state one.

## Responding to comments

- Post as "Kateryna's Claude". Never post as the human.
- Factual notes post directly: "Fixed in `<sha>`", "Intentional because X, see line Y".
- Substantive replies (arguments, design pushback, commitments) get drafted in chat and posted only after the user approves.
- Decline nitpicks that contradict the conventions in `AGENTS.md` — a bot asking for `type` where the repo uses `interface Props`, for instance. Say so politely, signed as the agent.

## Terminal states

- Merged: report it, stop the loop. If the PR carried a migration, remind the user that `pnpm db:migrate:prod` and `pnpm deploy` are theirs to run.
- Closed without merge: report it, stop.
- A failure that needs a decision: surface it, pause the loop, wait for the user.

## Never

- Never `gh pr merge`. Merging is the user's call.
- Never approve your own PR.
- Never `pnpm deploy` or `db:migrate:prod`.

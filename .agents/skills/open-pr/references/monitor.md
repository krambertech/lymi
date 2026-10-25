# Supervise an open PR

Supervise the first automated pipeline until the PR is review-ready; the human merge after it is outside this workflow.

## Observe

- Watch required checks until each one passes or fails. Use the runtime's own PR monitor when it has one (in the Claude desktop app, the `ccd_pr` tools); otherwise run `gh pr checks <number> --watch --required`. A pending check is not success.
- After each push, restart the watch for the new head commit.
- When checks settle, inspect mergeability and initial bot or automated-review feedback, including inline comments.

## Respond

- When the branch caused a failure and the correction is mechanical and within scope, inspect the logs, fix it, rerun the relevant focused check and `pnpm verify:changed`, push, and resume watching.
- Stop as blocked when a correction needs a product decision or new authorization, the failure is unrelated infrastructure, or the same attempted correction fails again.
- Resolve conflicts through the `sync-with-main` workflow, preserving its recovery rules.
- Address factual, in-scope automated feedback and reverify the change. Summarize substantive or scope-changing feedback for the user instead of deciding it silently.
- Do not approve the PR or speak as the user.

## Finish

Report **review-ready** only when the PR meets [the definition in SKILL.md](../SKILL.md). Review-ready is not mergeable: a product change also needs a live verdict of PASS or PASS+NOTES against its head SHA ([verify](../../verify/SKILL.md#review-a-pull-request)), and a push that changes the patch needs a new one. Include the PR URL, head commit, checks, and any non-blocking feedback or residual uncertainty.

Report **blocked** with the exact failing state and the decision, permission, or external change needed. If the runtime cannot keep observing a pending check, say so; a pending check is never ready.

Later human feedback is outside this workflow. Keep monitoring past review-ready only when the user asks for an ongoing watch, using the runtime's background mechanism. Stop as soon as the PR is merged or closed, or the user asks you to stop.

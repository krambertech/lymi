# Supervise an open PR

The goal is to supervise the initial automated pipeline until the PR is review-ready, not to wait indefinitely for a human merge.

## Observe

- Use the runtime's wait or monitoring capability to watch required checks to a terminal result. A pending check is not success.
- After each push, restart the watch for the new head commit.
- When checks settle, inspect mergeability and initial bot or automated-review feedback, including inline comments.

## Respond

- When the branch caused a failure and the correction is mechanical and within scope, inspect the logs, fix it, rerun the relevant focused check and `pnpm verify:changed`, push, and resume watching.
- Stop as blocked when a correction needs a product decision or new authorization, the failure is unrelated infrastructure, or the same attempted correction fails again.
- Resolve conflicts through the `sync-with-main` workflow, preserving its recovery rules.
- Address factual, in-scope automated feedback and reverify the change. Summarize substantive or scope-changing feedback for the user instead of deciding it silently.
- Do not approve the PR or speak as the user.

## Finish

Report **review-ready** only when required checks pass, the branch is mergeable, and no blocking automated feedback remains. Include the PR URL, head commit, checks, and any non-blocking feedback or residual uncertainty.

Report **blocked** with the exact failing state and the decision, permission, or external change needed. If the runtime cannot continue observing a pending check, say so explicitly rather than calling the PR ready.

Later human feedback is outside the opening workflow. Continue monitoring beyond review-ready only when the user requests an ongoing watch using the runtime's supported background mechanism. Stop immediately if the PR is merged, closed, or the user asks to stop.

# Supervise an open PR

Supervise the first automated pipeline until the PR is [review-ready](../SKILL.md). Later human feedback is outside this workflow unless the user asks you to continue.

## Observe

- Use one watcher per PR: the runtime's PR monitor when available, otherwise `gh pr checks <number> --watch --required`. A required-check watcher does not establish that review bots have finished; inspect their checks and review threads separately. Wait for configured blocking reviews on the current head; advisory reviews do not gate readiness.
- After each push, observe the new head. Match check results and automated reviews to that SHA; inspect unresolved older findings too when they still apply to the current code.
- A wake-up or green check is a reason to reassess the gate, not evidence that the whole PR is ready. If the observation mechanism cannot continue, report the missing capability and current state.

## Respond

- Verify each finding against the current source. For a factual, in-scope defect or branch-caused CI failure, make the smallest correction and rerun covering checks and `pnpm verify:changed`. Before pushing, recheck material behavior changes through [the bounded review](review.md); then push and resume watching.
- Preserve the review budget across pushes; CI feedback does not start an unlimited new review loop. Stop as blocked when a correction needs a product decision or new authorization, an external failure prevents progress, the same attempted correction fails again, or substantive disagreement remains at the budget limit.
- Resolve conflicts through [sync-with-main](../../sync-with-main/SKILL.md), preserving its recovery rules. If new base-branch work supersedes the goal or changes the correct implementation, report it instead of automatically widening the change or closing the PR.
- Handle automatic agent replies and permission-gated human replies under [the comment rules](../SKILL.md#leave-pr-comments). Lack of permission for a human reply does not prevent authorized fixes; report any unresolved thread that still blocks readiness. Never approve the PR on the user's behalf.

## Finish

Before handoff, fetch the intended base and reread the live PR's head, base, state, mergeability, required checks, screenshots and review findings. If base changes invalidate the proof, sync and reverify. If the PR merged or closed elsewhere, report its actual state and stop.

For product changes, require the independent live verdict specified by [verify](../../verify/SKILL.md#review-a-pull-request). A patch-changing push invalidates the old verdict; wait for the new head's app preview and a fresh verdict. Record phone verification as [verify-phone](../../verify-phone/SKILL.md) requires. Do not claim a live verdict from a pre-PR code review or the author's own run.

Report **review-ready** only when [the full gate](../SKILL.md) passes. Include the PR URL, final head, evidence, independent-review outcome, non-blocking findings and any human approval still required. Report **blocked** with the failing state and the decision, permission or external change needed. Keep unresolved disagreement visible; a pending check or missing review never becomes approval by waiting long enough.

Stop the active watch at handoff or when the PR merges, closes or the user asks you to stop. Keep an ongoing background watch only when requested, using the runtime's background mechanism. Stay quiet while an event requires no action.

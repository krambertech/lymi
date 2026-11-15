# Bounded independent review

Review the scoped change before publishing it. This code review complements the product's independent live review on the app preview; neither replaces the other.

Use one available reviewer in a separate subagent or supported review session, with the configured model unless the user names one. Keep it read-only: no edits, commits, pushes, PR comments or nested reviewers. If no independent reviewer is available, report the missing capability rather than relabeling self-review as independent.

Give the reviewer the repository path, intended outcome, base SHA, exact diff and untracked paths, checks already run and known failures. Ask it to inspect surrounding code and callers for concrete regressions, missing requirements and unnecessary scope. Keep the reviewed snapshot unchanged while it runs.

Use at most three rounds by default. The first reviews the full scoped diff; later rounds inspect only changed code and unresolved findings. Extend the budget only at the user's request. Another review is needed after a behavior fix or meaningful conflict resolution, but wording, formatting and declined nits alone do not need a fresh round.

Track each substantive finding with a stable ID, consequence, evidence and outcome: fixed, declined with a reason, or still open. Judge severity by impact and reachability; low frequency alone does not make a security, privacy or data-loss problem minor. Verify findings yourself, make the smallest justified fix and rerun covering checks. Decline speculative or unrelated changes with evidence instead of expanding the PR to obtain agreement.

Stop when the current diff has no blocking finding and the reviewer has checked any material fixes. If a substantive disagreement survives two exchanges, or the budget ends with a blocker, report both positions and the evidence. A timeout, missing response or exhausted budget is not approval.

Record the reviewer or harness, rounds, verdict and any substantive disagreement under the existing Verification section. Use only reported model identities and usage; omit scores and guessed metadata. After later CI or bot fixes, review material changes within the remaining budget; if it is exhausted, hand off the outstanding review explicitly.

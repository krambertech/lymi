---
name: open-pr
description: Open or update a Lymi pull request and supervise it until it is review-ready. Use when the user asks to create or open a PR, push a completed change for review, or handle CI and review feedback on an existing PR.
---

# Open a pull request

Own the requested change through verification, filing and the first automated review pipeline. Opening the PR is the midpoint, not completion.

**Review-ready** means the intended diff is isolated, required checks pass and configured blocking automated reviews finish on the current head, the branch has no merge conflicts, required screenshots are attached, and no blocking review finding remains. A product change also needs an independent live verdict under [verify](../verify/SKILL.md#review-a-pull-request); the author's local run does not replace it. Name outstanding human approvals separately. Review-ready does not authorize merging.

[`docs/git-workflow.md`](../../../docs/git-workflow.md) owns branches, commits, titles and PR descriptions. An open-PR request authorizes committing the intended change, pushing its branch, creating or updating the PR, and replying to verified agents under [the comment rules](#leave-pr-comments). It does not authorize replies to humans, unsolicited new comment threads, approving or merging, enabling auto-merge, closing another PR, deploying, or migrating production data.

## Resolve the scope

- Fetch `origin`, then inspect the branch, upstream, working tree, commits, and diff against the intended base. Use `origin/main` unless the user named another base or the branch belongs to a native stack.
- Preserve unrelated work and isolate the intended change on a focused branch. Include uncommitted changes that clearly belong to the request; ask only when ownership is ambiguous.
- Update the existing PR for the branch instead of creating a duplicate. When continuing another contributor's work, preserve authorship and co-author credit.
- For old or inherited work, compare the goal and implementation with the freshly fetched base and related PRs. If the problem is already solved or the approach no longer fits, report the evidence and proposed disposition instead of mechanically rebasing, closing the PR or starting an unrequested rewrite.
- Move a branch based on the history from before 2026-09-06 as [the Git workflow's migration section](../../../docs/git-workflow.md#branches-from-before-the-history-migration) says.
- Base a new PR on `main` unless the change needs another open PR. For that dependency, use `gh stack` and [the native-stack workflow](../../../docs/git-workflow.md#stack-pull-requests-that-depend-on-each-other); never construct a stack by passing another branch to `gh pr create --base`.

Continue only when the intended diff and base are understood and the work still serves the requested goal.

## Prepare the change

- Review the complete diff against the request and repository invariants. Remove scope creep, debug remnants and accidental generated changes.
- Select the applicable rows from [review coverage](../../../docs/testing.md#review-coverage). For rendered UI changes, use [review-ui](../review-ui/SKILL.md) for its coverage and interaction checks; reuse feature-verification evidence where it covers the same state. An ordinary PR does not need a whole-app release sweep.
- Gather [the proof this kind of change needs](../../../AGENTS.md#before-you-push). Run `pnpm verify:changed` and the focused, E2E, visual, migration or integration checks required by the change; fix failures the branch caused.
- For a product change, drive every affected feature with [verify](../verify/SKILL.md) and name the evidence folder. This is the author's run; independent live review follows on the PR's app preview. Use [verify-phone](../verify-phone/SKILL.md) for phone behavior.
- For behavior changes, use [the bounded independent code review](references/review.md) after local checks pass. Use it for documentation or generated-only changes when requested or when they change an operational or safety contract; otherwise a self-review is sufficient.
- Derive the title from the final change and write the body to [the PR-description rules](../../../docs/git-workflow.md#write-the-pull-request-description). Copy [the template](../../../.github/pull_request_template.md) to a temporary file, fill it, and remove guidance comments and unused optional sections.
- For rendered UI changes, capture and attach screenshots using [the visual-evidence workflow](references/screenshots.md). An image visible only in the conversation is not attached to the PR.

Continue only when the final diff is reviewable, required local checks pass and blocking findings are resolved. Unavailable required checks or review are blockers; report what is missing instead of calling the change verified.

## Open or update the PR

- Commit the intended change and push its branch, then create or update the PR from the filled template. For a native stack, use `gh stack submit`, then set the title and body with `gh pr edit`.
- Attach required images, then read the live PR back and confirm its base, head SHA, title, body, complete diff, image references and URL. Attach the PR to the chat when the runtime supports it.
- If capture or attachment fails, retain the files and report the exact failure; the PR remains blocked.

## Leave PR comments

Automatically reply to comments by other verified agents or bots on the PR being handled when a finding or question needs a response. Verify the target comment's author using GitHub bot/app metadata or an established agent-attribution convention; writing style alone is not evidence, and a human quoting an agent is still a human comment. Replies to humans, uncertain authors and unsolicited new comment threads require explicit, separate permission. Without it, continue authorized fixes and include the proposed response in the handoff.

Make at most two automatic replies per finding across pushes and related threads. If the disagreement remains, stop replying and hand both positions and their evidence to the user; a new push or thread does not reset the count.

Automatically resolve only agent-only threads whose findings were fixed and whose required replies are confirmed posted. Leave declined findings open with the reason and evidence for human disposition, and summarize substantive disagreements in the PR's Verification section. A human-authored comment in a thread requires separate permission to resolve that thread, even when its original author was a bot. Automatic reply permission does not authorize dismissing a human review or approving the PR.

For an authorized comment, lead with the defect or conclusion, cite the relevant code, check or reproduction, and give the smallest useful fix or reason for disagreement. Keep one actionable issue per inline comment and shared context in one top-level reply. Distinguish verified facts from judgment; skip filler, repeated status updates and rubber-stamp approvals.

Identify an agent-authored reply as responding on the user's behalf, using the verified model name or harness rather than guessing. Keep that attribution out of PR descriptions and preserve text the user explicitly asked to post verbatim. Check the complete comment, quotes and attachments for private content or secrets; read the posted reply back and record its URL.

## Supervise and hand off

After filing, follow [the monitoring workflow](references/monitor.md) after every push. Recheck fixes and meaningful conflict resolutions; proof and reviews must cover the final diff.

Finish as **review-ready**, with the PR URL, final head, verification evidence, independent-review outcome and any remaining human approval; or **blocked**, with the exact failing state, unresolved disagreement or permission needed. Pending required checks are neither success nor a reason to silently stop. An unavailable observation mechanism is a blocker to report. If the PR merges or closes elsewhere, report its actual state and stop.

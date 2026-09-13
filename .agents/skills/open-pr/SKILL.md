---
name: open-pr
description: Open or update a Lymi pull request and supervise it until it is review-ready. Use when the user asks to create or open a PR, or push a completed change for review.
---

# Open a pull request

Turn the intended local change into a review-ready pull request. Opening the PR is the midpoint, not completion.

Review-ready means the PR contains only the intended diff, required checks pass, the branch is mergeable, and no blocking automated feedback remains. Follow [`AGENTS.md`](../../../AGENTS.md) and [`docs/git-workflow.md`](../../../docs/git-workflow.md). Opening a PR does not authorize merging, deploying, or migrating production data.

## Resolve the scope

- Fetch `origin`, then inspect the branch, upstream, working tree, commits, and diff against `origin/main`.
- Preserve unrelated work and isolate the intended change on a focused branch. Include uncommitted changes that clearly belong to the requested PR; ask only when ownership is ambiguous.
- Update the existing PR for the branch when one exists instead of creating a duplicate.
- Follow the repository's recovery workflow for branches based on the pre-migration history.

Continue only when the intended PR diff is isolated and understood.

## Prepare the change

- Review the complete diff against the request and repository invariants. Remove scope creep, debug remnants, and accidental generated changes.
- Run `pnpm verify` plus any focused, E2E, visual, migration, or integration verification required by the change. Fix failures before opening the PR.
- Derive a Conventional Commit title from the actual change and the Git workflow.
- Copy [the pull request template](../../../.github/pull_request_template.md) to a temporary file, fill it, remove every guidance comment and unused optional section, and preserve its headings and order. Do not compose a parallel body from memory.
- For any rendered UI change, capture and attach visual evidence by following [the screenshot guidance](references/screenshots.md). A browser screenshot visible only in the agent conversation is not attached evidence.

Continue only when the final diff is reviewable and every available required local check passes. Report unavailable or intentionally skipped checks honestly.

## Open or update the PR

- Commit the intended change, push its branch, then create or update the PR against `main` from the filled template.
- Attach every required image in the same operation when possible, then read the PR back and confirm its base, title, body, displayed diff, uploaded image references, and URL.
- If a required screenshot cannot be saved or attached, keep the PR in the **blocked** state, hand the files or exact failure to the user, and say that the visual evidence is not attached.

## Supervise the PR

Follow [the monitoring workflow](references/monitor.md) immediately after opening or updating the PR. Remain active while required checks are pending. Do not report completion merely because the PR exists.

Finish in exactly one state: **review-ready**, with the PR URL and verification evidence; or **blocked**, with the failing check, unresolved feedback, conflict, or permission needed. A pending required check is neither state.

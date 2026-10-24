---
name: review-pr
description: Review a Lymi pull request or branch diff against REVIEW.md, AGENTS.md and CONTEXT.md, confirm every finding with a validator before reporting it, and say when a human should look. Use when asked to review a pull request, when the `/review` comment runs in CI, or before merging a branch. Rendered UI evidence belongs to the review-ui skill.
---

# Review a pull request

Produce one review of the change at one head commit. A review is read-only: it never edits files, pushes, approves or merges.

## Resolve the target

- For a pull request, read `gh pr view <number> --json number,title,body,headRefOid,baseRefName,files,closingIssuesReferences` and `gh pr diff <number>`. For a local branch, use `git diff origin/main...HEAD`. Record the head commit; the review is about that commit only. In CI the prompt gives the head commit and its checkout: review that commit even if a push lands meanwhile, taking the diff from `git -C pr diff origin/main...HEAD`.
- Read the linked issue when there is one: it is the intended behaviour.
- When this pull request already has a review from you (a comment by `github-actions[bot]` that starts with `**Claude review**`), read it and the commits since its head. Each earlier finding is now fixed, still open, or answered by a reply that settles it; report that, and raise nothing again that a reply already settled.

## Ground the review

Read [`REVIEW.md`](../../../REVIEW.md) and [`AGENTS.md`](../../../AGENTS.md) in full. Read [`CONTEXT.md`](../../../CONTEXT.md) when the diff names things or changes learner-facing text. When the diff can change what a learner sees or does, walk the coverage tree in the [review-ui skill](../review-ui/SKILL.md) and list each cell it selects under **Not checked**, because a code review cannot observe a rendered cell. Read the system file in `docs/design/system` for any component the diff changes.

## Review the changed lines

A finding sits on a line the diff adds or changes, or is a direct consequence of one, such as a caller the change breaks. Read the surrounding code and the callers to understand a line, not to review them. A problem on an untouched line is pre-existing and is not a finding.

Look for:

- The defects in `REVIEW.md`, and plain bugs with a concrete input that fails.
- **The instrumentation rule** in `AGENTS.md`. For a behaviour change, the description's Instrumentation section states the product question and adds or reuses an event at its owning interaction or committed outcome, with `docs/analytics.md` and the event catalog updated; or it says why no event is needed. Check the producer against `REVIEW.md I1`.
- Docs, comments, specimens and the other client that describe or share the changed behaviour (`REVIEW.md T2`, `P1`).
- Other open pull requests that collide with this one, such as the same migration number (`REVIEW.md D10`).

Write each candidate as: the location (`path:line` at the head commit), the defect, the consequence for the learner or the failing input, the smallest fix, and its source. The source is a `REVIEW.md` entry, a named `AGENTS.md` section, `CONTEXT.md`, a `docs/design/system` file, or "correctness" for a plain bug whose failing input you can name. Drop a candidate with no source and no failing input.

## Validate before reporting

Give each candidate to a separate validator subagent, in parallel. Hand it only the claim, the location, the head commit and the source; not your reasoning. The validator reads the code itself, traces the path from an entry point to the line, and answers **confirmed** with the input or sequence that fails, or **not confirmed** with what stops it. When subagents are unavailable, re-read the code from the entry point for each candidate yourself before deciding.

Keep only confirmed findings. A candidate the validator could not settle without running the app goes under **Not checked**, never under findings. When nothing survives, the review is "All clear".

## Decide when a human should look

Ask for a human when any of these holds, and name which:

- The diff touches a guardrail: `biome.json`, `biome-plugins/`, a `scripts/check-*` file, `.github/workflows/`, `AGENTS.md`'s enforced-rules table, or a lint suppression.
- It adds a migration, changes authentication, sessions, consent, the privacy policy, secrets, or what reaches an AI service.
- It changes a product decision, learner-facing copy whose intent you could not confirm, or pricing and cost.
- A confirmed finding is Critical: data loss, a learner misled, a security hole, or a release that ships broken.

Otherwise say no human look is needed beyond the usual merge.

## Write the review

Rank confirmed findings most severe first. Each one is an inline comment on its line, following `AGENTS.md`'s pull request review comment rules: one issue, the defect first, then the consequence and the smallest fix, in two or three sentences, ending with its source in brackets, such as `[REVIEW.md D1]`.

Then one summary comment. Name each item under Not checked and Human look in a few words, without the reasoning. With no findings, it is one line:

```text
**Claude review** at `<short sha>`: All clear. Not checked: <what>. Human look: <why, or "not needed">.
```

With findings:

```text
**Claude review** at `<short sha>`: <n> findings.

1. **<short defect>** `path:line`. <one sentence of consequence>. [<source>]

Earlier findings: <fixed or still open, one line each; only on a re-run>
Not checked: <coverage cells, behaviour that needs the running app, files skipped>
Human look: <why, or "not needed">
```

In CI, post inline comments with `mcp__github_inline_comment__create_inline_comment`, its `commit_id` set to the head commit, and the summary with `gh pr comment`. A finding whose line is not in the diff goes in the summary only. Locally, print the review and post nothing unless asked.

---
name: create-issues
description: Turn a completed Lymi feature shape into GitHub implementation issues. Use after product decisions are settled and the user asks to create or track the work; skip initial shaping and implementation.
---

# Create issues

Turn a settled feature shape into GitHub work that an implementing agent can pick up without reconstructing the conversation. Follow [`AGENTS.md`](../../../AGENTS.md) for product sources, writing, permissions, and repository hygiene.

## Compile the shape

- Read the completed shape, its owning product documents and decisions, the current code, and existing GitHub issues.
- Return to [`shape-feature`](../shape-feature/SKILL.md) when an unresolved product decision can change the outcome, boundary, or acceptance evidence.
- Separate what is already built from what remains. Merged foundations are context, not open acceptance work.
- Use canonical product vocabulary and link durable decisions instead of duplicating them.

## Choose the issue shape

- One focused pull request: create one ready implementation issue.
- Several independently verifiable slices: use one parent feature issue with one sub-issue per slice.
- Make each sub-issue a tracer bullet: one narrow, complete path through the affected layers, demonstrable on its own and sized for one fresh implementation context.
- Use GitHub's native parent and blocking relationships. Parentage groups the outcome; blockers express execution order.

When the shape does not make the intended issue count clear, show the proposed tree and get approval before publishing it. Do not re-interview settled product behavior.

## Write for implementation

Use the smallest set of sections that preserves the contract:

- **Outcome:** the observable learner result.
- **Scope:** the behavior this issue delivers, including settled interaction and authorization rules.
- **Acceptance criteria:** checkable external postconditions.
- **Constraints:** product invariants, accepted decisions, privacy or migration risks, and owning documents.
- **Out of scope:** tempting adjacent work that would expand the issue.
- **Verification:** the highest useful seams and the states, browsers, or boundaries that must be observed.

For a parent issue, add a short **Delivery slices** section. For a sub-issue, use native parentage and blockers. Keep code snippets, file inventories, speculative implementation steps, and test-count promises out of issue bodies because they become stale.

## Publish

- Search open and closed issues for duplicates before creating anything.
- Resolve the exact title, body, issue count, parentage, blockers, and existing labels before the first write.
- Treat a draft request as draft-only. Treat explicit creation permission as scoped to the named repository and approved issue set; ask before adding unapproved issues, labels, projects, milestones, assignees, or edits to existing issues.
- Use existing labels only. Apply `enhancement` when it exists and no more specific approved label applies.
- Create blockers first, then their dependants. Use `gh issue create --parent` for sub-issues and `--blocked-by` for dependencies when supported.
- Read every created issue back. Confirm title, body, labels, parentage, and blockers, then return the URLs and identify the frontier issue that can start now.

Completion means the tracker matches the approved shape and another agent can determine the outcome, boundaries, acceptance evidence, and starting issue without this conversation.

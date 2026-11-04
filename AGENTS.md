# Lymi - working agreements

Lymi is a flashcard app for learning any subject with spaced repetition. Read [CONTEXT.md](CONTEXT.md) before naming anything: an individual item is a “card”, reversible removal is “archive”, and AI “enriches” missing fields.

## Start here

Fetch the remote default branch before inspecting or changing code. Use the fresh ref unless the task explicitly targets another branch, pull request or local changes. Preserve dirty and divergent checkouts; inspect the ref directly or use an isolated worktree. Report a failed fetch instead of presenting stale state as current.

**Before writing or reviewing code, read [CODING_STANDARDS.md](CODING_STANDARDS.md)**, then the guide for its area: [apps/web/AGENTS.md](apps/web/AGENTS.md) for the web client and backend, [apps/mobile/AGENTS.md](apps/mobile/AGENTS.md) for the phone, [apps/desktop/README.md](apps/desktop/README.md) for the Mac app.

Fix confirmed defects with the smallest correct change; check review findings against the source and push back with evidence when they are wrong. Report a disagreement that remains; silence or an exhausted review budget is not approval.

Posting in Slack, email, GitHub comments or discussions on the user's behalf requires explicit, separate permission, except repository friction reports, verify verdicts and proof on a pull request, and replies to verified agent or bot comments within [the open-PR workflow](.agents/skills/open-pr/SKILL.md#leave-pr-comments). Opening a PR does not authorize merging it. The user runs production deployments and migrations: `pnpm deploy`, `deploy:site`, `deploy:product` and `db:migrate:prod`. Keep `.dev.vars` and its real secrets git-ignored.

Report each recurring repository gotcha in [the friction log](docs/guidance.md#report-friction). A proposal in `docs/proposals` never overrides a current document.

## Read for the task

| Before you | Read |
| --- | --- |
| Change what a feature does or which surface owns it | [PRODUCT.md](PRODUCT.md) and the owning document its feature map names; [docs/review.md](docs/review.md) for review, the daily goal or the streak |
| Change UI | [DESIGN.md](DESIGN.md) |
| Choose a library, service or architecture | [docs/stack.md](docs/stack.md) and [the ADRs](docs/adr/README.md) |
| Branch, commit, merge, or write a PR or review comment | [docs/git-workflow.md](docs/git-workflow.md) |
| Choose or run tests, or check CI or a deploy | [docs/testing.md](docs/testing.md) |
| Look up a package, command or generator | [README.md](README.md) |
| Write a doc, guide, skill or proposal | [docs/guidance.md](docs/guidance.md) |

## Before you push

**Instrumentation is part of done.** For each behavior change, state the product question, add or reuse an event at its owning interaction or committed outcome, and document its meaning, allowed properties and producer in [docs/analytics.md](docs/analytics.md).

**Proof matches the change.** Observe the evidence yourself; inherited reports and green mocked tests do not establish runtime behavior. A logic fix needs a regression test that fails on `main` and passes with the fix. A UI change needs a [verify](.agents/skills/verify/SKILL.md) run and [screenshots](.agents/skills/open-pr/references/screenshots.md); the phone uses [verify-phone](.agents/skills/verify-phone/SKILL.md). A server fix also needs a request and response showing the corrected behavior.

Update the document that owns any behavior you change.

Run `pnpm verify:changed`, and for a production-affecting change the deployment and browser checks in [What runs when](docs/testing.md#what-runs-when).

When a change is ready, open or update its PR with [the open-pr skill](.agents/skills/open-pr/SKILL.md) and post its proof there, without asking first. Record a judgement call in the PR rather than waiting for an answer.

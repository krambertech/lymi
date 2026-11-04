# Lymi - working agreements

Lymi is a flashcard app for learning any subject with spaced repetition. Read [CONTEXT.md](CONTEXT.md) before naming anything: an individual item is a “card”, reversible removal is “archive”, and AI “enriches” missing fields.

## Start here

Fetch the remote default branch before inspecting or changing code. Use the fresh ref unless the task explicitly targets another branch, pull request or local changes. Preserve dirty and divergent checkouts; inspect the ref directly or use an isolated worktree. Report a failed fetch instead of presenting stale state as current.

Fix confirmed defects with the smallest correct change; check review findings against the source and push back with evidence when they are wrong.

Posting in Slack, email, GitHub comments or discussions on the user's behalf requires explicit, separate permission, except repository friction reports, verify verdicts and proof on a pull request, and replies to verified agent or bot comments within [the open-PR workflow](.agents/skills/open-pr/SKILL.md#leave-pr-comments). Opening a PR does not authorize merging it. The user runs production deployments and migrations: `pnpm deploy`, `deploy:site`, `deploy:product` and `db:migrate:prod`. Keep `.dev.vars` and its real secrets git-ignored.

Report a recurring repository gotcha in [the friction log](docs/guidance.md#report-friction) without asking first.

## Read for the task

| When the task touches | Read |
| --- | --- |
| Product scope or which surface owns a job | [PRODUCT.md](PRODUCT.md), including its feature map and owning documents |
| Review, the daily goal or the streak | [docs/review.md](docs/review.md) |
| UI | [DESIGN.md](DESIGN.md); [review-ui](.agents/skills/review-ui/SKILL.md) for review coverage |
| Learner-facing text | [The UX-copy skill](.agents/skills/ux-copy/SKILL.md) |
| The web client or backend | [apps/web/AGENTS.md](apps/web/AGENTS.md) |
| The phone | [apps/mobile/AGENTS.md](apps/mobile/AGENTS.md) |
| The Mac app | [apps/desktop/README.md](apps/desktop/README.md) |
| A different technical shape | [docs/stack.md](docs/stack.md) and [docs/adr](docs/adr/README.md) |
| Branches, commits, merging, or a PR title, description or review comment | [docs/git-workflow.md](docs/git-workflow.md) |
| Running the app locally | [docs/local-dev.md](docs/local-dev.md) |
| Tests, CI, or a deploy and its health | [docs/testing.md](docs/testing.md) |
| Layout, commands or generated files | [README.md](README.md), including its generator table |
| Writing a doc, guide, skill or proposal | [docs/guidance.md](docs/guidance.md) |

A proposal in `docs/proposals` never overrides a current product, design, vocabulary, stack, data-model or ADR source.

## Shared code and conventions

Shared schema, validation and scheduling belong in `packages/core`; API calls, queries, outboxes and the review draw in `packages/client`; tokens, brand geometry and motion in `packages/design`. Each client configures the shared client with its origin, session headers and storage.

Use `interface Props` for React props and `type` for unions and small shapes. API payloads come from Zod schemas in `packages/core/src/types.ts`; parse with the schema and infer its type. Language behavior belongs in `packages/core/src/languages`.

TanStack Query owns reads and caches. Shared API, query and response modules have one file per resource behind a barrel; add a card method to `api/cards.ts`, not the barrel.

English is the source message: `<Trans>` in JSX, `t` from `useLingui()` for attributes and handlers, `msg` for module constants, and `<Plural>` or `plural` for counts. Localize complete sentences; never build one from concatenated fragments or a ternary on `=== 1`. Format dates and numbers with `i18n.date()`, `i18n.number()` or `Intl` with `i18n.locale`. Run `pnpm i18n:extract` after string changes.

Edit a generated file's source and run its generator. Applied migrations are immutable. D1's `lower()` is ASCII-only; server SQL and new migrations must not use it to case-fold. Workers refuses `redirect: "error"` at runtime; reject unwanted redirects with `redirect: "manual"` and a `Location` check.

Source comments explain only a reason, invariant, safety boundary or platform quirk the code cannot express, in one sentence; longer rationale belongs in its owning doc or ADR. Reserve JSDoc for public contracts whose behavior names and types cannot express.

## Before you push

**Instrumentation is part of done.** For each behavior change, state the product question, add or reuse an event at its owning interaction or committed outcome, and document its meaning, allowed properties and producer in [docs/analytics.md](docs/analytics.md).

**Proof matches the change.** Observe the evidence yourself; inherited reports and green mocked tests do not establish runtime behavior. A logic fix needs a regression test that fails on `main` and passes with the fix. A UI change needs a [verify](.agents/skills/verify/SKILL.md) run and [screenshots](.agents/skills/open-pr/references/screenshots.md); the phone uses [verify-phone](.agents/skills/verify-phone/SKILL.md). A server fix also needs a request and response showing the corrected behavior.

Update the document that owns any behavior you change.

Run `pnpm verify:changed` before pushing, and for a production-affecting change the deployment and browser checks in [What runs when](docs/testing.md#what-runs-when).

When a change is ready, open or update its PR with [the open-pr skill](.agents/skills/open-pr/SKILL.md) and post its proof there, without asking first. Record a judgement call in the PR rather than waiting for an answer.

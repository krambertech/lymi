# Lymi - working agreements

Lymi is a flashcard app for learning any subject with spaced repetition. Read [CONTEXT.md](CONTEXT.md) before naming anything: an individual item is a “card”, reversible removal is “archive”, and AI “enriches” missing fields.

## Start here

Fetch the remote default branch before inspecting or changing code. Use the fresh ref unless the task explicitly targets another branch, pull request or local changes. Preserve dirty and divergent checkouts; inspect the ref directly or use an isolated worktree. Report a failed fetch instead of presenting stale state as current.

Fix confirmed defects with the smallest correct change; check review findings against the source and push back with evidence when they are wrong.

Posting in Slack, email, GitHub comments or discussions on the user's behalf requires explicit, separate permission, except repository friction reports, verify verdicts and proof on a pull request, and replies to verified agent or bot comments within [the open-PR workflow](.agents/skills/open-pr/SKILL.md#leave-pr-comments). Opening a PR does not authorize merging it. The user runs production deployments and migrations: `pnpm deploy`, `deploy:site`, `deploy:product` and `db:migrate:prod`. Keep `.dev.vars` and its real secrets git-ignored.

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
| Branches, commits, PR titles or descriptions, merging | [docs/git-workflow.md](docs/git-workflow.md) |
| Running locally or choosing a test | [docs/local-dev.md](docs/local-dev.md) and [docs/testing.md](docs/testing.md) |
| Layout, commands or generated files | [README.md](README.md), including its generator table |

## Shared code and conventions

Shared schema, validation and scheduling belong in `packages/core`; API calls, queries, outboxes and the review draw in `packages/client`; tokens, brand geometry and motion in `packages/design`. Each client configures the shared client with its origin, session headers and storage.

Use `interface Props` for React props and `type` for unions and small shapes. API payloads come from Zod schemas in `packages/core/src/types.ts`; parse with the schema and infer its type. Language behavior belongs in `packages/core/src/languages`.

TanStack Query owns reads and caches. Shared API, query and response modules have one file per resource behind a barrel; add a card method to `api/cards.ts`, not the barrel.

English is the source message: `<Trans>` in JSX, `t` from `useLingui()` for attributes and handlers, `msg` for module constants, and `<Plural>` or `plural` for counts. Localize complete sentences; never build one from concatenated fragments or a ternary on `=== 1`. Format dates and numbers with `i18n.date()`, `i18n.number()` or `Intl` with `i18n.locale`. Run `pnpm i18n:extract` after string changes.

Edit a generated file's source and run its generator. Applied migrations are immutable. D1's `lower()` is ASCII-only; server SQL and new migrations must not use it to case-fold. Workers refuses `redirect: "error"` at runtime; reject unwanted redirects with `redirect: "manual"` and a `Location` check.

## Before you push

**Instrumentation is part of done.** For each behavior change, state the product question, add or reuse an event at its owning interaction or committed outcome, and document its meaning, allowed properties and producer in [docs/analytics.md](docs/analytics.md).

**Proof matches the change.** Observe the evidence yourself; inherited reports and green mocked tests do not establish runtime behavior. A logic fix needs a regression test that fails on `main` and passes with the fix. A UI change needs a [verify](.agents/skills/verify/SKILL.md) run and [screenshots](.agents/skills/open-pr/references/screenshots.md); the phone uses [verify-phone](.agents/skills/verify-phone/SKILL.md). A server fix also needs a request and response showing the corrected behavior.

Run `pnpm verify:changed` before pushing.

For production-affecting changes, also run `pnpm deploy:check` and `pnpm test:e2e:chromium`, or the full `pnpm test:e2e` when WebKit, mobile, PWA, navigation, caching, focus, touch, sheets or dialogs are at risk. Report results separately; Chromium alone is not cross-browser evidence.

When a change is ready, open or update its PR with [the open-pr skill](.agents/skills/open-pr/SKILL.md) and post its proof there, without asking first. Record a judgement call in the PR rather than waiting for an answer.

Before calling production verified, run `pnpm deploy:health` and compare its active tag with the intended commit.

## Write and maintain guidance

State outcomes, constraints, reasons and evidence once, using literal language. Source comments explain only a reason, invariant, safety boundary or platform quirk the code cannot express; keep them to one sentence. Longer rationale belongs in its owning doc or ADR. Reserve JSDoc for public contracts whose behavior names and types cannot express.

Update the owning document. Keep durable behavior and operating instructions there, session history and check results in the PR, brand rationale in `docs/design/system/brand.md`, and active work in issues. Proposals never override current product, design, vocabulary, stack, data-model or ADR sources. Write each paragraph and list item on one source line.

An inline review comment raises one actionable defect, its consequence and the smallest useful fix in two or three sentences. Put shared context in one top-level comment.

Automatically report recurring repository gotchas in the friction log. Search first with `pnpm friction search <words>`, then use `pnpm friction plus <number> --note …` for a match or `pnpm friction file` for a new report, following [the form](.github/DISCUSSION_TEMPLATE/developer-experience.yml). A second occurrence goes through GitHub's “Create issue from discussion” to become a check, hook or guide rule.

# Lymi - working agreements

Lymi is a flashcard app for learning any subject with spaced repetition. [`CONTEXT.md`](CONTEXT.md) defines product terms: use “card” for an individual item, “archive” for reversible removal, and “enrich” for AI filling missing fields. Use “flashcard app” when describing the product category.

## Read first

Fetch the remote default branch before inspecting or changing code. Use the fresh ref for current-state claims unless the task explicitly targets another branch, pull request or local changes. Preserve dirty and divergent checkouts; inspect the ref directly or use an isolated worktree. If the fetch fails, report it rather than treating stale code as current.

| Before you | Read |
| --- | --- |
| Name anything | [`CONTEXT.md`](CONTEXT.md) |
| Decide what to build or where it runs | [`PRODUCT.md`](PRODUCT.md): who it is for, which surface leads which job, and the feature map with each feature's owning document |
| Change review, the daily goal or the streak | [`docs/review.md`](docs/review.md) |
| Write UI | [`DESIGN.md`](DESIGN.md), then the system file in `docs/design/system` for what you are building |
| Propose a different technical shape | [`docs/stack.md`](docs/stack.md), which records technical choices and rejected alternatives, and [`docs/adr`](docs/adr/README.md) |
| Find a folder or a command | [`README.md`](README.md) |

## The repo

`apps/site` deploys the Astro public site and its health-and-redirects Worker. `apps/web` deploys the Vite React product and Hono backend. `apps/mobile` is the React Native phone app. `apps/desktop` is the Electron Mac app, released separately from the Workers ([README](apps/desktop/README.md)).

Shared code belongs in `packages/core` (schema, validation and scheduling), `packages/client` (API client, queries, outboxes and review draw) or `packages/design` (tokens, brand geometry and motion). Each client configures the shared client package with its origin, session headers and storage.

## Testing locally

Start the product with the `lymi` entry in `.claude/launch.json` (port 5241, or a free port when another worktree holds it). To get a signed-in session, navigate the browser to `/api/dev/sign-in?as=learner`; never type a password. Personas, the developer palette (backtick key), `pnpm local`, and the `/api/dev` routes are in [`docs/local-dev.md`](docs/local-dev.md). If migrations fail against the local D1, `pnpm local db:fresh` rebuilds it.

To prove a product change works, drive the features it touches with [the verify skill](.agents/skills/verify/SKILL.md): its feature map says how to reach and drive each one and what end state proves it, and its runner keeps the evidence for the pull request. For the iPhone app, [the verify-phone skill](.agents/skills/verify-phone/SKILL.md) does the same in its own Simulator with Maestro.

## Before you push

**Instrumentation is part of done.** For each behavior change, state the product question it should answer and add or reuse an event at its owning interaction or committed outcome. Document the event meaning, allowed properties and producer; preserve existing chart contracts, exclude private content, and verify failure and duplicate paths. Record instrumentation and its validation in the pull request. If the change needs no event, explain why.

**Proof matches the change.** A logic fix needs a regression test that fails on `main` and passes with the fix. A UI change needs a [verify](.agents/skills/verify/SKILL.md) run and before-and-after screenshots. A server fix also needs a request and response demonstrating the corrected behavior. Record the evidence in the pull request.

For branch creation, syncing with `main`, commit messages, pull request titles, and merging, follow [`docs/git-workflow.md`](docs/git-workflow.md).

```bash
pnpm verify:changed
```

`pnpm verify:changed` runs formatting, lint, interface-string and migration checks and typechecking on everything, then only the tests affected by the files changed against `origin/main`, with component tests on desktop Chromium. It hands over to `pnpm verify`, the full gate, when the diff touches configuration the tests depend on. `pnpm fix` writes the Biome fixes. CI runs every test on every pull request and every browser on `main` ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)); [`docs/testing.md`](docs/testing.md) has what runs at each gate.

For a production-affecting change, also run `pnpm deploy:check` and the proportional browser gate: `pnpm test:e2e:chromium` normally, or `pnpm test:e2e` when WebKit, mobile, PWA, navigation, caching, focus, touch, sheet, or dialog behavior is at risk. Report each result separately. A passing Chromium run is not full cross-browser evidence.

Cloudflare Workers Builds owns deployment after merge. A green build is not proof that its version is active: run `pnpm deploy:health` and compare the reported tag with the intended commit before calling production verified.

## Conventions

**Types.** `interface Props` for React component props, `type` for unions and small shapes. Zod schemas in `packages/core/src/types.ts` are the source of truth for every API payload - the route parses with one, and the TypeScript type is inferred from it, never hand-written alongside.

**Styling.** Use Tailwind v4 utilities over Lymi tokens (`bg-plate`, `text-ink-secondary`, `border-edge`) and logical directions (`ms-`, `pe-`, `start-`, `text-start`). Raw values break theme support; physical directions complicate right-to-left layouts. `inset-x-0` and centring with `left-1/2` are allowed. `packages/design/tokens.css` owns the OKLCH values used by web and site and generated into the phone palette and `DESIGN.md`.

**Interface text.** Use [the UX-copy skill](.agents/skills/ux-copy/SKILL.md) whenever learner-facing text changes. The English sentence in the component is the message: `<Trans>` in JSX, `t` from `useLingui()` for attributes and handlers, `msg` for module-level constants, `<Plural>` or `plural` for counts. Never build a sentence from concatenated fragments or a ternary on `=== 1`. Dates and numbers go through `i18n.date()`, `i18n.number()` or `Intl` with `i18n.locale`. `pnpm i18n:extract` after adding a string; `pnpm i18n:check` runs in `verify` and fails on an unextracted one. ADR 0012.

**Server layering.** `routes/*` parse, describe for OpenAPI, and return; `services/*` hold the logic and own the database; `db.ts` and the schema sit underneath. A route that reaches past a service into Drizzle is a layering break. Every write goes through `services/audit.ts`, which takes the actor and the connected app from the service context - the Activity screen exists so nothing an integration does lands unseen.

**Client data.** TanStack Query owns every read and cache. The service worker precaches the shell only; API responses go through Query so offline reviews have one path. `packages/client/src/api`, `packages/client/src/queries` and `packages/core/src/responses` hold one module per resource behind a barrel: add a card method to `api/cards.ts`, not to the barrel. Web callers keep importing `@/lib/api` and `@/lib/queries`, which re-export the package.

**Friction log.** When a repository gotcha would slow down the next agent or developer too, such as a stale generated file, a misleading check message or an unwritten setup step, post it as a friction in the Developer experience discussions rather than keep it in private memory; one-off nits and your own slips do not belong there. Search first with `pnpm friction search <words>`, then `pnpm friction plus <number> --note …` on a match or `pnpm friction file` for a new one, which fills [the form](.github/DISCUSSION_TEMPLATE/developer-experience.yml)'s three questions. A post with a second occurrence goes through GitHub's "Create issue from discussion" to become a check, a hook or a line in this guide.

## Enforced rules

Each rule below fails a check instead of waiting for review, and the check's message names the fix.

| Rule | Check |
| --- | --- |
| Web motion honours both the learner's setting and `/design`'s switch: call `useReduceMotion()`, never `useReducedMotion` or `useReducedMotionConfig` from `motion/react` directly | Biome `noRestrictedImports` in `biome.json` |
| The phone never calls `Intl.ListFormat`, which Hermes lacks; use `formatList()` from `apps/mobile/src/i18n/list.ts` | `biome-plugins/no-intl-list-format.grit` |
| Every phone scroll view sets `keyboardShouldPersistTaps`, so a tap with the keyboard up reaches its button | `biome-plugins/scroll-view-persist-taps.grit` |
| Every phone error line is `FieldError`, so its icon centres on the first line and its text keeps the form's line | `biome-plugins/field-error.grit` |
| A change to the phone's frozen responses records a `CACHE_SHAPE` decision | `pnpm check:cache-shape` |
| Language behaviour comes from `packages/core/src/languages`: no other code compares a supported tag with `languageKey(…)`, `.language` or `lang`, switches on it, or lists it in a literal set; files not yet moved are excluded in `biome.json` | `biome-plugins/language-tags.grit` |
| A screen draws a card's term with `TermText` and its example with `ExampleText`, never `termReading` or `parseReadings` itself | `biome-plugins/term-text.grit` |
| Learner text interpolated into `t`, `msg` or `<Trans>` is isolated, as `${{ term: isolate(term) }}`, so a right-to-left term never reorders the sentence | `biome-plugins/isolate-learner-text.grit` |
| An outgoing fetch never passes `redirect: "error"`, which Workers refuses at runtime; use `redirect: "manual"` and check the `Location` | `biome-plugins/no-redirect-error.grit` and `pnpm test:workers` |
| Server SQL and new migrations never case-fold with `lower()`, which is ASCII-only on D1 | `biome-plugins/no-sql-lower.grit` and `pnpm check:migrations` |
| New lines use Lymi tokens and logical directions: no raw hex, stock Tailwind colour, `ml-`/`text-left`, `margin-left` or `marginLeft` | `pnpm check:styling` |
| Token values match `packages/design/tokens.css` everywhere they are copied | `pnpm check:design` |
| Agent docs name only paths, `pnpm` scripts and skills that exist, every product route has a verify entry or a stated reason, and this file stays under its size budget | `pnpm check:agent-docs` |
| Files under `apps/web/src/client` are kebab-case | Biome `useFilenamingConvention` |
| Every learner-facing string is extracted | `pnpm i18n:check` |
| Applied migrations never change | `pnpm check:migrations` |
| Pull request titles follow `type(scope): summary` within 72 characters | `scripts/check-pr-title.mjs` in CI |

## Concise writing

Write for the next decision, not as a record of the work session. State each outcome, constraint, reason, and piece of evidence once. Delete any sentence that does not change what the reader should understand or do.

**Source comments.** Comment only a reason, invariant, safety boundary, or platform quirk that the code cannot express. Prefer clearer code when it removes the need for a comment. Keep comments to one sentence. Put longer rationale in the owning document or ADR and leave a one-sentence pointer beside the code. Use JSDoc only for a public contract whose behavior cannot be expressed by names and types; internal functions and types do not receive summary comments by default.

**Pull request review comments.** Raise one actionable issue per inline comment. Start with the concrete defect or risk, then state the consequence and the smallest useful fix direction. Keep the comment to two or three sentences. Put cross-cutting context in one top-level review comment instead of repeating it inline.

**Documentation.** Describe behavior literally. Keep brand rationale in `docs/design/system/brand.md`. Write each prose paragraph and each list item as a single source line and let the editor wrap it; headings, tables, code blocks and list items keep their own lines. Record durable behavior, decisions, constraints, and operating instructions. Leave implementation narration, review history, and test results in the pull request. Lead with the current rule or decision, keep one idea per paragraph, and use the fewest headings needed. Update the owning document rather than creating a new summary or duplicating facts already present in code or configuration. Proposals hold exploration and, once accepted, a concise delivery outline; they never override current product, design, vocabulary, stack, data-model, or ADR sources. GitHub issues track active work without copying the proposal.

**Pull request descriptions.** Start from `.github/pull_request_template.md`; do not compose a parallel shape from memory. Keep the summary to one short paragraph or at most three bullets and list only checks that ran and their result. Every rendered UI change keeps the `Screenshots` section with an attached after image at minimum and before-and-after evidence when comparison helps, attached with `gh --attach` locally or `pnpm pr:media` in a cloud session ([guide](.agents/skills/open-pr/references/screenshots.md)); attachment failure leaves the pull request blocked rather than review-ready. Add `Why`, `Risks`, or `Follow-ups` only when material, with one short paragraph or at most three bullets per section. Describe reviewer-relevant behavior and trade-offs, not the implementation journey or a file inventory. Link to an owning decision instead of repeating it. Include raw output only when it explains a failure. Omit decorative emoji, generated-by footers, empty sections, and passing logs already visible in CI.

## Generated files

Edit the source and re-run its generator, because the next run overwrites a hand edit.

| Generated | Regenerate after | With |
| --- | --- | --- |
| everything under `migrations/`, `scripts/migration-manifest.json` | a schema change | `pnpm db:generate` |
| `packages/core/src/schema/auth.ts` | a Better Auth config change | `pnpm --filter @lymi/web auth:schema` |
| both `worker-configuration.d.ts` files | a Wrangler binding change | that workspace's `cf-typegen` |
| `apps/web/src/client/routeTree.gen.ts` | adding or renaming a file in `apps/web/src/client/routes` | `pnpm dev` or `pnpm build`, through the TanStack Router plugin |
| `packages/core/simulation/results.json` | changing the draw, the scheduler or a year-long simulation | `pnpm --filter @lymi/core simulate` |
| `packages/design/src/tokens.gen.ts`, `packages/design/uniwind.gen.css`, `DESIGN.md`'s frontmatter | changing `packages/design/tokens.css` | `node scripts/check-design-docs.mjs --write` |
| `packages/design/fonts/onest-cyrillic-wght-normal.woff2` | updating `@fontsource-variable/onest` | `python3 packages/design/scripts/onest-stress.py` (needs `pip install fonttools brotli`) |
| `apps/mobile/assets/symbols/` | changing `apps/mobile/src/ui/icons.tsx` or the lantern in `packages/design/src/lantern.ts` | `pnpm --filter @lymi/mobile symbols` (needs `brew install swiftdraw`) |
| `apps/desktop/assets/trayTemplate.png`, `trayTemplate@2x.png` | changing `tray.svg` | `pnpm --filter @lymi/desktop tray-icon` (needs `rsvg-convert`) |
| `apps/desktop/assets/icon.png`, `icon.icns` | changing `icon.svg` | `pnpm --filter @lymi/desktop app-icon` (needs `rsvg-convert`) |
| `apps/desktop/assets/dmg-background.tiff` | changing the download window | `pnpm --filter @lymi/desktop dmg-background` |
| the clips in `apps/site/public/audio/hand/` | changing a landing card's term | `pnpm --filter @lymi/site hand:audio` (with `OPENAI_API_KEY`) |
| recorded live runs in `apps/web/src/server/enrichment/runs/` | any change to what the enrichment model reads | `pnpm --filter @lymi/web eval:enrichment --record` (with `OPENAI_API_KEY` and `AI_GATEWAY_TOKEN`) |

Each file in `apps/mobile/contract/` is a phone release's frozen API, written by `pnpm --filter @lymi/mobile contract:freeze`; it never changes, and it is deleted only when the minimum supported version passes it (ADR 0032).

## Leave alone

`pnpm deploy`, `deploy:site`, `deploy:product` and `db:migrate:prod` touch production; the user runs those. A merged migration needs none of them: the post-merge build's `deploy:ci` applies pending migrations before it deploys. `.dev.vars` holds real secrets and is git-ignored - keep it that way.

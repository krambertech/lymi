# Lymi — working agreements

A vocabulary app for one learner. Read [`CONTEXT.md`](CONTEXT.md) before naming anything: it is the authority on the domain words, and it lists the words to avoid. A card is never a "flashcard", removal is always "archive", and the AI "enriches" — it never "suggests".

## The repo

[`README.md`](README.md) has the layout and the commands. [`docs/stack.md`](docs/stack.md) has every technical decision with the alternative that lost, so read it before proposing a different shape. [`PRODUCT.md`](PRODUCT.md) is who it is for; [`DESIGN.md`](DESIGN.md) holds the rules every screen follows and indexes the system files in `docs/design/system` and the feature design in `docs/design`; read the system file for what you are building before writing UI.

Two deployables: `apps/site` is the Astro public site plus its narrow health-and-redirects Worker; `apps/web` is the Vite React product and Hono Worker. `packages/core` is what both Workers and the React Native app in `apps/mobile` import unchanged — Drizzle schema, Zod types, FSRS. Anything the product client and server both need lives there. `packages/client` is what the web and phone clients share: the API client, query options, the grade and write outboxes, and the review draw. Each app configures it once with its origin, session headers and storage. `packages/design` holds what all three apps draw with: the tokens, the lantern's geometry, the flame and seven lights' rules, and motion presets.

## Testing locally

Start the product with the `lymi` entry in `.claude/launch.json` (port 5241, or a free port when another worktree holds it). To get a signed-in session, navigate the browser to `/api/dev/sign-in?as=learner`; never type a password. Personas, the developer palette (backtick key), `pnpm local`, and the `/api/dev` routes are in [`docs/local-dev.md`](docs/local-dev.md). If migrations fail against the local D1, `pnpm local db:fresh` rebuilds it.

To prove a product change works, drive the features it touches with [the verify skill](.agents/skills/verify/SKILL.md): its feature map says how to reach and drive each one and what end state proves it, and its runner keeps the evidence for the pull request. For the iPhone app, [the verify-phone skill](.agents/skills/verify-phone/SKILL.md) does the same in its own Simulator with Maestro.

## Before you push

**Instrumentation is part of done.** For each behavior change, state the product question it should answer and add or reuse an event at its owning interaction or committed outcome. Document the event meaning, allowed properties and producer; preserve existing chart contracts, exclude private content, and verify failure and duplicate paths. Record instrumentation and its validation in the pull request. If the change needs no event, explain why.

For branch creation, syncing with `main`, commit messages, pull request titles, and merging, follow [`docs/git-workflow.md`](docs/git-workflow.md).

```bash
pnpm verify:changed
```

`pnpm verify:changed` runs formatting, lint, interface-string and migration checks and typechecking on everything, then only the tests affected by the files changed against `origin/main`, with component tests on desktop Chromium. It hands over to `pnpm verify`, the full gate, when the diff touches configuration the tests depend on. `pnpm fix` writes the Biome fixes. CI runs every test on every pull request and every browser on `main` ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)); [`docs/testing.md`](docs/testing.md) has what runs at each gate.

For a production-affecting change, also run `pnpm deploy:check` and the proportional browser gate: `pnpm test:e2e:chromium` normally, or `pnpm test:e2e` when WebKit, mobile, PWA, navigation, caching, focus, touch, sheet, or dialog behavior is at risk. Report each result separately. A passing Chromium run is not full cross-browser evidence.

Cloudflare Workers Builds owns deployment after merge. A green build is not proof that its version is active: run `pnpm deploy:health` and compare the reported tag with the intended commit before calling production verified.

## Conventions

**Documentation.** Write each prose paragraph and each list item as a single source line. Let the editor wrap text visually. Preserve source line boundaries where Markdown structure requires them, such as headings, tables, code blocks, and separate list items.

**Filenames.** Files under `apps/web/src/client` are kebab-case, matching what the shadcn CLI writes: `AddMenu` lives in `add-menu.tsx`. Biome's `useFilenamingConvention` enforces it everywhere except `routes/`, where TanStack Router needs `$param` names.

**Types.** `interface Props` for React component props, `type` for unions and small shapes. Zod schemas in `packages/core/src/types.ts` are the source of truth for every API payload — the route parses with one, and the TypeScript type is inferred from it, never hand-written alongside.

**Styling.** Tailwind v4 utilities over the Lymi tokens: `bg-plate`, `text-text-2`, `border-edge`. The token values are canonical as OKLCH variables in `packages/design/tokens.css`, which the web and the site import; `DESIGN.md`'s frontmatter and the phone's values are generated from it, and `pnpm check:design` fails on drift. A raw hex or a stock Tailwind color (`bg-slate-100`) in a component is a bug — it breaks dark mode, which is a separate warm palette rather than an inversion. Use logical direction utilities (`ms-`, `pe-`, `start-`, `text-start`) rather than physical ones (`ml-`, `pr-`, `left-`, `text-left`), so a right-to-left locale is a catalog and not a refactor; `inset-x-0` and centring with `left-1/2` are not directional and stay.

**Interface text.** Use [the UX-copy skill](.agents/skills/ux-copy/SKILL.md) whenever learner-facing text changes. The English sentence in the component is the message: `<Trans>` in JSX, `t` from `useLingui()` for attributes and handlers, `msg` for module-level constants, `<Plural>` or `plural` for counts. Never build a sentence from concatenated fragments or a ternary on `=== 1`. Dates and numbers go through `i18n.date()`, `i18n.number()` or `Intl` with `i18n.locale`. `pnpm i18n:extract` after adding a string; `pnpm i18n:check` runs in `verify` and fails on an unextracted one. ADR 0012.

**Server layering.** `routes/*` parse, describe for OpenAPI, and return; `services/*` hold the logic and own the database; `db.ts` and the schema sit underneath. A route that reaches past a service into Drizzle is a layering break. Every write goes through `services/audit.ts`, which takes the actor and the connected app from the service context — the Activity screen exists so nothing an integration does lands unseen.

**Client data.** TanStack Query owns every read and cache. The service worker precaches the shell only; API responses go through Query so offline reviews have one path. `packages/client/src/api`, `packages/client/src/queries` and `packages/core/src/responses` hold one module per resource behind a barrel: add a card method to `api/cards.ts`, not to the barrel. Web callers keep importing `@/lib/api` and `@/lib/queries`, which re-export the package.

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
| Server SQL and new migrations never case-fold with `lower()`, which is ASCII-only on D1 | `biome-plugins/no-sql-lower.grit` and `pnpm check:migrations` |
| New lines use Lymi tokens and logical directions: no raw hex, stock Tailwind colour, `ml-`/`text-left`, `margin-left` or `marginLeft` | `pnpm check:styling` |
| Token values match `packages/design/tokens.css` everywhere they are copied | `pnpm check:design` |
| Files under `apps/web/src/client` are kebab-case | Biome `useFilenamingConvention` |
| Every learner-facing string is extracted | `pnpm i18n:check` |
| Applied migrations never change | `pnpm check:migrations` |
| Pull request titles follow `type(scope): summary` within 72 characters | `scripts/check-pr-title.mjs` in CI |

## Concise writing

Write for the next decision, not as a record of the work session. State each outcome, constraint, reason, and piece of evidence once. Delete any sentence that does not change what the reader should understand or do.

**Source comments.** Comment only a reason, invariant, safety boundary, or platform quirk that the code cannot express. Prefer clearer code when it removes the need for a comment. Keep comments to one sentence. Put longer rationale in the owning document or ADR and leave a one-sentence pointer beside the code. Use JSDoc only for a public contract whose behavior cannot be expressed by names and types; internal functions and types do not receive summary comments by default.

**Pull request review comments.** Raise one actionable issue per inline comment. Start with the concrete defect or risk, then state the consequence and the smallest useful fix direction. Keep the comment to two or three sentences. Put cross-cutting context in one top-level review comment instead of repeating it inline.

**Documentation.** Record durable behavior, decisions, constraints, and operating instructions. Leave implementation narration, review history, and test results in the pull request. Lead with the current rule or decision, keep one idea per paragraph, and use the fewest headings needed. Update the owning document rather than creating a new summary or duplicating facts already present in code or configuration. Proposals hold exploration and, once accepted, a concise delivery outline; they never override current product, design, vocabulary, stack, data-model, or ADR sources. GitHub issues track active work without copying the proposal.

**Pull request titles.** Use `type(scope): imperative summary`. Target 60 characters and never exceed 72. Name the concrete outcome in literal language. Omit metaphors, promotion, issue numbers, and a final period. Example: `fix(auth): preserve deep links after sign-in`.

**Pull request descriptions.** Start from `.github/pull_request_template.md`; do not compose a parallel shape from memory. Keep the summary to one short paragraph or at most three bullets and list only checks that ran and their result. Every rendered UI change keeps the `Screenshots` section with an attached after image at minimum and before-and-after evidence when comparison helps, attached with `gh --attach` locally or `pnpm pr:media` in a cloud session ([guide](.agents/skills/open-pr/references/screenshots.md)); attachment failure leaves the pull request blocked rather than review-ready. Add `Why`, `Risks`, or `Follow-ups` only when material, with one short paragraph or at most three bullets per section. Describe reviewer-relevant behavior and trade-offs, not the implementation journey or a file inventory. Link to an owning decision instead of repeating it. Include raw output only when it explains a failure. Omit decorative emoji, generated-by footers, empty sections, and passing logs already visible in CI.

## Generated files

`routeTree.gen.ts`, both `worker-configuration.d.ts` files, `packages/core/src/schema/auth.ts`, `packages/core/simulation/results.json`, `scripts/migration-manifest.json`, everything under `migrations/`, and the clips in `apps/site/public/audio/hand/` are generated. Edit the source and re-run the generator: `pnpm db:generate` after a schema change, `pnpm --filter @lymi/web auth:schema` after a Better Auth config change, the appropriate workspace's `cf-typegen` after a Wrangler binding change, `pnpm --filter @lymi/core simulate` after changing the draw, the scheduler or a year-long simulation, and `pnpm --filter @lymi/site hand:audio` (with `OPENAI_API_KEY`) after changing a landing card's term. `packages/design/src/tokens.gen.ts` and `packages/design/uniwind.gen.css` are generated too: run `node scripts/check-design-docs.mjs --write` after changing `packages/design/tokens.css`. `packages/design/fonts/onest-cyrillic-wght-normal.woff2` is generated too: run `python3 packages/design/scripts/onest-stress.py` (needs `pip install fonttools brotli`) after updating `@fontsource-variable/onest`. `apps/mobile/assets/symbols/` is generated too: run `pnpm --filter @lymi/mobile symbols` (needs `brew install swiftdraw`) after changing `apps/mobile/src/ui/icons.tsx` or the lantern in `packages/design/src/lantern.ts`. `apps/web/src/server/enrichment/runs/` holds recorded live runs: run `pnpm --filter @lymi/web eval:enrichment --record` (with `OPENAI_API_KEY` and `AI_GATEWAY_TOKEN`) after any change to what the enrichment model reads. Each file in `apps/mobile/contract/` is a phone release's frozen API, written by `pnpm --filter @lymi/mobile contract:freeze`; never edit one, and delete one only when the minimum supported version passes it (ADR 0032).

## Leave alone

`pnpm deploy`, `deploy:site`, `deploy:product` and `db:migrate:prod` touch production; the user runs those. A merged migration needs none of them: the post-merge build's `deploy:ci` applies pending migrations before it deploys. `.dev.vars` holds real secrets and is git-ignored — keep it that way.

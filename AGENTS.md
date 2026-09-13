# Lymi — working agreements

A vocabulary app for one learner. Read [`CONTEXT.md`](CONTEXT.md) before naming anything: it is the authority on the domain words, and it lists the words to avoid. A card is never a "flashcard", removal is always "archive", and the AI "enriches" — it never "suggests".

## The repo

[`README.md`](README.md) has the layout and the commands. [`docs/stack.md`](docs/stack.md) has every technical decision with the alternative that lost, so read it before proposing a different shape. [`PRODUCT.md`](PRODUCT.md) is who it is for; [`DESIGN.md`](DESIGN.md) is how it looks.

Two deployables: `apps/site` is the Astro public site plus its narrow beta/health Worker; `apps/web` is the Vite React product and Hono Worker. `packages/core` is what both Workers and a future React Native app import unchanged — Drizzle schema, Zod types, FSRS. Anything the product client and server both need lives there.

## Testing locally

Start the product with the `lymi` entry in `.claude/launch.json` (port 5241, or a free port when another worktree holds it). To get a signed-in session, navigate the browser to `/api/dev/sign-in?as=learner`; never type a password. Personas, the developer panel (backtick key), `pnpm local`, and the `/api/dev` routes are in [`docs/local-dev.md`](docs/local-dev.md). If migrations fail against the local D1, `pnpm local db:fresh` rebuilds it.

## Before you push

For branch creation, syncing with `main`, commit messages, pull request titles, and merging, follow [`docs/git-workflow.md`](docs/git-workflow.md).

```bash
pnpm verify
```

`pnpm verify` runs formatting and lint checks, the production build, typechecking, and unit tests in that order. The build generates the git-ignored `routeTree.gen.ts` that typechecking needs in a fresh clone. `pnpm fix` writes the Biome fixes. CI runs the same base gate on every pull request ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)), so a failure here is a failure there.

For a production-affecting change, also run `pnpm deploy:check` and the proportional browser gate: `pnpm test:e2e:chromium` normally, or `pnpm test:e2e` when WebKit, mobile, PWA, navigation, caching, focus, touch, sheet, or dialog behavior is at risk. Report each result separately. A passing Chromium run is not full cross-browser evidence.

Cloudflare Workers Builds owns deployment after merge. A green build is not proof that its version is active: run `pnpm deploy:health` and compare the reported tag with the intended commit before calling production verified.

## Conventions

**Documentation.** Write each prose paragraph and each list item as a single source line. Let the editor wrap text visually. Preserve source line boundaries where Markdown structure requires them, such as headings, tables, code blocks, and separate list items.

**Types.** `interface Props` for React component props, `type` for unions and small shapes. Zod schemas in `packages/core/src/types.ts` are the source of truth for every API payload — the route parses with one, and the TypeScript type is inferred from it, never hand-written alongside.

**Styling.** Tailwind v4 utilities over the Lymi tokens: `bg-amber`, `text-ink-2`, `border-border-strong`. The token values are canonical in `DESIGN.md` and mirrored as OKLCH variables in both apps' `styles.css`. A raw hex or a stock Tailwind color (`bg-slate-100`) in a component is a bug — it breaks dark mode, which is a separate warm palette rather than an inversion. Use logical direction utilities (`ms-`, `pe-`, `start-`, `text-start`) rather than physical ones (`ml-`, `pr-`, `left-`, `text-left`), so a right-to-left locale is a catalog and not a refactor; `inset-x-0` and centring with `left-1/2` are not directional and stay.

**Interface text.** The English sentence in the component is the message: `<Trans>` in JSX, `t` from `useLingui()` for attributes and handlers, `msg` for module-level constants, `<Plural>` or `plural` for counts. Never build a sentence from concatenated fragments or a ternary on `=== 1`. Dates and numbers go through `i18n.date()`, `i18n.number()` or `Intl` with `i18n.locale`. `pnpm i18n:extract` after adding a string; `pnpm i18n:check` runs in `verify` and fails on an unextracted one. ADR 0012.

**Server layering.** `routes/*` parse, describe for OpenAPI, and return; `services/*` hold the logic and own the database; `db.ts` and the schema sit underneath. A route that reaches past a service into Drizzle is a layering break. Every write records an actor through `audit.ts` — the Activity screen exists so nothing an integration does lands unseen.

**Client data.** TanStack Query owns every read and cache. The service worker precaches the shell only; API responses go through Query so offline reviews have one path.

## Concise writing

Write for the next decision, not as a record of the work session. State each outcome, constraint, reason, and piece of evidence once. Delete any sentence that does not change what the reader should understand or do.

**Source comments.** Comment only a reason, invariant, safety boundary, or platform quirk that the code cannot express. Prefer clearer code when it removes the need for a comment. Keep comments to one sentence. Put longer rationale in the owning document or ADR and leave a one-sentence pointer beside the code. Use JSDoc only for a public contract whose behavior cannot be expressed by names and types; internal functions and types do not receive summary comments by default.

**Pull request review comments.** Raise one actionable issue per inline comment. Start with the concrete defect or risk, then state the consequence and the smallest useful fix direction. Keep the comment to two or three sentences. Put cross-cutting context in one top-level review comment instead of repeating it inline.

**Documentation.** Record durable behavior, decisions, constraints, and operating instructions. Leave implementation narration, review history, and test results in the pull request. Lead with the current rule or decision, keep one idea per paragraph, and use the fewest headings needed. Update the owning document rather than creating a new summary or duplicating facts already present in code or configuration. Before writing an ADR, plan, or proposal, read that folder's `README.md`; these are distinct document stages, so link them instead of combining or copying them.

**Pull request titles.** Use `type(scope): imperative summary`. Target 60 characters and never exceed 72. Name the concrete outcome in literal language. Omit metaphors, promotion, issue numbers, and a final period. Example: `fix(auth): preserve deep links after sign-in`.

**Pull request descriptions.** Start from `.github/pull_request_template.md`; do not compose a parallel shape from memory. Keep the summary to one short paragraph or at most three bullets and list only checks that ran and their result. Every rendered UI change keeps the `Screenshots` section with an attached after image at minimum and before-and-after evidence when comparison helps; attachment failure leaves the pull request blocked rather than review-ready. Add `Why`, `Risks`, or `Follow-ups` only when material, with one short paragraph or at most three bullets per section. Describe reviewer-relevant behavior and trade-offs, not the implementation journey or a file inventory. Link to an owning decision instead of repeating it. Include raw output only when it explains a failure. Omit decorative emoji, generated-by footers, empty sections, and passing logs already visible in CI.

## Generated files

`routeTree.gen.ts`, both `worker-configuration.d.ts` files, `packages/core/src/schema/auth.ts`, `packages/core/simulation/results.json`, `scripts/migration-manifest.json`, everything under `migrations/`, and the clips in `apps/site/public/audio/hand/` are generated. Edit the source and re-run the generator: `pnpm db:generate` after a schema change, `pnpm --filter @lymi/web auth:schema` after a Better Auth config change, the appropriate workspace's `cf-typegen` after a Wrangler binding change, `pnpm --filter @lymi/core simulate` after changing the draw, the scheduler or a year-long simulation, and `pnpm --filter @lymi/site hand:audio` (with `OPENAI_API_KEY`) after changing a landing card's term.

## Leave alone

`pnpm deploy`, `deploy:site`, `deploy:product` and `db:migrate:prod` touch production; the user runs those. `.dev.vars` holds real secrets and is git-ignored — keep it that way.

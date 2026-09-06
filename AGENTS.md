# Lymi — working agreements

A vocabulary app for one learner. Read [`CONTEXT.md`](CONTEXT.md) before naming anything: it is the authority on the domain words, and it lists the words to avoid. A card is never a "flashcard", removal is always "archive", and the AI "enriches" — it never "suggests".

## The repo

[`README.md`](README.md) has the layout and the commands. [`docs/stack.md`](docs/stack.md) has every technical decision with the alternative that lost, so read it before proposing a different shape. [`PRODUCT.md`](PRODUCT.md) is who it is for; [`DESIGN.md`](DESIGN.md) is how it looks.

Two deployables: `apps/site` is the Astro public site plus its narrow beta/health Worker; `apps/web` is the Vite React product and Hono Worker. `packages/core` is what both Workers and a future React Native app import unchanged — Drizzle schema, Zod types, FSRS. Anything the product client and server both need lives there.

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

**Styling.** Tailwind v4 utilities over the Lymi tokens: `bg-amber`, `text-ink-2`, `border-border-strong`. The token values are canonical in `DESIGN.md` and mirrored as OKLCH variables in both apps' `styles.css`. A raw hex or a stock Tailwind color (`bg-slate-100`) in a component is a bug — it breaks dark mode, which is a separate warm palette rather than an inversion.

**Server layering.** `routes/*` parse, describe for OpenAPI, and return; `services/*` hold the logic and own the database; `db.ts` and the schema sit underneath. A route that reaches past a service into Drizzle is a layering break. Every write records an actor through `audit.ts` — the Activity screen exists so nothing an integration does lands unseen.

**Client data.** TanStack Query owns every read and cache. The service worker precaches the shell only; API responses go through Query so offline reviews have one path.

## Generated files

`routeTree.gen.ts`, both `worker-configuration.d.ts` files, `packages/core/src/schema/auth.ts`, `scripts/migration-manifest.json`, and everything under `migrations/` are generated. Edit the source and re-run the generator: `pnpm db:generate` after a schema change, `pnpm --filter @lymi/web auth:schema` after a Better Auth config change, and the appropriate workspace's `cf-typegen` after a Wrangler binding change.

## Leave alone

`pnpm deploy`, `deploy:site`, `deploy:product` and `db:migrate:prod` touch production; the user runs those. `.dev.vars` holds real secrets and is git-ignored — keep it that way.

# Lymi — working agreements

A vocabulary app for one learner. Read [`CONTEXT.md`](CONTEXT.md) before naming anything: it is the authority on the domain words, and it lists the words to avoid. A card is never a "flashcard", removal is always "archive", and the AI "enriches" — it never "suggests".

## The repo

[`README.md`](README.md) has the layout and the commands. [`docs/stack.md`](docs/stack.md) has every technical decision with the alternative that lost, so read it before proposing a different shape. [`PRODUCT.md`](PRODUCT.md) is who it is for; [`DESIGN.md`](DESIGN.md) is how it looks.

One deployable: `apps/web` is the Vite React client and the Hono Worker together. `packages/core` is what a future React Native app imports unchanged — Drizzle schema, Zod types, FSRS. Anything the client and the server both need lives there.

## Before you push

For branch creation, syncing with `main`, commit messages, pull request titles, and merging, follow [`docs/git-workflow.md`](docs/git-workflow.md).

```bash
pnpm check && pnpm typecheck && pnpm test
```

In a fresh clone, run `pnpm build` first — `routeTree.gen.ts` is generated and git-ignored, so `typecheck` has nothing to read until something has built. `pnpm fix` writes the Biome fixes. CI runs the same three on every pull request ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)), so a failure here is a failure there.

## Conventions

**Documentation.** Write each prose paragraph and each list item as a single source line. Let the editor wrap text visually. Preserve source line boundaries where Markdown structure requires them, such as headings, tables, code blocks, and separate list items.

**Types.** `interface Props` for React component props, `type` for unions and small shapes. Zod schemas in `packages/core/src/types.ts` are the source of truth for every API payload — the route parses with one, and the TypeScript type is inferred from it, never hand-written alongside.

**Styling.** Tailwind v4 utilities over the Lymi tokens: `bg-amber`, `text-ink-2`, `border-border-strong`. The token values are canonical in `DESIGN.md` and mirrored as OKLCH variables in `apps/web/src/client/styles.css`. A raw hex or a stock Tailwind color (`bg-slate-100`) in a component is a bug — it breaks dark mode, which is a separate warm palette rather than an inversion.

**Server layering.** `routes/*` parse, describe for OpenAPI, and return; `services/*` hold the logic and own the database; `db.ts` and the schema sit underneath. A route that reaches past a service into Drizzle is a layering break. Every write records an actor through `audit.ts` — the Activity screen exists so nothing an integration does lands unseen.

**Client data.** TanStack Query owns every read and cache. The service worker precaches the shell only; API responses go through Query so offline reviews have one path.

## Generated files

`routeTree.gen.ts`, `worker-configuration.d.ts`, `packages/core/src/schema/auth.ts`, and everything under `migrations/` are generated. Edit the source and re-run the generator: `pnpm db:generate` after a schema change, `pnpm --filter @lymi/web auth:schema` after a Better Auth config change.

## Leave alone

`pnpm deploy` and `db:migrate:prod` touch production; the user runs those. `.dev.vars` holds real secrets and is git-ignored — keep it that way.

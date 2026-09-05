# Lymi

A vocabulary app with a storm lantern. Collect words from language lessons, let AI prepare the cards, remember them with spaced repetition. Private and single-user for now.

- [PRODUCT.md](PRODUCT.md): who it is for, what it is, how it should feel
- [DESIGN.md](DESIGN.md): tokens, type, components, do's and don'ts
- `/design` on the local dev server: the design system rendered with the real components (local only)
- [docs/stack.md](docs/stack.md): the technical decisions and why
- [docs/adr](docs/adr/README.md): the decisions that were hard to reverse, with the alternatives
- [docs/plans](docs/plans): order of work for passes that are decided but not built
- [CONTEXT.md](CONTEXT.md): the vocabulary, one name per thing

## Run it

Requires Node 22 and pnpm 10.

```bash
pnpm install
cp apps/web/.dev.vars.example apps/web/.dev.vars   # then fill in the Google OAuth values
pnpm db:migrate                                     # applies migrations to the local D1
pnpm dev                                            # http://localhost:5173
```

`pnpm dev` runs the Vite client and the Cloudflare Worker together through the Cloudflare Vite plugin, so `/api/*` hits the real Worker code locally.

## Layout

```
apps/web          The app: Vite React PWA client + Hono Worker in one deployable
  src/client      Routes, views, components, styles, and the /design page
  src/server      Hono app, auth, API, static asset fallback
  migrations      Drizzle-generated SQL for D1
packages/core     Drizzle schema, Zod types, FSRS scheduling. Shared with a future React Native app.
scripts           Brand assets (brand.mjs) and icon generation (icons.sh)
```

## Common commands

```bash
pnpm check        # Biome lint + format check
pnpm fix          # Biome, writing fixes
pnpm typecheck    # tsc across the workspace
pnpm test         # Vitest
pnpm db:generate  # new migration from schema changes
pnpm build        # production build
pnpm run deploy   # wrangler deploy (run, because pnpm has a built-in deploy command)
```

## First deploy checklist

1. `wrangler login`
2. `wrangler d1 create lymi` and paste the `database_id` into `apps/web/wrangler.jsonc`
3. `wrangler r2 bucket create lymi-audio`
4. `wrangler kv namespace create SESSIONS` and paste the id
5. `wrangler secret put BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OPENAI_API_KEY`
6. `pnpm db:migrate:prod`
7. `pnpm run deploy`

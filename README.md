# Lymi

A vocabulary app with a storm lantern. Collect words from language lessons, let AI prepare the cards, remember them with spaced repetition. Private and single-user for now.

- [PRODUCT.md](PRODUCT.md): who it is for, what it is, how it should feel
- [DESIGN.md](DESIGN.md): tokens, type, components, do's and don'ts
- `/design` on the local dev server: the design system rendered with the real components (local only)
- [docs/stack.md](docs/stack.md): the technical decisions and why
- [docs/testing.md](docs/testing.md): the canonical E2E journey and CI policy
- [docs/adr](docs/adr/README.md): the decisions that were hard to reverse, with the alternatives
- [docs/plans](docs/plans): order of work for passes that are decided but not built
- [docs/proposals](docs/proposals/README.md): future product directions under consideration, not committed plans
- [CONTEXT.md](CONTEXT.md): the vocabulary, one name per thing
- `/docs` in the running app: the API documentation, guides and MCP setup, in `apps/web/src/client/docs`

## Run it

Requires Node 22 and pnpm 10.

```bash
pnpm install
cp apps/web/.dev.vars.example apps/web/.dev.vars   # then fill in the Google OAuth values
# Add a VAPID key pair to enable review reminders; see apps/web/.dev.vars.example.
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
pnpm verify       # canonical base gate: check, build, typecheck, test
pnpm check        # Biome lint + format check
pnpm build        # production build
pnpm fix          # Biome, writing fixes
pnpm typecheck    # tsc across the workspace
pnpm test         # Vitest
pnpm test:e2e     # Playwright against isolated local Cloudflare bindings
pnpm test:e2e:chromium # faster Chromium-only browser gate
pnpm test:e2e:ui  # Playwright's interactive runner
pnpm deploy:check # production build plus a local Wrangler deployment dry run
pnpm deploy:health # identify the active production version and check its health
pnpm db:generate  # new migration from schema changes
pnpm run deploy   # wrangler deploy (run, because pnpm has a built-in deploy command)
```

## First deploy checklist

1. `wrangler login`
2. `wrangler d1 create lymi` and paste the `database_id` into `apps/web/wrangler.jsonc`
3. `wrangler r2 bucket create lymi-audio`
4. `wrangler kv namespace create SESSIONS` and paste the id
5. `wrangler secret put BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OPENAI_API_KEY`
6. Generate one VAPID key pair, then add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` with `wrangler secret put`
7. `pnpm db:migrate:prod`
8. `pnpm run deploy`

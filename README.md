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
- `/docs` on the public development server: the API documentation, guides and MCP setup, in `apps/site/src/components/docs`

## Run it

Requires Node 22 and pnpm 10.

```bash
pnpm install
cp apps/web/.dev.vars.example apps/web/.dev.vars   # then fill in the Google OAuth values
# Add a VAPID key pair to enable review reminders; see apps/web/.dev.vars.example.
pnpm db:migrate                                     # applies migrations to the local D1
pnpm dev                                            # site http://localhost:4321, product http://localhost:5173
```

`pnpm dev` runs both deployables: Astro serves the public website, while the Cloudflare Vite plugin runs the React product and its Hono Worker so product `/api/*` requests hit real Worker code locally. Production uses `https://lymi.app` for the public website and docs, and `https://my.lymi.app` for the product, auth, API, MCP and PWA.

## Layout

```
apps/site         Public deployable: Astro pages + beta/health Worker
  src/pages       Landing, Join, documentation routes, sitemap and robots
  src/worker.ts   Website beta signup, health and static assets
apps/web          Product deployable: Vite React PWA client + Hono Worker
  src/client      Routes, views, components, styles, and the /design page
  src/server      Hono app, auth, API, static asset fallback
  migrations      Drizzle-generated SQL for D1
packages/core     Drizzle schema, Zod types, FSRS scheduling. Shared with a future React Native app.
scripts           Brand assets (brand.mjs) and icon generation (icons.sh)
```

## Common commands

```bash
pnpm verify       # canonical base gate: check, i18n:check, build, typecheck, test
pnpm check        # Biome lint + format check
pnpm build        # production build
pnpm fix          # Biome, writing fixes
pnpm i18n:extract # pull new interface strings into the uk and ru catalogs
pnpm i18n:check   # fails when a string was added without extracting
pnpm typecheck    # tsc across the workspace
pnpm test         # Vitest
pnpm test:e2e     # Playwright against isolated local Cloudflare bindings
pnpm test:e2e:chromium # faster Chromium-only browser gate
pnpm test:e2e:ui  # Playwright's interactive runner
pnpm deploy:check # build and validate both deployment packages
pnpm deploy:check:site # build and validate only the website package
pnpm deploy:check:product # build and validate only the product package
pnpm deploy:health # identify and check both active production versions
pnpm deploy:health:site # check only the public Worker
pnpm deploy:health:product # check only the product Worker
pnpm db:generate  # generate SQL, Drizzle snapshots, and the checksum manifest
pnpm run deploy:site # deploy the public Worker; user-owned production action
pnpm run deploy:product # deploy the product Worker; user-owned production action
```

## First deploy checklist

1. `wrangler login`
2. `wrangler d1 create lymi` and paste the `database_id` into `apps/web/wrangler.jsonc`
3. `wrangler r2 bucket create lymi-audio`
4. `wrangler kv namespace create SESSIONS` and paste the id
5. In Google Cloud, authorize `https://my.lymi.app` and the callback `https://my.lymi.app/api/auth/callback/google`
6. `wrangler secret put BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OPENAI_API_KEY`
7. Generate one VAPID key pair, then add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` with `wrangler secret put`
8. Configure separate Workers Builds projects for `apps/site` and `apps/web`, and confirm the `lymi.app` and `my.lymi.app` custom domains are ready in Cloudflare
9. `pnpm db:migrate:prod`
10. `pnpm run deploy:product` and `pnpm run deploy:site`
11. `pnpm deploy:health`, then verify the reported tag is the intended commit

After initial setup, each Cloudflare Workers Builds project runs its package's `deploy:ci` script with a D1-enabled build token so pending migrations succeed before a new Worker version becomes active. Both scripts safely retry if the other build is applying the same shared migration. Migration files already merged to `main` are immutable; create a new migration after syncing rather than renaming or replacing an existing one.

See [docs/site-structure.md](docs/site-structure.md) for the origin contract, cutover prerequisites and production smoke checks.

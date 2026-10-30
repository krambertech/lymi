# Lymi

Lymi is a flashcard app for remembering what you learn, in any subject. Create cards by hand, from notes and files, or through connected tools. AI can fill missing fields, and spaced repetition schedules reviews.

- [PRODUCT.md](PRODUCT.md): who it is for, what it does on each surface, how it should feel
- [docs/review.md](docs/review.md): how a review, the daily goal and the streak work
- [DESIGN.md](DESIGN.md): the rules every screen follows, indexing the system files in `docs/design/system` and the feature design in `docs/design`
- [design.lymi.app](https://design.lymi.app): the design system rendered with the real components; also `/design` on the local dev server
- [docs/stack.md](docs/stack.md): the technical decisions and why
- [docs/local-dev.md](docs/local-dev.md): running locally, personas, the developer palette and `pnpm local`
- [docs/testing.md](docs/testing.md): the canonical E2E journey and CI policy
- [docs/operations.md](docs/operations.md): the production alerts and what to do when one fires
- [docs/lead-ins.md](docs/lead-ins.md): how Japanese speech decides and writes the words before a term, and how to add a language
- [docs/phone-release.md](docs/phone-release.md): how the phone app ships over the air, to TestFlight and to Google Play, and its one-time setup
- [docs/mcp-directory-review.md](docs/mcp-directory-review.md): what ChatGPT and Claude directory review checks, and the review cases
- [docs/adr](docs/adr/README.md): the decisions that were hard to reverse, with the alternatives
- [docs/proposals](docs/proposals/README.md): product directions under consideration or delivery, never current product truth
- [CONTEXT.md](CONTEXT.md): the vocabulary, one name per thing
- `/docs` on the public development server: the API documentation, guides and MCP setup, in `apps/site/src/components/docs`

## Run it

Requires Node 22.19 or later and pnpm 10.

```bash
pnpm install
cp apps/web/.dev.vars.example apps/web/.dev.vars   # then fill in the Google OAuth values
# Add a VAPID key pair to enable review reminders; see apps/web/.dev.vars.example.
pnpm db:migrate                                     # applies migrations to the local D1
pnpm dev                                            # site http://localhost:4321, product http://localhost:5173
```

`pnpm dev` runs both deployables: Astro serves the public website, while the Cloudflare Vite plugin runs the React product and its Hono Worker so product `/api/*` requests hit real Worker code locally. To sign in without Google, open `http://localhost:5173/api/dev/sign-in?as=learner`: it creates a seeded local account and lands on Today. [docs/local-dev.md](docs/local-dev.md) has the other personas, the developer palette, and `pnpm local`. Production uses `https://lymi.app` for the public website and docs, and `https://my.lymi.app` for the product, auth, API, MCP and PWA.

## Layout

```
apps/site         Public deployable: Astro pages, published deck pages + health Worker
  src/pages       Landing, documentation routes, sitemap and robots
  src/worker.ts   Website health and legacy redirects, then Astro's handler
apps/web          Product deployable: Vite React PWA client + Hono Worker
  src/client      Routes, views, components, styles, and the /design page
  src/server      Hono app, auth, API, static asset fallback
  migrations      Drizzle-generated SQL for D1
apps/mobile       iPhone app: Expo React Native (see its README)
apps/desktop      Mac app: Electron shell around the product (see its README)
packages/core     Drizzle schema, Zod types, FSRS scheduling. Shared by the web and the phone app.
packages/client   API client, query options, grade and write outboxes, review draw. Shared by both clients.
packages/design   Tokens, the lantern's geometry, flame rules and motion. Shared by the web, the site and the phone.
scripts           Brand assets (brand.mjs) and icon generation (icons.sh)
```

## Common commands

```bash
pnpm verify:changed # push gate: static checks, then the tests the change affects
pnpm verify       # full gate: check, i18n:check, build, typecheck, test
pnpm check        # lint, formatting, design, styling, cache, agent-doc and phone-symbol checks
pnpm check:design # the phone's values match packages/design; DESIGN.md keeps no tokens in its frontmatter; design docs name real components
pnpm build        # production build
pnpm fix          # Biome, writing fixes
pnpm i18n:extract # pull new interface strings into the uk and ru catalogs
pnpm i18n:check   # fails when a string was added without extracting
pnpm typecheck    # tsc across the workspace
pnpm test         # Vitest, every test on every browser instance
pnpm test:watch   # Vitest watch mode: unit project and desktop Chromium
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
pnpm local        # drive the local server: personas, seed, reset, due; see docs/local-dev.md
pnpm run deploy:site # deploy the public Worker; user-owned production action
pnpm run deploy:product # deploy the product Worker; user-owned production action
```

## Generated files

Edit the source and re-run its generator, because the next run overwrites a hand edit.

| Generated | Regenerate after | With |
| --- | --- | --- |
| everything under `migrations/`, `scripts/migration-manifest.json` | a schema change | `pnpm db:generate` |
| `packages/core/src/schema/auth.ts` | a Better Auth config change | `pnpm --filter @lymi/web auth:schema` |
| both `worker-configuration.d.ts` files | a Wrangler binding change | that workspace's `cf-typegen` |
| `apps/web/src/client/routeTree.gen.ts` | adding or renaming a file in `apps/web/src/client/routes` | `pnpm dev` or `pnpm build`, through the TanStack Router plugin |
| `packages/core/simulation/results.json` | changing the draw, the scheduler or a year-long simulation | `pnpm --filter @lymi/core simulate` |
| `packages/design/src/tokens.gen.ts`, `packages/design/uniwind.gen.css` | changing `packages/design/tokens.css` | `node scripts/check-design-docs.mjs --write` |
| `packages/design/fonts/onest-cyrillic-wght-normal.woff2` | updating `@fontsource-variable/onest` | `python3 packages/design/scripts/onest-stress.py` (needs `pip install fonttools brotli`) |
| `apps/mobile/assets/symbols/` | changing `apps/mobile/src/ui/icons.tsx` or the lantern in `packages/design/src/lantern.ts` | `pnpm --filter @lymi/mobile symbols` (needs `brew install swiftdraw`) |
| `apps/desktop/assets/trayTemplate.png`, `trayTemplate@2x.png` | changing `tray.svg` | `pnpm --filter @lymi/desktop tray-icon` (needs `rsvg-convert`) |
| `apps/desktop/assets/icon.png`, `icon.icns` | changing `icon.svg` | `pnpm --filter @lymi/desktop app-icon` (needs `rsvg-convert`) |
| `apps/desktop/assets/dmg-background.tiff` | changing the download window | `pnpm --filter @lymi/desktop dmg-background` |
| the clips in `apps/site/public/audio/hand/` | changing a landing card's term | `pnpm --filter @lymi/site hand:audio` (with `OPENAI_API_KEY`) |
| recorded live runs in `apps/web/src/server/enrichment/runs/` | any change to what the enrichment model reads | `pnpm --filter @lymi/web eval:enrichment --record` (with `OPENAI_API_KEY` and `AI_GATEWAY_TOKEN`) |

For the phone's frozen API contracts, follow [apps/mobile/AGENTS.md](apps/mobile/AGENTS.md).

## First deploy checklist

1. `wrangler login`
2. `wrangler d1 create lymi` and paste the `database_id` into `apps/web/wrangler.jsonc`
3. `wrangler r2 bucket create lymi-audio` and `wrangler r2 bucket create lymi-private-images`, and enable Cloudflare Images for the Images binding
4. `wrangler kv namespace create SESSIONS` and paste the id
5. In Google Cloud, authorize `https://my.lymi.app` and the callback `https://my.lymi.app/api/auth/callback/google`. Configure [Sign in with Apple](docs/phone-release.md#sign-in-with-apple) for the web and iPhone.
6. `wrangler secret put BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OPENAI_API_KEY`, `AI_GATEWAY_TOKEN`. Rotating `BETTER_AUTH_SECRET` later makes every learner paste their Readwise token again.
7. Generate one VAPID key pair, then add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` with `wrangler secret put`
8. In Resend, verify `lymi.app`, add a webhook to `https://my.lymi.app/api/email/events` for bounced and complained events, then add `RESEND_API_KEY` and `RESEND_WEBHOOK_SECRET` with `wrangler secret put`; until the key exists, email goes through the Cloudflare binding
9. Configure separate Workers Builds projects for `apps/site` and `apps/web`, and confirm the `lymi.app` and `my.lymi.app` custom domains are ready in Cloudflare
10. `pnpm db:migrate:prod`
11. `pnpm run deploy:product` and `pnpm run deploy:site`
12. `pnpm deploy:health`, then verify the reported tag is the intended commit

After initial setup, each Cloudflare Workers Builds project runs its package's `deploy:ci` script with a D1-enabled build token so pending migrations succeed before a new Worker version becomes active. Both scripts safely retry if the other build is applying the same shared migration. Migration files already merged to `main` are immutable; create a new migration after syncing rather than renaming or replacing an existing one.

See [docs/site-structure.md](docs/site-structure.md) for origin routing, build configuration and deployment checks.

## License

[FSL-1.1-MIT](LICENSE.md). You can read, run, and change the code for any purpose except offering a competing product. Each version becomes MIT two years after its release. The license grants no rights to the Lymi name or the lantern mark.

## Design deployment

`design.lymi.app` is served by the separate `lymi-design` Worker, built from the product’s real design pages and components. It has no product API, authentication, database, PWA, or analytics; examples use the design fixtures. Robots headers keep it out of search results.

Run `pnpm --filter @lymi/web design:dev` locally, `pnpm --filter @lymi/web design:check` to build and dry-run the Worker, and `pnpm --filter @lymi/web design:deploy` to publish it. Check the active version with `node scripts/check-deployment.mjs https://design.lymi.app/api/health lymi-design`.

For automatic updates, connect the `lymi-design` Worker to this repository’s `main` branch in Workers Builds, with the repository root as the build root, `pnpm --filter @lymi/web design:build` as the build command, and `pnpm --filter @lymi/web design:deploy:ci` as the deploy command. Include `apps/web/**`, `packages/**`, `pnpm-lock.yaml` and `pnpm-workspace.yaml` in its build watch paths.

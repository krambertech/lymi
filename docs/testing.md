# Testing

Lymi uses a small set of Playwright journeys to prove that the browser, Worker, authentication, D1 persistence, deck and card creation, and FSRS review path work together. The suite runs entirely against local Cloudflare bindings. It never uses production data or AI credentials.

## Commands

```bash
pnpm verify           # canonical base gate: check, build, typecheck, test
pnpm test             # unit tests and the CI impact rules
pnpm test:e2e         # Chromium desktop and an iPhone-sized WebKit browser
pnpm test:e2e:chromium # Chromium desktop only
pnpm test:e2e:ui      # Playwright's interactive UI
pnpm deploy:check     # production builds and both deployment-package dry runs
pnpm deploy:health    # check both production origins and print their deployed versions
pnpm exec playwright show-report
```

Install the configured browsers once on a new machine:

```bash
pnpm exec playwright install chromium webkit
```

`scripts/e2e-server.mjs` clears only its three isolated Wrangler state directories, applies every D1 migration, builds both applications, starts the site Worker on port 4174, starts the production-built product package on port 4175 for PWA installation and offline-shell coverage, and starts the product through Vite on port 4173 for the interactive journeys. Its short-lived variable files contain local-only credentials. It never overwrites a pre-existing developer file, removes the files it creates on exit, and does not touch normal Wrangler state, a developer's `.dev.vars`, or any remote Cloudflare binding.

## Service tests on a real D1

`apps/web/src/server/services/test-db.ts` boots wrangler's local runtime in memory, applies every migration, and returns the same `Db` the Worker uses. Service tests that need rows, such as `members.test.ts`, take one database per file and give each test its own deck. The pure-function tests next to them need no database and stay that way.

## CI policy

`pnpm verify` is the canonical local base gate. CI runs the same commands in the same fail-fast order but gives formatting and lint, migration safety, build, TypeScript, and unit tests their own named steps. A failure therefore identifies the broken gate without requiring an agent or developer to search a combined log.

`scripts/ci-plan.mjs` selects the browser and deployment coverage from the event and changed paths. Its policy is ordinary tested JavaScript rather than logic hidden only in workflow YAML:

- Pull requests without production-affecting paths run the base gate only.
- Production-affecting pull requests add a deployment-package dry run and Chromium E2E.
- Every push to `main` and `/e2e` command runs Chromium and WebKit plus the deployment-package dry run.
- A manually dispatched workflow runs the full policy by default and can explicitly skip browser E2E.

Every run writes a summary with its selected browser coverage and the outcome of each gate. A green Chromium pull request is deliberately labelled as Chromium evidence, not as full cross-browser evidence.

Comment `/e2e` on a pull request to force a run without adding a label. The command accepts only the repository owner and only branches in this repository. A newer commit cancels an obsolete in-progress run.

Failed browser runs retain screenshots, video from the retry, a Playwright trace, and the HTML report as a GitHub Actions artifact for seven days. Successful runs retain no browser artifacts.

## Delivery checks

`pnpm deploy:check` builds both production applications, verifies the artifact boundary and asks Wrangler to compile and validate each generated deployment package without authenticating or uploading anything. CI runs both already-built package checks for production-affecting pull requests, every push to `main`, and manual runs.

Separate Cloudflare Workers Builds projects own delivery for `apps/site` and `apps/web`. Keep both production branches on `main`; public-site preview versions are allowed, while non-production product branch builds stay disabled because preview URLs cannot support Lymi's canonical-origin authentication. Scope each project's watch paths to its app, `packages/core/*` and root workspace files so a site-only change does not deploy the product and a product-only change does not deploy the site.

Use `pnpm verify` as each Workers Builds build command. Use each package's `deploy:ci` script as its deploy command, backed by a custom Workers Builds API token with D1 edit access. Both scripts apply pending remote migrations before activating a Worker version; this keeps either independently deployed Worker from reaching production against an older schema. The migration step is safe to retry when both builds start for the same shared-schema commit. This duplicates the base gate on production deployments, but makes each independent Cloudflare pipeline fail closed instead of deploying while GitHub CI is red.

Committed migrations are immutable production history. `pnpm db:generate` creates the SQL and Drizzle snapshots and updates `scripts/migration-manifest.json`; do not edit those generated files by hand. `pnpm check:migrations` runs Drizzle's migration consistency check, verifies the immutable filenames and checksums, and generates into a temporary directory to catch a schema change whose migration was forgotten. Generate a new migration after syncing with `origin/main`; never reuse a number from another branch.

Each Worker exposes its Cloudflare version ID, deployment timestamp and optional commit tag from `/api/health`. After Workers Builds activates versions, `pnpm deploy:health` checks both canonical domains and identifies the versions serving traffic. A successful build page without these active-version checks is not deployment evidence.

## MCP sign-in on the local server

The OAuth flow cannot be driven by a real MCP client against `localhost`: clients identify themselves with a Client ID Metadata Document, and `cimd-fetch.ts` only accepts one on a public HTTPS host. A pre-registered native client in the local D1 stands in for it. The rows live only in `.wrangler/state`, so nothing in the repo changes.

```bash
pnpm --filter @lymi/web exec wrangler d1 execute lymi --local --command "
insert into oauth_client (id, client_id, disabled, skip_consent, scopes, redirect_uris, token_endpoint_auth_method, application_type, grant_types, response_types, require_pkce, name, created_at, updated_at)
values ('lymi-local-test', 'lymi-local-test', 0, 0, '[\"read\",\"write\",\"offline_access\"]', '[\"http://127.0.0.1:8765/callback\"]', 'none', 'native', '[\"authorization_code\",\"refresh_token\"]', '[\"code\"]', 1, 'Local MCP test client', unixepoch()*1000, unixepoch()*1000);
insert into oauth_client_resource (id, client_id, resource_id, created_at)
values ('lymi-local-test-link', 'lymi-local-test', 'http://localhost:5241/mcp', unixepoch()*1000);"
```

The resource identifier is `PRODUCT_URL` plus `/mcp`; the `oauth_resource` row for it is seeded when the Worker first constructs Better Auth. Without the link row the authorize endpoint answers `invalid_target`.

Then, with a listener on `127.0.0.1:8765` and a PKCE verifier in hand:

1. Sign in first, by opening `/api/dev/sign-in?as=learner` or through `/login?dev=1`. The authorize request signs its query, so adding `dev=1` to the URL it redirects to breaks the signature and the sign-in fails.
2. Open `/api/auth/oauth2/authorize` with `client_id=lymi-local-test`, the redirect URI above, `scope=read write offline_access`, the S256 challenge and `resource=http://localhost:5241/mcp`. The consent screen appears; approve it.
3. Exchange the code at `/api/auth/oauth2/token` with `grant_type=authorization_code`, the verifier and the same `resource`.
4. Call `/mcp` with `Authorization: Bearer` and the `accept: application/json, text/event-stream` header. Responses arrive as one SSE `data:` line.

The consent is remembered per client and learner, so a second authorize goes straight to the code. Disconnect the client from the You screen to see the consent screen again.

## Canonical coverage

`e2e/core-learning-flow.spec.ts` owns the smallest complete learner journey:

1. Create a local account through the UI.
2. Seed a deck through the authenticated API as test setup.
3. Add a card with a meaning through the UI.
4. Review and grade the due card.
5. Reload and confirm the persisted result.

Keep this path real. Use accessible roles and labels, do not mock Lymi's own APIs, do not use fixed sleeps, and do not add test-only application routes. Prefer public APIs for setup that is not the behavior under test. Add focused journeys only when they protect another critical user outcome that the canonical path cannot express clearly.

`e2e/deck-creation.spec.ts` owns deck and card creation: validation, routing and persistence, deck targeting, duplicate handling, optional meanings, archived-deck protection, and responsive controls from 320 px phone layouts through wide desktop. Each scenario, browser project, and retry has its own allowlisted learner account so one test cannot inherit another test's data.

`e2e/origin-boundary.spec.ts` proves that each local Worker exposes only its own routes, metadata and beta boundary, and documents the one-time stale-site-data recovery. `e2e/pwa-boundary.spec.ts` runs against the production product package in Chromium and proves that the manifest, installed service worker and offline sign-in shell remain product-owned.

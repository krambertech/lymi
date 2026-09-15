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

Specs import `test` and `expect` from `e2e/test.ts`, not from `@playwright/test`. Its `test` sets `--seq-filter: none` in every page, so the end of a review rises and fades without its blur: on a CI runner with no GPU, WebKit stalls while the end screen animates that blur on several parts at once. The motion, its timing and tap-to-finish stay under test.

## Component tests in real browsers

Files named `*.browser.test.tsx` run in Vitest browser mode, as the `components` project in `apps/web/vite.config.ts`. Each test runs three times: desktop Chromium at 1280 px with a fine pointer, and Chromium and WebKit as a 390 px touch device. A test reads `inject("machine")` to know which shape to expect, so one file proves both shapes of an adaptive component. `pnpm test` runs them after the unit tests, so the browsers must be installed. Workers Builds sets `WORKERS_CI=1` and has no browsers, so the production build skips this project and relies on GitHub CI, which runs it before merge:

```bash
pnpm exec playwright install chromium webkit
pnpm --filter @lymi/web exec vitest run --project components
```

WebKit does not focus a button that is clicked, so a test about focus return opens the overlay from the keyboard. A swipe is not covered here; it belongs in a Playwright journey on the iPhone project.

## Service tests on a real D1

`apps/web/src/server/services/test-db.ts` boots wrangler's local runtime in memory, applies every migration, and returns the same `Db` the Worker uses. Service tests that need rows, such as `members.test.ts`, take one database per file and give each test its own deck. The pure-function tests next to them need no database and stay that way.

## CI policy

`pnpm verify` is the canonical local base gate. CI keeps those commands in one quality job and the same fail-fast order, with formatting and lint, migration safety, build, TypeScript, and unit tests as distinct steps. A short planning job selects coverage first, then the quality job and required browser E2E run in parallel. A final check reports every gate and fails unless the plan, quality job and required browser job succeeded.

`scripts/ci-plan.mjs` selects the browser and deployment coverage from the event and changed paths. Its policy is ordinary tested JavaScript rather than logic hidden only in workflow YAML:

- Pull requests without production-affecting paths run the base gate only.
- Production-affecting pull requests add a deployment-package dry run and Chromium E2E.
- Every push to `main` and `/e2e` command runs Chromium and WebKit plus the deployment-package dry run.
- A manually dispatched workflow runs the full policy by default and can explicitly skip browser E2E.
- Public-site pull requests upload a preview after the quality job passes without waiting for browser E2E. The stable `pr-<number>` alias follows the pull request across new commits and appears as GitHub's View deployment link and in the job summary.
- Product-affecting pull requests provision an isolated app preview after quality passes. Drafts and changes that touch only `*.test.ts` or `*.test.tsx` files get none; marking a draft ready for review deploys it. GitHub's View deployment link establishes the preview capability, signs in a synthetic learner and opens seeded data; the same link follows later commits.

Every run writes a final summary with its selected browser coverage and the outcome of each job and gate. A green Chromium pull request is deliberately labelled as Chromium evidence, not as full cross-browser evidence.

Comment `/e2e` on a pull request to force a run without adding a label. The command accepts only the repository owner and only branches in this repository. A newer commit cancels an obsolete in-progress run.

Failed browser runs retain screenshots, video from the retry, a Playwright trace, and the HTML report as a GitHub Actions artifact for seven days. Successful runs retain no browser artifacts.

## Delivery checks

`pnpm deploy:check` builds both production applications, verifies the artifact boundary and asks Wrangler to compile and validate each generated deployment package without authenticating or uploading anything. CI runs both already-built package checks for production-affecting pull requests, every push to `main`, and manual runs.

Separate Cloudflare Workers Builds projects own production delivery for `apps/site` and `apps/web`. Keep both production branches on `main` and disable non-production branch builds. GitHub Actions owns both preview paths because its tested plan can distinguish each deployable and build the product in an explicitly isolated preview mode. The production `lymi` Worker keeps preview URLs disabled because its versions retain production bindings and canonical-origin authentication.

The `site-preview` GitHub environment holds `CLOUDFLARE_ACCOUNT_ID` and a narrowly scoped `CLOUDFLARE_SITE_PREVIEW_TOKEN`. A site-affecting pull request uploads `lymi-site` with alias `pr-<number>`, records that stable URL as the GitHub deployment target, and checks `/api/health` for the exact Worker version it uploaded. Pull requests from forks never receive these credentials or run the upload job.

The `app-preview` environment holds `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_APP_PREVIEW_TOKEN` and `LYMI_APP_PREVIEW_AUTH_SECRET`. Its token is limited to Worker Scripts, D1, KV and R2 edit access. Each affected same-repository pull request gets a `lymi-app-pr-<number>` Worker with matching disposable storage, a stable `preview-lymi-app-pr-<number>` URL and per-pull-request auth/access keys derived from the root secret. CI applies migrations, rebuilding the preview database from empty when they no longer apply to it (a rebase that renumbers a migration re-runs it under its new filename), uploads without a production deployment, verifies the exact health version, follows the protected entry link, signs in the synthetic learner and confirms seeded decks. The close workflow removes only resources whose names are derived from that validated pull request number.

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

`e2e/deck-creation.spec.ts` owns deck and card creation: validation, routing and persistence, deck targeting, duplicate handling, optional meanings, archived-deck protection, and responsive controls from 320 px phone layouts through wide desktop. Each scenario, browser project, retry, and repeat up to `--repeat-each=10` has its own allowlisted learner account so one test cannot inherit another test's data.

`e2e/shared-deck-join.spec.ts` owns sharing a deck: the owner turns on the join link, the fetched join page's title and Open Graph tags name the deck without card content, the page shows example cards, a signed-out classmate whose email is on no allowlist is refused without the link and admitted through it, a repeat join changes nothing, and turning the link off keeps the member while the old URL admits nobody. The classmate signs up through the local email form from `/join/<token>?dev=1`, which carries the link through sign-in the same way Google sign-in does.

`e2e/import-from-anki.spec.ts` owns importing: a real Anki 26.09 export uploads from Import in Settings, the preview shows one of its cards and refuses Import until every kind of card is confirmed, the Workflow writes it, Library and Activity show it, archiving hides the decks it made and restoring brings them back, and the same file again offers to update rather than add. The fixtures and `fixtures/generate.py` that makes them live beside the Anki adapter; the adapter, reader and writer tests cover both containers, replay, duplicates and retries below the browser.

`e2e/import-from-mochi.spec.ts` owns the Mochi page: the fixture beside the Mochi adapter uploads from Import in Settings, the preview counts cards with no side break, and the import lands in Library and Activity. Re-import, archive and today's goal for Mochi are covered by the service tests.

`e2e/export.spec.ts` owns exporting: a deck's menu and Export library in Settings open the export sheet, the Workflow writes the file, the sheet offers the download, the download route returns the zip, and Activity lists the export. Round trips, the Anki collection, a member's history, expiry and audit are service tests in `services/exports.test.ts`; the SQLite writer is checked against `node:sqlite`.

`e2e/origin-boundary.spec.ts` proves that each local Worker exposes only its own routes, metadata and beta boundary, and documents the one-time stale-site-data recovery. `e2e/pwa-boundary.spec.ts` runs against the production product package in Chromium and proves that the manifest, installed service worker and offline sign-in shell remain product-owned.

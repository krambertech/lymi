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

## CI policy

`pnpm verify` is the canonical local base gate. CI runs the same commands in the same fail-fast order but gives formatting and lint, migration history, build, TypeScript, and unit tests their own named steps. A failure therefore identifies the broken gate without requiring an agent or developer to search a combined log.

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

Committed migrations are immutable production history. `scripts/migration-manifest.json` records every migration filename and checksum, while `pnpm check:migrations` verifies the sequence and prevents a pull request from changing or removing anything already present on its base branch. Generate a new migration after syncing with `origin/main`; never reuse a number from another branch.

Each Worker exposes its Cloudflare version ID, deployment timestamp and optional commit tag from `/api/health`. After Workers Builds activates versions, `pnpm deploy:health` checks both canonical domains and identifies the versions serving traffic. A successful build page without these active-version checks is not deployment evidence.

## Canonical coverage

`e2e/core-learning-flow.spec.ts` owns the smallest complete learner journey:

1. Create a local account through the UI.
2. Seed a deck through the authenticated API as test setup.
3. Add a word and meaning through the UI.
4. Review and grade the due card.
5. Reload and confirm the persisted result.

Keep this path real. Use accessible roles and labels, do not mock Lymi's own APIs, do not use fixed sleeps, and do not add test-only application routes. Prefer public APIs for setup that is not the behavior under test. Add focused journeys only when they protect another critical user outcome that the canonical path cannot express clearly.

`e2e/deck-creation.spec.ts` owns deck and card creation: validation, routing and persistence, deck targeting, duplicate handling, optional meanings, archived-deck protection, and responsive controls from 320 px phone layouts through wide desktop. Each scenario, browser project, and retry has its own allowlisted learner account so one test cannot inherit another test's data.

`e2e/origin-boundary.spec.ts` proves that each local Worker exposes only its own routes, metadata and beta boundary, and documents the one-time stale-site-data recovery. `e2e/pwa-boundary.spec.ts` runs against the production product package in Chromium and proves that the manifest, installed service worker and offline sign-in shell remain product-owned.

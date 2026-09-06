# Testing

Lymi uses a small set of Playwright journeys to prove that the browser, Worker, authentication, D1 persistence, deck and card creation, and FSRS review path work together. The suite runs entirely against local Cloudflare bindings. It never uses production data or AI credentials.

## Commands

```bash
pnpm verify           # canonical base gate: check, build, typecheck, test
pnpm test             # unit tests and the CI impact rules
pnpm test:e2e         # Chromium desktop and an iPhone-sized WebKit browser
pnpm test:e2e:chromium # Chromium desktop only
pnpm test:e2e:ui      # Playwright's interactive UI
pnpm deploy:check     # production build and local deployment-package dry run
pnpm deploy:health    # check production health and print its deployed version
pnpm exec playwright show-report
```

Install the configured browsers once on a new machine:

```bash
pnpm exec playwright install chromium webkit
```

`scripts/e2e-server.mjs` clears only `apps/web/.wrangler/e2e`, applies every D1 migration there, and starts Vite with a short-lived `.dev.vars.lymi-e2e` file containing local-only credentials. It never overwrites a pre-existing file, removes the file it created on exit, and does not touch the normal `.wrangler/state`, a developer's `.dev.vars`, or any remote Cloudflare binding.

## CI policy

`pnpm verify` is the canonical local base gate. CI runs the same commands in the same fail-fast order but gives formatting and lint, build, TypeScript, and unit tests their own named steps. A failure therefore identifies the broken gate without requiring an agent or developer to search a combined log.

`scripts/ci-plan.mjs` selects the browser and deployment coverage from the event and changed paths. Its policy is ordinary tested JavaScript rather than logic hidden only in workflow YAML:

- Pull requests without production-affecting paths run the base gate only.
- Production-affecting pull requests add a deployment-package dry run and Chromium E2E.
- Every push to `main` and `/e2e` command runs Chromium and WebKit plus the deployment-package dry run.
- A manually dispatched workflow runs the full policy by default and can explicitly skip browser E2E.

Every run writes a summary with its selected browser coverage and the outcome of each gate. A green Chromium pull request is deliberately labelled as Chromium evidence, not as full cross-browser evidence.

Comment `/e2e` on a pull request to force a run without adding a label. The command accepts only the repository owner and only branches in this repository. A newer commit cancels an obsolete in-progress run.

Failed browser runs retain screenshots, video from the retry, a Playwright trace, and the HTML report as a GitHub Actions artifact for seven days. Successful runs retain no browser artifacts.

## Delivery checks

`pnpm deploy:check` builds the production application and asks Wrangler to compile and validate the generated deployment package without authenticating or uploading anything. CI runs the already-built package check for production-affecting pull requests, every push to `main`, and manual runs.

Cloudflare Workers Builds remains the deployment owner. Keep its production branch on `main`, disable non-production branch builds while preview URLs cannot support Lymi's canonical-origin authentication, and configure build watch paths so documentation-only commits do not consume Cloudflare build minutes. The production trigger should include `apps/web/*`, `packages/core/*`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.nvmrc`, and `tsconfig.base.json`.

Use `pnpm verify` as the Workers Builds build command. Use `pnpm --filter @lymi/web exec wrangler deploy -c dist/lymi/wrangler.json --tag "$WORKERS_CI_COMMIT_SHA"` as its deploy command. This duplicates the roughly one-minute base gate on production deployments, but makes the independent Cloudflare pipeline fail closed instead of deploying while GitHub CI is red. Path filtering avoids paying that cost for non-production changes.

The Worker exposes its Cloudflare version ID, deployment timestamp, and optional commit tag from `/api/health`. After Workers Builds activates a version, `pnpm deploy:health` provides a single read-only check that the canonical domain is healthy and identifies the version serving traffic. A successful build page without this active-version check is not deployment evidence.

## Canonical coverage

`e2e/core-learning-flow.spec.ts` owns the smallest complete learner journey:

1. Create a local account through the UI.
2. Seed a deck through the authenticated API as test setup.
3. Add a word and meaning through the UI.
4. Review and grade the due card.
5. Reload and confirm the persisted result.

Keep this path real. Use accessible roles and labels, do not mock Lymi's own APIs, do not use fixed sleeps, and do not add test-only application routes. Prefer public APIs for setup that is not the behavior under test. Add focused journeys only when they protect another critical user outcome that the canonical path cannot express clearly.

`e2e/deck-creation.spec.ts` owns deck and card creation: validation, routing and persistence, deck targeting, duplicate handling, optional meanings, archived-deck protection, and responsive controls from 320 px phone layouts through wide desktop. Each scenario, browser project, and retry has its own allowlisted learner account so one test cannot inherit another test's data.

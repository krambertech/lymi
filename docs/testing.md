# Testing

Lymi uses a small set of Playwright journeys to prove that the browser, Worker, authentication, D1 persistence, deck and card creation, and FSRS review path work together. The suite runs entirely against local Cloudflare bindings. It never uses production data or AI credentials.

## Review coverage

Choose the rows the change can affect. Feature verification proves the learner's outcome; interface review checks the quality and accessibility of the changed experience; automated gates check the contracts they execute. Reuse evidence across them instead of driving the same state repeatedly.

| When the change touches | Check | Owning guidance |
| --- | --- | --- |
| A learner flow or its recovery | Complete the affected path and confirm stored state; cover the changed failure, offline, retry or resume paths | [verify](../.agents/skills/verify/SKILL.md) and its feature recipes |
| Controls, forms or overlays | Names, labels, keyboard and focus behavior, validation, pending submission and duplicate actions | [review-ui checks](../.agents/skills/review-ui/references/checks.md#interaction-and-accessibility) |
| Layout, content or themes | The viewports, input methods, themes, locales and data states selected by the diff | [review-ui coverage](../.agents/skills/review-ui/SKILL.md#choose-the-coverage) |
| Motion, assets, loading or repeated work | Reduced motion, layout stability and cleanup; measure claims about speed or responsiveness | [review-ui checks](../.agents/skills/review-ui/references/checks.md#components-and-performance) and [motion](../.agents/skills/review-ui/references/checks.md#motion) |
| API, persistence or shared client behavior | Validation, authorization, audit, compatibility and retry behavior at the cheapest layer that observes the change | [Test layers](#where-a-test-goes), [Workers runtime](#workers-runtime-tests) and [phone contracts](#the-phone-app) |
| Public pages or their routing | Titles, descriptions, canonical links, indexing and share previews, including redirects between origins | [Site structure](site-structure.md) and the affected site's E2E assertions |
| Build configuration, developer tooling or public assets | Production excludes developer controls, private fixtures and secrets; origin and package boundaries still hold | `pnpm check:boundaries` and [deployment checks](site-structure.md#build-configuration-and-release-checks) |
| Measured behavior | The product question, event owner, allowed properties, privacy, failure and duplicate paths | [Analytics](analytics.md) |
| Native or installed-phone behavior | The affected feature on the phone, supported API contracts and any release or device-specific checks | [verify-phone](../.agents/skills/verify-phone/SKILL.md) and [phone releases](phone-release.md) |

For a launch or release sweep, include shared entry points, initial loading, fonts and theme initialization, and public landing pages even when the final diff is narrow. Keep ordinary PR review scoped to the change. Record relevant checks and missing evidence in the PR's existing Verification section, distinguishing source inspection, browser or Simulator observation, and real-device checks; emulation does not establish hardware behavior.

## Commands

```bash
pnpm verify:changed   # push gate: static checks on everything, tests for what changed
pnpm verify           # full gate: check, build, typecheck, every test on every instance
pnpm test:watch       # save gate: the unit project and desktop Chromium in watch mode
pnpm test             # unit tests and the CI impact rules
pnpm test:workers     # outgoing fetches in workerd against a stubbed upstream
pnpm test:e2e         # Chromium desktop and an iPhone-sized WebKit browser
pnpm test:e2e:chromium # Chromium desktop only
pnpm test:e2e:ui      # Playwright's interactive UI
pnpm deploy:check     # production builds and both deployment-package dry runs
pnpm deploy:health    # check both production origins and print their deployed versions
pnpm exec playwright show-report
pnpm --filter @lymi/mobile e2e # the phone's smoke journey; see The phone app
```

Install the configured browsers once on a new machine:

```bash
pnpm exec playwright install chromium webkit
```

`scripts/e2e-server.mjs` clears only its three isolated Wrangler state directories, applies every D1 migration, seeds the site's D1 with the published decks in `e2e/fixtures/published-decks.sql`, builds both applications, starts the site Worker, the production-built product package for PWA installation and offline-shell coverage, and the product through Vite for the interactive journeys. Its short-lived variable files contain local-only credentials. It never overwrites a pre-existing developer file, removes the files it creates on exit, and does not touch normal Wrangler state, a developer's `.dev.vars`, or any remote Cloudflare binding.

`e2e/ports.mjs` owns the three ports. `E2E_PORT` sets the base and the other two follow it, so `E2E_PORT=4183` runs the suite on 4183, 4184 and 4185; the default is 4173, 4174 and 4175. Give a second worktree its own base, because the servers are not keyed per checkout and a run that finds another worktree's server would report on the wrong code. The server refuses to start when any of its three ports is taken, and `reuseExistingServer` is off, so a clash is a loud failure rather than a meaningless pass. The Vite Worker uses those same origins, and E2E disables Vite’s CORS middleware so credentialed API preflights exercise the Worker’s own policy.

```bash
E2E_PORT=4183 pnpm test:e2e:chromium
```

Specs import `test` and `expect` from `e2e/test.ts`, not from `@playwright/test`. Its `test` sets `--seq-filter: none` in every page, so the end of a review rises and fades without its blur: on a CI runner with no GPU, WebKit stalls while the end screen animates that blur on several parts at once. The motion, its timing and tap-to-finish stay under test. It also hides the developer tools' edge tab, which learners never see and which covers a row's options button at the edge of a phone screen; the login page's Dev sign-in form is separate and stays.

A site page's controls are static HTML until their Astro island hydrates, and a click before then is lost. A journey calls `waitForIslands(page)` from `e2e/test.ts` before its first click on a site control.

Every page runs under `prefers-reduced-motion: reduce`, the product's reduced-motion mode, and an assertion gets fifteen seconds on CI rather than Playwright's five. Both are measured: full motion fails more than twice as many Chromium tests as reduced motion on the same commit, and the suite runs about three times slower on a runner with no GPU than on a developer's machine, which is also why `timeout` doubles there. A journey that needs full motion sets `test.use({ reducedMotion: "no-preference" })` and says why.

Analytics never initialize on loopback origins, so journeys need no analytics fixture; secondary browser windows still open through `newTestContext`. The SDK payload test intercepts `/ingest` in the browser, so the Worker never forwards to the production project.

A journey whose subject is not authentication starts already signed in. `startAsTestLearner` in `e2e/auth.ts` establishes that account's session once through the same email endpoints the form posts to, restores its cookies into the journey's browser context, and keeps the stored session for the rest of the run, so an account two journeys share pays for creation once. A journey that then reads a screen names it; one that seeds through the API navigates itself, because rendering Today on the way costs it a screen it never reads. A journey whose setup depends on the day names Today as well: its load is what reports the device zone and opens today's row, so a goal set before it belongs to no day yet. The store lives in the Playwright process alone, so it cannot outlast the D1 and KV that the server rebuilds on every run: a session from an earlier run, schema or auth configuration is never restored at all. On 2026-09-18 the same 62 Chromium tests spent 340 seconds through the form and 286 from a stored session; the wall clock moves less, because building both applications and starting three servers dominates it.

Six journeys keep driving the form, because arriving is their subject: the deep link that survives sign-in, which also proves the account being created on first use; the second learner on one browser, whose subject is the persisted cache that signing in throws away; both password journeys; the classmate who signs up from a join link; and the visitor who signs up from a published deck's add page. `signInAsTestLearner` and `createAccountThroughDevForm` are theirs.

The journeys run one at a time. They share a single Vite dev server, a single Worker and a single D1, and only the accounts are keyed per test: `e2eEmail` in `e2e/settings.mjs` keys one by test, project, retry and repeat. With three workers, most signed-in journeys never mount their screen inside the expect budget, while the tests that touch no account pass. Parallel journeys need a backend per worker, or a served build in place of the dev server, before the worker count is worth raising again.

## What runs when

The closer a change is to shipping, the more runs. Every test still runs in every browser before a commit reaches production; the gate decides where.

| Check | Save | Push | Pull request | Main |
| --- | --- | --- | --- | --- |
| Biome, interface strings, migration safety, TypeScript | - | all | all | all |
| Production build and deployment boundaries | - | on handover | yes | yes |
| Unit, service and route tests | changed graph | changed graph | all | all |
| Workers-runtime tests | - | when server or core changed | when server or core changed | all |
| Component tests, desktop Chromium | changed graph | changed graph | all | all |
| Component tests, touch Chromium and WebKit | - | - | when the diff reaches the primitives | all |
| Journeys | - | by hand when a screen changed | Chromium on production-affecting diffs | Chromium and WebKit |
| Deployment package dry runs | - | - | production-affecting diffs | both |

- **Save** is `pnpm test:watch`: Vitest watch mode on the `unit` project and the `desktop` component instance. A save reruns the tests that import what changed.
- **Push** is `pnpm verify:changed`: the static checks on everything, then `vitest run --changed` against the merge base with `origin/main` in each workspace, with component tests on desktop Chromium. `scripts/verify-changed.mjs` lists the steps.
- **Pull request** and **Main** run `pnpm verify` in CI's `quality` job, with the component instances and journeys that `scripts/ci-plan.mjs` selects.

`scripts/test-plan.mjs` owns two path lists, and both gates read it. A diff that reaches `components/ui/`, a `*.browser.test.tsx` file or `apps/web/src/client/design/forced-states.tsx` needs every component instance: the primitives adapt to the device, and nothing else can break the touch shape. A diff that reaches a file the tests depend on without importing it, such as a migration, a `.po` catalog, a stylesheet, the test setup or a workspace config, hands over to the full gate, because `vitest --changed` follows imports and would miss it. Add a path to that list when a test starts depending on one.

`LYMI_COMPONENT_INSTANCES` names the component instances to run, comma-separated from `desktop`, `touch` and `touch-webkit`; unset runs all three, and an unknown name fails the run. Workers Builds keeps `pnpm verify` as its build command, so production still fails closed on the full gate.

The Mac app in `apps/desktop` is tested only where it differs from the web. The contract between it and the page is the types in `packages/client/src/desktop.ts`, so a mismatch fails `pnpm typecheck`. Its rules live in modules that import nothing from Electron (`origin.ts`, `settings.ts`, `callback.ts`, `term.ts`), whose unit tests run with `pnpm test`. The pages only it shows have component tests with a stand-in for the app (`routes/desktop.add.browser.test.tsx`, `components/this-mac-section.browser.test.tsx`), and the server's side of its sign-in is `server/desktop-sign-in.test.ts`. The Desktop workflow packages the app when a pull request changes `apps/desktop` and launches it on a Mac runner; `apps/desktop/scripts/launch-check.js` passes once a product page has the bridge.

## Where a test goes

Write a test at the cheapest layer that can observe the behaviour. A feature owes a service test for every rule it adds, a route test for every endpoint it adds or changes, and a component test when it adds or changes a primitive in `components/ui`. It owes a journey only when it changes one of the outcomes below or adds a new one. A journey is the exception, chosen for a named reason, and a pull request that adds one names the reason.

| Layer | Question | Costs |
| --- | --- | --- |
| Unit | Is it a pure function of its inputs? FSRS, the draw, a formatter, the CI plan. | Milliseconds a file, in Node |
| Service | Does it persist, authorize or audit? | About 20 ms a test on the shared local D1 |
| Route | Is it the HTTP contract: what a route accepts and refuses, who may call it, what it answers? | A few hundred milliseconds a test through the Worker's fetch handler |
| Component | Does it depend on focus, pointer, layout or device shape inside one component? | One to five seconds a file, once per browser instance |
| Journey | Does it prove one of the reasons below? | About ten seconds a test on CI, plus a minute of server setup per shard |

A journey earns its place by proving something no lower layer can see:

- Offline behaviour and what survives it: the grade and write outboxes, a queue that replays, a cached shell, a request that fails and is retried.
- The service worker, the manifest and installability.
- Persistence across a reload, a sign-out, or a second learner on the same browser.
- A clock crossing midnight in a live client.
- A gesture: a drawer swiped away, a drag along a list.
- Focus and keyboard order across screens; inside one component it is a component test.
- The browser's own facts: its locale, JavaScript off, media playback.
- The two origins together: an email or site link landing in the product, or a redirect between them.
- A runtime feature the route harness does not have, today a Workflow or `HTMLRewriter`, which only workerd provides; this reason shrinks as `test-app.ts` grows.
- One canonical path per critical learner outcome, named under Canonical coverage.

A journey does not earn its place for a status code, a validation message or a permission, which are route tests; for a screen that lists or edits rows, which is a service test for the rule and a component test for the primitive, because the canonical journeys already prove that lists and forms render; for a second scenario of a journey that exists, which is a case in the service or route test; or for a public page's HTML, headers and metadata, which is a `request`-only test with no `page` and costs a fraction of a second. The site has no component or route layer, so a site interaction is a journey and site HTML is a `request`-only test.

To decline a journey in review, point at the list: a test that proves none of the reasons belongs lower. To add one, name the reason in its title or leading comment.

## Component tests in real browsers

Files named `*.browser.test.tsx` run in Vitest browser mode, as the `components` project in `apps/web/vite.config.ts`. Each test runs three times: desktop Chromium at 1280 px with a fine pointer, and Chromium and WebKit as a 390 px touch device. A test reads `inject("machine")` to know which shape to expect, so one file proves both shapes of an adaptive component. `pnpm test` runs them after the unit tests, so the browsers must be installed. Workers Builds sets `WORKERS_CI=1` and has no browsers, so the production build skips this project and relies on GitHub CI, which runs it before merge:

```bash
pnpm exec playwright install chromium webkit
pnpm --filter @lymi/web exec vitest run --project components
```

Each browser context asks for reduced motion, for the same reason the journeys do: a toast that changes opacity and height without travelling holds still long enough to be clicked, where one sliding into a stack does not. `forced-states` rewrites both motion queries into `data-motion` selectors, so the specimens that prove the full and reduced forms are unaffected by what the context asks for. A test that drives full motion wraps its subject in `<MotionConfig reducedMotion="never">` and says why. CI retries a failed test once, matching the journeys: these gate the same merges.

An instance's files run one after another in the same browser page, so a file can leave state behind for the next. On touch Chromium, `page.viewport()` wider than the device leaves the whole page pinch-zoomed after the size is restored, and a later file can pan that zoomed view; Playwright then aims a click a row off and reports another element intercepting it. The test setup resets the page scale before every file.

WebKit does not focus a button that is clicked, so a test about focus return opens the overlay from the keyboard. A swipe is not covered here; it belongs in a Playwright journey on the iPhone project.

## Service tests on a real D1

`apps/web/src/server/services/test-db.ts` returns the same `Db` the Worker uses: wrangler's local runtime, in memory, with every migration applied. One runtime serves every service test. The first `testDb()` in a worker boots it; each later call empties its tables, its KV namespace and its R2 buckets and hands the same bindings back, so a file still starts on an empty database. A boot cost about 1.3 seconds on a developer's machine and grew with every migration; emptying costs about 20 milliseconds and does not.

A test owns only the rows it writes and never reads another's. Separate databases per file made that true by accident; it is now the only isolation there is, and shuffling the file order is the check:

```bash
pnpm --filter @lymi/web exec vitest run --project unit --sequence.shuffle.files
```

`testDb({ before: "0012_" })` boots a private runtime stopped short of that migration and adds `migrate` and `migrateFrom`, which is what a migration test such as `review-modes.test.ts` needs.

One runtime for many files means the `unit` project runs with `isolate: false`, so the files in a worker share a module registry and a `globalThis`. `src/test/unit-setup.ts` empties the module registry before each file and unstubs globals after it, so a mocked module or a stubbed global belongs to the file that made it; the runtime survives because it is held on `globalThis` rather than in module scope. Any other process-wide state a test reaches for is that test's to clean up.

The pure-function tests next to them need no database and stay that way.

## CI policy

`pnpm verify` is the canonical local base gate. CI keeps those commands in one quality job and the same fail-fast order, with formatting and lint, migration safety, build, TypeScript, and unit tests as distinct steps. A short planning job selects coverage first, then the quality job and required browser E2E run in parallel. A final check reports every gate and fails unless the plan, quality job and every browser shard succeeded.

The browser job is a matrix of Playwright shards, each a separate runner with its own checkout, dev server, Workers and D1. Playwright assigns tests to shards by file, so a spec whose tests share an account still lands whole in one shard and the per-test account keying holds. `e2eShardCount` in `scripts/ci-plan.mjs` owns the count and the matrix reads it from the plan. Three was measured on 2026-09-18: the cross-browser run on `main` took 19 minutes as one job, and each shard pays the same 61 seconds of `scripts/e2e-server.mjs` setup before its share of the tests, so a fourth shard buys less than it costs in runner minutes. The matrix does not fail fast, because a summary that names every failing shard is worth the minutes the others spend finishing.

`workers` stays at one even with shards: a shard has its own server and D1, where a second worker would share them.

A newer run supersedes an older one on every branch, `main` included. Only one run per concurrency group may wait, so two queued pushes to `main` would cancel each other before either started; superseding the older run verifies the newest commit instead. A shard's `timeout-minutes` is a safety net rather than a budget: a job that reaches it is reported as cancelled, which reads as a mysterious red rather than a slow suite.

`scripts/ci-plan.mjs` selects the browser and deployment coverage from the event and changed paths. Its policy is ordinary tested JavaScript rather than logic hidden only in workflow YAML:

- Pull requests without production-affecting paths run the base gate only.
- Pull requests run the component tests on desktop Chromium. A diff that reaches the UI primitives, their tests or the specimen harness adds touch Chromium and WebKit, and the quality job installs only the browsers it runs.
- Production-affecting pull requests add a deployment-package dry run and Chromium E2E.
- Every push to `main` and `/e2e` command runs Chromium and WebKit journeys, every component instance, and the deployment-package dry run.
- A manually dispatched workflow runs the full policy by default and can explicitly skip browser E2E.
- Public-site pull requests upload a preview after the quality job passes without waiting for browser E2E. The stable `pr-<number>` alias follows the pull request across new commits and appears as GitHub's View deployment link and in the job summary.
- Product-affecting pull requests provision an isolated app preview after quality passes. Drafts and changes that touch only `*.test.ts` or `*.test.tsx` files get none; marking a draft ready for review deploys it. GitHub's View deployment link establishes the preview capability, signs in a synthetic learner and opens seeded data; the same link follows later commits. The preview keeps its database between deploys, so when the learner's Library holds fewer decks than the persona promises, the deploy check reseeds her once and fails if it still does.

Every run writes a final summary with its selected browser and component coverage and the outcome of each job and gate. A green Chromium pull request is deliberately labelled as Chromium evidence, not as full cross-browser evidence.

Comment `/e2e` on a pull request to force a run without adding a label. The command accepts only the repository owner and only branches in this repository.

Every shard uploads a small `e2e-shard-outcome-<n>` artifact, and the final check downloads them all so the run summary carries a row per shard, the combined pass count, and the file, line and title of every failing test. `scripts/e2e-shard-outcome.mjs` builds that record from the JSON report that the shared Playwright config writes on CI. A shard whose browser install or dependency step broke is recorded as a failure rather than a skip, so the table never reads as a deliberate exclusion.

A failed shard also retains screenshots, video from the retry, a Playwright trace, and the HTML report as `e2e-diagnostics-shard-<n>` for seven days. Successful shards retain no browser artifacts.

## Delivery checks

`pnpm deploy:check` builds both production applications, verifies the artifact boundary and asks Wrangler to compile and validate each generated deployment package without authenticating or uploading anything. CI runs both already-built package checks for production-affecting pull requests, every push to `main`, and manual runs.

Separate Cloudflare Workers Builds projects own production delivery for `apps/site` and `apps/web`. Keep both production branches on `main` and disable non-production branch builds. GitHub Actions owns both preview paths because its tested plan can distinguish each deployable and build the product in an explicitly isolated preview mode. The production `lymi` Worker keeps preview URLs disabled because its versions retain production bindings and canonical-origin authentication.

The `site-preview` GitHub environment holds `CLOUDFLARE_ACCOUNT_ID` and a narrowly scoped `CLOUDFLARE_SITE_PREVIEW_TOKEN`. A site-affecting pull request uploads `lymi-site` with alias `pr-<number>`, records that stable URL as the GitHub deployment target, and checks `/api/health` for the exact Worker version it uploaded. Pull requests from forks never receive these credentials or run the upload job.

The `app-preview` environment holds `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_APP_PREVIEW_TOKEN` and `LYMI_APP_PREVIEW_AUTH_SECRET`. Its token is limited to Worker Scripts, D1, KV and R2 edit access. Each affected same-repository pull request gets a `lymi-app-pr-<number>` Worker with matching disposable storage, a stable `preview-lymi-app-pr-<number>` URL and per-pull-request auth/access keys derived from the root secret. CI applies migrations, rebuilding the preview database from empty when they no longer apply to it (a rebase that renumbers a migration re-runs it under its new filename), uploads without a production deployment, verifies the exact health version, follows the protected entry link, signs in the synthetic learner and confirms seeded decks. Closing the pull request cancels its in-flight CI run, so a late preview deploy cannot recreate what the close workflow removes. That workflow empties the preview bucket, then removes only resources whose names are derived from that validated pull request number. Dispatch `App preview cleanup` with the number to repeat a failed cleanup.

Use `pnpm verify` as each Workers Builds build command. Use each package's `deploy:ci` script as its deploy command, backed by a custom Workers Builds API token with D1 edit access. Both scripts apply pending remote migrations before activating a Worker version; this keeps either independently deployed Worker from reaching production against an older schema. The migration step is safe to retry when both builds start for the same shared-schema commit. This duplicates the base gate on production deployments, but makes each independent Cloudflare pipeline fail closed instead of deploying while GitHub CI is red.

The product project also sets `POSTHOG_CLI_API_KEY` as a secret build variable: a PostHog personal API key scoped to project 292417 with `error tracking write` and `organization read`, the same key the phone uploads with ([phone-release.md](phone-release.md)). Its build uploads the browser and Worker source maps and deletes them; a failed upload fails the build, and `pnpm check:boundaries` fails if a map would ship. Without the key the build warns and deploys with unreadable stacks. [operations.md](operations.md#a-deploy-fails-at-the-source-map-upload) says how to ship while PostHog is down.

Committed migrations are immutable production history. `pnpm db:generate` creates the SQL and Drizzle snapshots and updates `scripts/migration-manifest.json`; change the schema and generate again rather than editing them. `pnpm check:migrations` runs Drizzle's migration consistency check, verifies the immutable filenames and checksums, and generates into a temporary directory to catch a schema change whose migration was forgotten. Generate a new migration after syncing with `origin/main`; never reuse a number from another branch.

Each Worker exposes its Cloudflare version ID, deployment timestamp and optional commit tag from `/api/health`. After Workers Builds activates versions, `pnpm deploy:health` checks both canonical domains and identifies the versions serving traffic. A successful build page without these active-version checks is not deployment evidence.

## Workers-runtime tests

`apps/web/vitest.workers.config.ts` runs `*.workers.test.ts` files inside workerd with the production Worker's compatibility date and flags, and answers every outgoing request from a stub upstream in that config. Node accepts request options that workerd refuses: `redirect: "error"` once passed typecheck, lint, the unit tests and the deployment dry run, then failed every AI and audio call in production. `outgoing-fetch.workers.test.ts` drives every outgoing fetch the Worker makes with request options, from the AI providers to picture import, email, PostHog and Apple, through the real `fetch` and `Request`; it proves the call leaves and comes back, not how a provider behaves.

Add a case there, and an answer to the stub, for any new outgoing fetch or any new use of an API only Workers provides. `biome-plugins/no-redirect-error.grit` catches the one option known to break; this project catches the next one. `scripts/test-plan.mjs` runs it in `pnpm verify:changed` and on pull requests that reach `apps/web/src/server/` or `packages/core/`, and `pnpm verify` and every push to `main` run it always.

## Route tests through the Worker's fetch handler

`apps/web/src/server/test-app.ts` drives the product app in Node on the shared local D1, through the same fetch handler Workers calls: origin routing, preview access, authentication, validation and each route's own guards run as they do in production, with no browser and no Vite server. `testApp()` hands back the bindings, `fetch(path, { as })` for a request as a signed-in learner, and `signUp(handle)` for a confirmed `@lymi.local` account. `operators` names the addresses `OPERATOR_EMAILS` grants. Work a route defers with `waitUntil` finishes before `fetch` returns, so an audit row is there to read.

A route test proves the contract: the status and body for a signed-out caller, a learner, an operator and a learner on another learner's row, and a response parsed with its Zod schema from `packages/core/src/types.ts` rather than restated. A business rule belongs in the service test beneath it and a screen in a journey above it. `app.test.ts` owns the product origin's route and indexing boundary. Under `routes/`, `email`, `feedback`, `activity`, `archived`, `streak` and `add` hold contracts that moved down from journeys and are the pattern for the next endpoint. The join and add door pages render through `HTMLRewriter`, so their HTML stays a `request`-only step in a journey.

The app lives in `app.ts` and the Worker entry in `index.ts`, because the entry re-exports the Workflows and `cloudflare:workers` exists only in the Worker runtime.

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

The consent is remembered per client and learner, so a second authorize goes straight to the code. Disconnect the client in Settings to see the consent screen again.

## The phone app

The phone app is tested mostly below its screens, on Linux, and its one Simulator journey is a smoke test before a release. Screens stay thin, so the rules they show live in `packages/core` and `packages/client`, where Vitest already tests them. An installed app cannot be fixed by the next merge, so what the API owes it is checked on every pull request. [ADR 0032](adr/0032-the-phone-ships-over-the-air-and-the-api-keeps-every-supported-release-working.md) has the release model behind it.

| Layer | Question | Where | Costs |
| --- | --- | --- | --- |
| Unit | Is the shared rule right: the draw, FSRS, the outboxes, the review day? | `packages/core`, `packages/client` | Milliseconds a file |
| Typecheck | Does the phone's code still fit the shared types? | `pnpm typecheck`, which includes `apps/mobile` | Part of the quality job |
| Unit | Do the phone's own plain-logic modules, such as its analytics queue and review legs, behave? | `apps/mobile/src/**/*.test.ts`, with `pnpm --filter @lymi/mobile test` | Seconds, in `pnpm test` |
| Contract | Does the Worker still serve every phone release that is supported? | `apps/web/src/server/phone-contract.test.ts` and `phone-contract-unlisted.test.ts` | About 30 seconds |
| Client against the Worker | Does the shared client, configured as the phone configures it, sign in, draw, grade and replay against the real Worker? | `apps/web/src/server/phone-client.test.ts` | Seconds |
| Smoke journey | Does the Release build launch, sign in, keep its session, review and sync? | `apps/mobile/e2e`, on a Simulator | 8 minutes on a cached build, 27 on a cold one |

The phone's Vitest runs only modules that import nothing native, in Node, on every pull request. It has no screen or component tests. React Native has no working Vitest setup, so they would bring Jest in as a second runner; add them when a screen grows logic of its own that cannot move into a shared package or a plain module.

### The contract check

Each phone release freezes the API it was built against: Promote writes the operations the phone calls, listed in `phoneOperations` in `phone-contract.test.ts`, with the schemas they reach and without prose, to `apps/mobile/contract/<version>.json`. An endpoint only the web calls, such as imports, exports or API keys, can change freely; add a call to the list when the phone starts making it, before its release is frozen. `phone-contract.test.ts` then checks the current Worker against every file in that folder in two ways. `breakingChanges` in `scripts/api-compat.mjs` compares the schemas, and the test calls the phone's reads as a seeded learner, sending that release's `x-lymi-client` header so a route gated by `clientSupports` answers as it would on the installed app, and validates each response against the frozen schema, which catches a route whose answer has drifted from its own description. Both run in the `unit` project, so every pull request and every push to `main` runs them.

The phone also calls routes the OpenAPI document leaves out: Better Auth under `/api/auth`, the photo, pronunciation audio and feedback. No freeze can hold them, so `phone-contract-unlisted.test.ts` sends each one as every frozen release sends it and checks what that release reads back: the status, the response fields, the binary content type, and the Better Auth error codes `use-sign-in.ts` explains. When the phone starts calling another hidden route, add it there.

A response may gain fields and the API may gain endpoints. The check fails when a frozen release would lose something it reads, when a request it sends would be refused, or when a response field gains an enum value or a union branch the release has never seen. When the check fails on a web-first feature, choose one of these:

1. Leave the new value out of responses to older clients: the route asks `clientSupports(c, { ios: "<first release that shows it>" })` from `apps/web/src/server/phone-clients.ts`, which reads the version the app sends in `x-lymi-client`. A platform left out has no release that shows it yet. A notation inside text every card route returns, such as a Chinese example's pinyin or a Cantonese example's Jyutping, is taken out of every JSON answer to an older release by middleware in the same file instead.
2. If the phone already shows an unknown value safely, mark the field with `.meta(OPEN)` from `packages/core/src/responses/common.ts` and freeze a release that carries the mark. On a schema with an `id`, put the mark in its definition, since a field's own `.meta` is lost behind the reference.
3. To remove something, raise the minimum version first and delete the frozen releases below it in the same pull request.

The minimum version is `PHONE_MINIMUM_VERSION_IOS` in `apps/web/wrangler.jsonc`, and `PHONE_UPDATE_URL_IOS` is where Update Lymi sends the learner. Raising it needs a Worker deploy and no app build: every request from an older release then gets 426, and the app shows only Update Lymi, keeping its unsent grades and writes for the updated release.

A version is a JavaScript release, and an update can carry a new one, but a fresh install or a roll back to embedded first runs the version inside the App Store binary. Never raise the minimum past the version embedded in the current App Store binary, or new learners get 426 from a store that has nothing newer.

Every fixed list in a phone response is open, except the few in `closedOnPurpose` with their reasons, and the test fails on a new closed one so each is decided when it appears. The shared client leaves a review mode it cannot ask out of the draw and the queue, and every other open field the phone reads falls back to a known state; `phone-client.test.ts` feeds unknown values through those readers.

Freeze by hand, for example to record the baseline after a change to the check itself:

```bash
pnpm --filter @lymi/mobile contract:freeze
```

A freeze that changes a successful response also asks whether the phone's kept query cache is still readable. `pnpm check:cache-shape`, part of `pnpm check`, fails until `CACHE_SHAPE` in `apps/mobile/src/data/cache.ts` is bumped, when a screen now reads a field an earlier cache may lack, or the unchanged shape is confirmed; either way, `node scripts/check-cache-shape.mjs --write` records the decision in `apps/mobile/src/data/cache-shape.json`.

### The smoke journey

`apps/mobile/e2e/flows/sign-in-and-review.yaml` is one Maestro flow: it signs in with the email form, opens a review, grades three cards Good and ends the review. `apps/mobile/e2e/run.sh` seeds the `learner` persona on a local Worker first and checks afterwards that the three grades reached it, because the screen moves on before the grade outbox sends. It drives the same Release build a learner installs, with `EXPO_PUBLIC_API_URL` pointing at the local Worker, and finds controls by their visible text and accessibility labels.

The journey is a smoke test and stays one flow. A behaviour it could cover belongs in the layer that can see it: a rule in a unit test, an answer in a route test, the client's handling of it in `phone-client.test.ts`. Add a step only for something that exists solely in the native build, such as a session surviving a relaunch.

`.github/workflows/phone.yml` runs it on GitHub's `macos-26` runner, which is free for a public repository. It fingerprints the native inputs with `@expo/fingerprint` and caches the Simulator build under that hash, so a run without a native change only re-bundles the JavaScript into the cached app, starts the Worker, boots a Simulator and runs the flow. A failed flow runs once more and reports a pass on retry as a warning. A failed run keeps Maestro's screenshots, its JUnit report and the Worker log for seven days.

To run it on your Mac, build the Release app against a local Worker, install it on your own Simulator, and run the script with that Worker's port:

```bash
cd apps/mobile
EXPO_PUBLIC_API_URL=http://localhost:5241 LANG=en_US.UTF-8 npx expo run:ios --configuration Release --device <udid> --no-bundler
API_URL=http://localhost:5241 DEVICE=<udid> pnpm --filter @lymi/mobile e2e
```

Maestro needs Java 17 or later on `JAVA_HOME`.

### What runs when for the phone

| Check | Pull request | Main | Promote | Monday |
| --- | --- | --- | --- | --- |
| Unit, typecheck, contract, client against the Worker | all | all | all | - |
| Contract against production's `/api/openapi.json` | - | - | - | yes |
| Smoke journey | by hand | - | must pass | yes |

A pull request that touches only the web or the Worker runs the same Linux checks as one that touches the phone: the contract is what an installed app depends on, and it costs seconds. Start the journey by hand from the Actions tab, on the `Phone` workflow, when a pull request changes something native or the sign-in path.

## Canonical coverage

`e2e/core-learning-flow.spec.ts` owns the smallest complete learner journey:

1. Create a local account through the UI.
2. Seed a deck through the authenticated API as test setup.
3. Add a card with a meaning through the UI.
4. Review and grade the due card.
5. Reload and confirm the persisted result.

Keep this path real: find controls by accessible roles and labels, call Lymi's own APIs unmocked, wait on what the page shows rather than a fixed sleep, and add no test-only application routes. Set up what is not the behavior under test through public APIs. A new journey needs one of the reasons under Where a test goes, or a critical learner outcome the canonical path cannot express, named here.

`e2e/deck-creation.spec.ts` owns deck and card creation: validation, routing and persistence, deck targeting, duplicate handling, optional meanings, archived-deck protection, and responsive controls from 320 px phone layouts through wide desktop. Each scenario, browser project, retry, and repeat up to `--repeat-each=10` has its own learner account so one test cannot inherit another test's data.

`e2e/writes-offline.spec.ts` owns the write outbox: a deck and a card in it made while every write is cut off show at once, survive a reload that cannot send them, and reach the server in order once writes go through. Ordering, holds, backoff and refusals are unit tests in `packages/client/src/writes.test.ts`, and how waiting writes show in the cached lists is in `write-projections.test.ts`.

`e2e/shared-deck-join.spec.ts` owns sharing a deck: the owner turns on the join link, the fetched join page's title and Open Graph tags name the deck without card content, the page shows example cards, a signed-out classmate joins through the link, a repeat join changes nothing, and turning the link off keeps the member while the old URL admits nobody. The classmate signs up through the local email form from `/join/<token>?dev=1`, which carries the link through sign-in the same way Google sign-in does.

`e2e/import-from-anki.spec.ts` owns importing: a real Anki 26.09 export uploads from Import in Settings, the preview shows one of its cards and refuses Import until every kind of card is confirmed, the Workflow writes it, Library and Activity show it, archiving hides the decks it made and restoring brings them back, and the same file again offers to update rather than add. The fixtures and `fixtures/generate.py` that makes them live beside the Anki adapter; the adapter, reader and writer tests cover both containers, replay, duplicates and retries below the browser.

`e2e/import-from-mochi.spec.ts` owns the Mochi page: the fixture beside the Mochi adapter uploads from Import in Settings, the preview counts cards with no side break, and the import lands in Library and Activity. Re-import, archive and today's goal for Mochi are covered by the service tests.

`e2e/export.spec.ts` owns exporting: a deck's menu and Export library in Settings open the export sheet, the Workflow writes the file, the sheet offers the download, the download route returns the zip, and Activity lists the export. Round trips, the Anki collection, a member's history, expiry and audit are service tests in `services/exports.test.ts`; the SQLite writer is checked against `node:sqlite`.

`e2e/public-deck-page.spec.ts` owns a published deck's public page, read from the site's fixture decks: the page carries its cache headers, its content ETag and a 304, title, canonical and alternate links, JSON-LD, sitemap entry and every card in its HTML, and none of the fixture's private fields; a visitor sees the publisher, reads the sections in order, opens every card in the view that `#cards` also opens and Back closes, turns each card of the hand once to the lantern's ending, and without JavaScript still gets the deck, its sections and a dealt hand; the Ukrainian page carries its own chrome, an unknown deck or locale is 404, and a withdrawn or archived deck is 410 and absent from the sitemap. The site and product keep separate local D1 state, because two local runtimes sharing one crash on `SQLITE_BUSY` ([workers-sdk#14916](https://github.com/cloudflare/workers-sdk/issues/14916)); publishing through the product is covered by `published-deck-add.spec.ts` and the service tests.

`e2e/origin-boundary.spec.ts` proves that the site has no install contract while the product keeps its PWA, that the site exposes only its own indexing and keeps product APIs off its origin, and documents the one-time stale-site-data recovery; the product origin's own boundary is `app.test.ts`. `e2e/pwa-boundary.spec.ts` runs against the production product package in Chromium and proves that the manifest, installed service worker and offline sign-in shell remain product-owned.

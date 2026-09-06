# Testing

Lymi uses one canonical Playwright journey to prove that the browser, Worker, authentication, D1 persistence, and FSRS review path work together. The suite runs entirely against local Cloudflare bindings. It never uses production data or AI credentials.

## Commands

```bash
pnpm test             # unit tests and the CI impact rules
pnpm test:e2e         # Chromium desktop and an iPhone-sized WebKit browser
pnpm test:e2e:ui      # Playwright's interactive UI
pnpm exec playwright show-report
```

Install the configured browsers once on a new machine:

```bash
pnpm exec playwright install chromium webkit
```

`scripts/e2e-server.mjs` clears only `apps/web/.wrangler/e2e`, applies every D1 migration there, and starts Vite with local-only credentials. It does not touch the normal `.wrangler/state`, a developer's `.dev.vars`, or any remote Cloudflare binding.

## CI policy

Formatting, typechecking, unit tests, and the production build run on every pull request. The Playwright steps run when `scripts/e2e-impact.mjs` sees production-affecting files. Pushes to `main` always include E2E. A manual run includes it by default and can explicitly skip it.

Comment `/e2e` on a pull request to force a run without adding a label. The command accepts only the repository owner and only branches in this repository. A newer commit cancels an obsolete in-progress run.

Failed browser runs retain screenshots, video from the retry, a Playwright trace, and the HTML report as a GitHub Actions artifact for seven days. Successful runs retain no browser artifacts.

## Canonical coverage

`e2e/core-learning-flow.spec.ts` owns the smallest complete learner journey:

1. Create a local account through the UI.
2. Seed a deck through the authenticated API as test setup.
3. Add a word and meaning through the UI.
4. Review and grade the due card.
5. Reload and confirm the persisted result.

Keep this path real. Use accessible roles and labels, do not mock Lymi's own APIs, do not use fixed sleeps, and do not add test-only application routes. Prefer public APIs for setup that is not the behavior under test. Add focused journeys only when they protect another critical user outcome that the canonical path cannot express clearly.

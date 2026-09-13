# Lymi website and product

Lymi has two permanent origins and two independent Cloudflare Workers. `lymi-site` serves the public website and documentation at `https://lymi.app`. The existing `lymi` Worker serves the product, authentication and backend at `https://my.lymi.app`. The repository configuration is ready for this split, but production remains unverified until OAuth, both Workers Builds pipelines, the custom-domain handoff and signed-in smoke checks are confirmed.

## Origin contract

| Origin and path | Owner | Purpose |
| --- | --- | --- |
| `lymi.app/` | `apps/site` | Prerendered public landing page with interactive React islands. It remains visible whether or not a product session exists. |
| `lymi.app/join` | `apps/site` | Public private-beta information and invitation request. |
| `lymi.app/privacy`, `/terms`, `/support` | `apps/site` | Public privacy, service terms and support information. |
| `lymi.app/docs/*` | `apps/site` | Public documentation, MCP setup and API reference. |
| `lymi.app/api/beta` | `apps/site` Worker | Website-owned beta signup action. |
| `lymi.app/api/health` | `apps/site` Worker | Public deployment identity and active version. |
| `my.lymi.app/` | `apps/web` | Session-aware product entry. A valid session opens Today; otherwise it opens sign-in. |
| `my.lymi.app/app`, `/today`, `/library`, `/review`, `/you`, `/activity`, `/archived`, `/insights` | `apps/web` | Product screens. Private data requires authentication. |
| `my.lymi.app/login`, `/consent` | `apps/web` | Sign-in and integration authorization. |
| `my.lymi.app/api/*` | `apps/web` Worker | Product and integration API, Better Auth, OpenAPI and product health. |
| `my.lymi.app/mcp`, `/.well-known/*` | `apps/web` Worker | MCP endpoint and OAuth discovery. |

The product Worker permanently redirects `/docs`, `/docs/*`, `/join`, `/privacy`, `/terms` and `/support` to the public origin while preserving path and query. Every other unknown browser path returns the product 404 or authenticated SPA behavior; it cannot fall through to a public landing page. The public Worker serves its prerendered routes and returns 404 for product API paths. There is no `api.lymi.app`.

Having an account is different from being signed in. An existing learner with an expired product session reaches sign-in and returns to the original safe product path after authenticating. Return paths must be internal product routes; protocol-relative, external, malformed, hashed and authentication routes fall back to Today. Joining the beta list does not create an account, and access remains limited to the product's configured email allowlist.

The public landing page's Open Lymi link always goes to the product root and lets that origin resolve session state. The product's You screen links back to the public website. Authentication cookies remain host-only on `my.lymi.app` and are never sent to the website.

## Deployment and PWA boundary

`apps/site` uses Astro static output and a small Worker in front of the asset binding. It has no SPA fallback, service worker, PWA manifest, authentication, product API, MCP, R2, KV or cron. Its only data binding is D1 for the existing `beta_signups` table. Static pages own canonical metadata, sitemap and public indexing.

`apps/web` remains the Vite React PWA and Hono Worker. It owns the product SPA fallback, Workbox service worker, manifest, offline cache, review outbox, notification icons and reminder destinations. Product HTML always sends `noindex, nofollow`, and product `robots.txt` disallows all crawling.

CI's artifact boundary check fails if the public build contains service-worker or manifest markers, or if the product build contains known landing, documentation or public-signup markers. That structural check complements browser coverage of the route and indexing contracts.

## Documentation structure

Documentation source lives in `apps/site/src/components/docs`, with one Astro page per public route in `apps/site/src/pages/docs`. The navigation registry drives the sidebar, next-page links and search.

| Path | Purpose |
| --- | --- |
| `/docs` | What the API is and which way in to choose. |
| `/docs/quickstart` | Make a key, add a card and see it in the app. |
| `/docs/authentication` | Keys, scopes, rate limit and error codes. |
| `/docs/cards` | Card shape, duplicate rules, directions and FSRS. |
| `/docs/recipes` | Import a word list, safely re-run a script and back up a deck. |
| `/docs/api` | Browser-rendered reference loaded from `https://my.lymi.app/api/openapi.json` without credentials. |
| `/docs/mcp`, `/docs/mcp/claude`, `/docs/mcp/chatgpt` | Connecting an assistant to `https://my.lymi.app/mcp`. |

The product OpenAPI route permits CORS only for the exact public website origin and does not permit credentials. `my.lymi.app/api/docs` redirects to the public API reference. Privacy, terms and support are top-level public routes so they remain stable for people, connected apps and provider listings.

## Commands and configuration

- `pnpm dev` runs the public Astro server and product Vite/Worker server together at separate loopback origins.
- `pnpm deploy:check:site` builds and validates only the public deployment package.
- `pnpm deploy:check:product` builds and validates only the product deployment package.
- `pnpm deploy:health:site` checks `lymi.app` for the `lymi-site` health identity.
- `pnpm deploy:health:product` checks `my.lymi.app` for the `lymi-product` health identity.
- `apps/site/wrangler.jsonc` owns the `lymi-site` Worker, apex custom domain, static assets, beta D1 binding and preview URLs.
- `apps/web/wrangler.jsonc` owns the existing `lymi` Worker, product custom domain, backend bindings, secrets, cron and disabled preview URLs.
- `apps/web/src/server/origin-routing.ts` enforces product-only paths and public-route redirects before the product SPA fallback.

Browser E2E uses `http://localhost:4174` for the website, `http://localhost:4173` for interactive product journeys and `http://localhost:4175` for the production-built product package. It builds both apps, starts each Worker with isolated local state, and exercises the route boundary, product journeys, installed service worker and offline shell in one test run.

## Reversible production cutover

1. In Google Cloud, confirm `https://my.lymi.app` as an authorized JavaScript origin and `https://my.lymi.app/api/auth/callback/google` as an authorized redirect URI.
2. Run `pnpm verify`, `pnpm deploy:check` and `pnpm test:e2e` on the intended commit.
3. Configure a product Workers Builds project rooted at the repository, watching `apps/web/**`, `packages/core/**`, `scripts/apply-migrations-ci.mjs` and root workspace files. Build with `pnpm verify`; deploy with `pnpm --filter @lymi/web run deploy:ci` using a custom build token with D1 edit access.
4. Configure a public-site Workers Builds project with the same root, watching `apps/site/**`, `apps/web/migrations/**`, `packages/core/**`, `scripts/apply-migrations-ci.mjs` and root workspace files. Build with `pnpm verify`; deploy with `pnpm --filter @lymi/site run deploy:ci` using a custom build token with D1 edit access.
5. Upload a public-site preview version and verify landing, Join, beta signup, docs, metadata, sitemap, 404 behavior and absence of any service-worker registration before changing the apex domain.
6. Deploy and verify the product Worker on `my.lymi.app`, including signed-in and signed-out roots, a safe deep link through Google sign-in, API keys, MCP OAuth, PWA installation, offline startup and one reminder delivery.
7. Move only the `lymi.app` custom domain from the product Worker to `lymi-site`, then run both health commands and compare each reported tag with the intended commit.
8. If the apex checks fail, restore `lymi.app` to the existing product Worker. Do not remove the old route ownership until the public Worker is verified.

The deploy and production migration commands remain user-owned. A green build or preview is not proof that the corresponding custom domain is serving that version.

## One-time browser recovery

If an existing `my.lymi.app` tab or installed app still renders the old public shell, clear the stored site data for `my.lymi.app`, including its service worker and caches, then close and reopen the tab or app. Unregistering a worker does not stop it from controlling its current open document, so reopening is required. Sign in again and re-enable reminders if the browser discarded the push subscription.

This sequence is explicitly covered by browser tests. There is no permanent recovery endpoint because Lymi currently has one learner and the stale state is a one-time deployment migration.

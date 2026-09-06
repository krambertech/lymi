# Lymi website and app

This document describes the permanent origin boundary implemented by the application and the remaining production activation work. The repository is configured for both origins, but the boundary is not production-verified until the OAuth configuration and both Cloudflare custom domains are active and the deployed version passes the smoke checks below.

One `lymi` Cloudflare Worker serves two allowlisted origins. `https://lymi.app` owns the public website and documentation. `https://my.lymi.app` owns the product, authentication, API, MCP server, OAuth discovery, PWA and review reminders. Cloudflare custom domains manage the DNS records and HTTPS certificates: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/.

## Origin contract

| Origin and path | Purpose |
| --- | --- |
| `lymi.app/` | Public landing page, server-rendered by the Worker and hydrated by React. It remains visible whether or not a product session exists. |
| `lymi.app/join` | Public private-beta information. |
| `lymi.app/docs/*` | Public documentation, MCP setup and API reference. |
| `lymi.app/api/beta` | Website-owned beta signup action. |
| `my.lymi.app/` | Session-aware product entry. A valid session opens Today; otherwise it opens sign-in. |
| `my.lymi.app/app`, `/today`, `/library`, `/review`, `/you`, `/activity`, `/archived`, `/insights` | Product screens. Private data requires authentication. |
| `my.lymi.app/login`, `/consent` | Sign-in and integration authorization. |
| `my.lymi.app/api/*` | Product and integration API, including Better Auth and OpenAPI. |
| `my.lymi.app/mcp`, `/.well-known/*` | MCP endpoint and OAuth discovery. |

Browser product paths requested on `lymi.app` permanently redirect to the matching path and query on `my.lymi.app`. Documentation and Join requested on `my.lymi.app` permanently redirect to `lymi.app`. Product protocol routes on the public origin return 404 instead of forming a compatibility API. Requests for an unconfigured hostname return 421 before Hono or the static asset fallback runs.

Having an account is different from being signed in. An existing learner with an expired product session reaches sign-in and returns to the original safe product path after authenticating. Return paths must be internal product routes; protocol-relative, external, malformed, hashed and authentication routes fall back to Today. Joining the beta list does not create an account, and access remains limited to the configured email allowlist.

The landing page has one stable meaning whether or not someone is signed in. Its Open app link always goes to the product root and lets that origin resolve session state. The product's You screen provides the route back to the public website.

## PWA boundary

Only product HTML advertises the PWA. The manifest, service worker, install flow, offline shell, notification icons and reminder destinations belong to `my.lymi.app`. Public HTML strips PWA metadata and does not register a service worker.

The public `/sw.js` is a temporary retirement worker. It activates immediately, clears old same-origin caches, unregisters itself and refreshes controlled windows. The public client also unregisters and clears old public-origin state as a second cleanup path. Other public PWA files return 404.

## Documentation structure

The documentation lives at `lymi.app/docs` outside the product shell, so it reads signed out and stays readable while signed in. Pages are declared once in `apps/web/src/client/docs/nav.ts`, which the sidebar, next-page links and search all use.

| Path | Purpose |
| --- | --- |
| `/docs` | What the API is and which way in to choose. |
| `/docs/quickstart` | Make a key, add a card and see it in the app. |
| `/docs/authentication` | Keys, scopes, rate limit and error codes. |
| `/docs/cards` | Card shape, duplicate rules, directions and FSRS. |
| `/docs/recipes` | Import a word list, safely re-run a script and back up a deck. |
| `/docs/api` | Browser-rendered reference loaded from `https://my.lymi.app/api/openapi.json` without credentials. |
| `/docs/mcp`, `/docs/mcp/claude`, `/docs/mcp/chatgpt` | Connecting an assistant to `https://my.lymi.app/mcp`. |

The product OpenAPI route permits CORS only for the exact public website origin and does not permit credentials. `my.lymi.app/api/docs` redirects to the public API reference. Still to write: `/docs/privacy`, once the policies and capabilities are defined.

## Configuration

- `apps/web/wrangler.jsonc`: both custom domains, `PUBLIC_SITE_URL=https://lymi.app`, `PRODUCT_URL=https://my.lymi.app` and Worker-first hostname dispatch.
- `apps/web/src/server/origin-routing.ts`: the allowlisted hostname and path matrix, redirects and old service-worker retirement response.
- `apps/web/src/server/landing.tsx`: request-time landing markup, canonical public URL and social metadata.
- `apps/web/src/server/auth.ts`: Better Auth canonical product URL and product-only trusted origin.
- `apps/web/vite.config.ts`: product PWA start URL and navigation fallback boundary.

Local development deliberately uses one loopback origin for both surfaces. Public paths render as public pages and all other paths render the product, so the production hostname matrix is covered by pure Worker tests while the full interface remains convenient at `http://localhost:5173`.

## Production activation

1. In Google Cloud, add `https://my.lymi.app` as an authorized JavaScript origin and `https://my.lymi.app/api/auth/callback/google` as an authorized redirect URI before routing learners to the product origin.
2. Confirm both `lymi.app` and `my.lymi.app` are active custom domains for the `lymi` Worker. The repository route configuration creates the records on deployment, but production activation must confirm certificate and route status in Cloudflare.
3. Run `pnpm verify`, `pnpm deploy:check` and the full `pnpm test:e2e` gate.
4. Apply any pending production migrations, then run the user-owned `pnpm run deploy` command.
5. Run `pnpm deploy:health` and compare its reported Worker tag with the intended commit. A green Workers Build alone does not prove that version is active.
6. Smoke-check the public landing page and docs, the product root signed in and signed out, a protected deep link through Google sign-in, OpenAPI loading in the public docs, MCP discovery and connection, PWA installation, offline navigation and one review-reminder delivery.
7. Confirm the apex retirement worker has removed the previous service worker and caches from an existing browser profile. Existing sessions, push subscriptions and MCP connections may need to be established again on the product origin.

Moving every product screen under `/app/*` or extracting the public website into another deployable can be considered later. Neither changes the permanent public URLs established here.

# Lymi website and app

This document describes the deployed domain boundary and the accompanying landing-page work. The
domain configuration and old-host redirect are in place, the documentation site lives at `/docs`,
and the landing page is implemented as server-rendered React in the current branch.

Lymi uses one origin, `https://lymi.app`, served by the existing `lymi` Cloudflare Worker. A custom domain lets Cloudflare manage the DNS record and HTTPS certificate: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/.

## Website and app structure

| Path | Purpose |
| --- | --- |
| `/` | Public landing page, server-rendered by the Worker and hydrated by React. |
| `/app` | Convenient entry point that redirects to `/today`. |
| `/today`, `/decks`, `/review`, `/settings` | Existing app screens; private data requires authentication. |
| `/login`, `/consent` | Sign-in and integration authorization. |
| `/docs` | Public documentation: guides, MCP setup, and the API reference. Reads signed out. |
| `/api/*` | App and integration API, with its existing authentication and scope checks. |
| `/mcp`, `/.well-known/*` | MCP endpoint and OAuth discovery. |

Having an account is different from being signed in: an existing user with an expired session sees the landing page and can use its sign-in link. Joining the beta list does not create an account. Access remains limited to the configured email allowlist.

The landing page has one stable meaning whether or not someone is signed in. Its first response
contains the copy, structure, canonical URL, and social metadata; React hydration adds the beta form
and animation. The service worker's app navigation fallback excludes `/`, while `/today` is the
installed PWA's start URL. `/index.html` remains the exact offline app shell instead of redirecting
to `/`. Public HTML uses revalidation rather than the private app-shell cache.

## Landing page structure

The existing first page provides:

1. Brand and a clear promise: a calmer home for personal vocabulary.
2. Beta signup and an illustrative vocabulary card.
3. How the habit works: collect words and revisit them with spaced repetition.
4. API and planned AI workflows, distinguishing available features from planned ones.
5. A closing invitation, API documentation, sign-in, and the email-use notice.

## Documentation structure

The documentation is built. It lives in the app's own router at `/docs`, outside the app shell, so it reads signed out and stays readable while signed in. Pages are declared once in `apps/web/src/client/docs/nav.ts`, which is what the sidebar, the next-page links and search all read.

| Path | Purpose |
| --- | --- |
| `/docs` | What the API is, and which of the two ways in to pick. |
| `/docs/quickstart` | Make a key, add a card, see it in the app. |
| `/docs/authentication` | Keys, scopes, rate limit, every error code. |
| `/docs/cards` | The shape of a card, the duplicate rule, directions, FSRS. |
| `/docs/recipes` | Import a word list, re-run a script safely, back a deck up. |
| `/docs/api` | The reference, rendered in the browser from `/api/openapi.json`. |
| `/docs/mcp`, `/docs/mcp/claude`, `/docs/mcp/chatgpt` | Connecting an assistant. |

`/api/docs`, which served the generated Scalar page, now redirects to `/docs/api`, so links already sent still land.

Still to write: `/docs/privacy`, covering data handling, exports and deletion, once those policies and capabilities are defined.

Moving every app screen under `/app/*` can be considered later; it is unnecessary for sharing a domain and would require coordinated router, OAuth, installed PWA, and bookmark redirects.

## Deployment configuration

- `apps/web/wrangler.jsonc`: custom domain and `APP_URL=https://lymi.app`.
- `apps/web/src/server/landing.tsx`: request-time landing markup, canonical URL, and social metadata.
- `apps/web/vite.config.ts`: PWA start URL and navigation-fallback boundary.
- Google OAuth production origin: `https://lymi.app`.
- Google OAuth production callback: `https://lymi.app/api/auth/callback/google`.
- Localhost remains registered for development. The old Workers URL redirects application requests to the custom domain. Static assets may still be served directly from the old host.

Sessions belong to their origin, so a user signed in on the old hostname must sign in again on `lymi.app`. Existing MCP connections may need to be reconnected because the OAuth issuer and resource URL change with the origin.

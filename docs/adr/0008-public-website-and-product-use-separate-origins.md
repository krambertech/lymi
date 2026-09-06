---
status: accepted
date: 2026-09-06
---

# The public website and product use separate origins

Lymi will establish two permanent public origins before more learners, installed PWAs and integrations make a migration expensive. `https://lymi.app` is the public website and documentation. `https://my.lymi.app` is the product, authentication, product API, MCP server and OAuth discovery. Both origins initially remain on the existing Cloudflare Worker; separating the website into another application and deployment is a later decision.

[ADR 0009](0009-public-website-and-product-deploy-separately.md) supersedes only the initial one-Worker deployment choice. The origin, authentication and backend decisions in this record remain current.

The public website is always reachable, whether or not the learner has a product session. It does not inspect authentication or automatically redirect a signed-in learner. Its stable Open app link goes to `my.lymi.app`, where a valid session opens Today and a missing session opens sign-in. Product deep links survive sign-in, and the product provides an explicit way back to the public website.

The product backend stays on the product origin: REST routes use `my.lymi.app/api/*`, MCP uses `my.lymi.app/mcp`, and OAuth discovery uses `my.lymi.app/.well-known/*`. There is no `api.lymi.app`. Session cookies remain host-only to `my.lymi.app`; the website neither receives nor shares them.

Public documentation stays at `lymi.app/docs`. The API reference reads the OpenAPI document from `my.lymi.app/api/openapi.json`. Website-owned actions, including private-beta signup, remain on the public origin rather than becoming part of the product API.

## Considered options

- Keep the website, product and backend on `lymi.app`. Rejected: the public root and authenticated product already need conflicting redirect and service-worker behavior, and postponing the public boundary makes installed apps and integration URLs more expensive to migrate.
- Add `api.lymi.app` as a third origin. Rejected: the product and its backend benefit from same-origin sessions, API calls and offline replay. A third origin would add CORS, cookie and CSRF complexity without a current consumer that needs an independent API identity.
- Create a separate Astro website and Cloudflare deployment now. Rejected for this slice: the immediate goal is to establish stable origins and navigation. The existing Worker can serve multiple custom domains, while a future `apps/site` can take over `lymi.app` without another public URL migration.
- Redirect signed-in visitors from `lymi.app` to the product or share the product session across subdomains. Rejected: the website must remain deliberately accessible, and a static Open app link lets the product origin handle authentication without broadening the session cookie's scope.

## Migration

There are no external users or integrations to preserve, so this is a clean cutover. Browser product routes on `lymi.app` redirect to the matching path and query on `my.lymi.app`. Old API, MCP and OAuth endpoints do not need compatibility behavior. Existing sessions, installed PWA state, push subscriptions and MCP connections may be discarded and established again on the product origin.

The old service worker on `lymi.app` must be retired so it cannot intercept the public website after the cutover. The PWA manifest, service worker, notification destinations and installation flow move to `my.lymi.app`.

## Consequences

- Superseded by ADR 0009: the initial Worker routed by an allowlisted request hostname before path fallbacks and both custom domains invoked it; each domain now has its own deployment.
- Better Auth has one canonical production base URL, `https://my.lymi.app`, and does not enable cross-subdomain cookies.
- Google OAuth must allow `https://my.lymi.app` and its Better Auth callback before production activation.
- Unauthenticated product navigation must preserve a safe internal return path through sign-in instead of always returning to a fixed page.
- Public docs need the product OpenAPI URL explicitly rather than deriving every API and MCP URL from the documentation page's origin.
- The public OpenAPI response must permit the documentation site to read it across origins without opening credentialed product routes to cross-origin browser requests.
- A later public-site extraction changes deployment ownership, not the public domain model.

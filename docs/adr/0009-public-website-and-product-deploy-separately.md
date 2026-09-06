---
status: accepted
date: 2026-09-06
supersedes: 0008 initially-one-worker deployment choice
---

# The public website and product deploy separately

Lymi deploys its two permanent origins as two Cloudflare Workers in the existing monorepo. `apps/site` is an Astro static site plus a narrow Worker for `https://lymi.app`. `apps/web` remains the Vite React PWA and Hono Worker for `https://my.lymi.app`. This supersedes only ADR 0008's initial choice to serve both origins from one Worker; its domain, host-only authentication and product-backend decisions remain current.

The separation is a lifecycle boundary, not a duplicate deployment. The public build owns the landing page, documentation, indexing metadata and beta signup. It contains no product service worker or authenticated shell. The product build owns authentication, API, MCP, OAuth discovery, PWA, reminders, D1-backed product services, R2 and KV. It contains no landing or documentation pages. Product documentation paths redirect to the public origin.

The public pages are prerendered by Astro and interactive React components hydrate as islands. A small public Worker serves the assets, `/api/health` and `/api/beta`; beta signup is the only website-owned database action, and its D1 binding exists solely to write the existing `beta_signups` table. The product remains a client-rendered React PWA behind Hono because its state, offline and authentication requirements have not changed.

## Context

After the two-origin boundary reached production, an existing browser opened `my.lymi.app` while a stale service worker rendered the older public landing shell there. The current Worker and a clean browser behaved correctly, so the incident did not invalidate the origin contract. It showed that the public website and offline product have different caching and release lifecycles, and that shipping both clients in one bundle made recovery unreliable.

## Considered options

- Keep one Worker and add more service-worker retirement logic. Rejected: it could repair the observed state, but every public deploy would continue sharing the product's offline shell and release risk.
- Deploy the combined bundle twice. Rejected: two Workers would not create isolation if either artifact could still render both surfaces.
- Extract a static Astro site and retain the product Worker. Accepted: it gives content-oriented routing and build-time HTML to the website while preserving the product architecture and established URLs.
- Use a second full-stack React Worker for the website. Rejected: the public surface is content-oriented and does not need the product router, authenticated state or SPA fallback.
- Introduce `api.lymi.app` or a third beta backend. Rejected: same-origin sessions keep the product backend simpler, while a third service would be speculative overhead for one narrow website action.
- Extract shared design or UI packages during the split. Deferred: the current duplication is explicit and reversible, and shared packages should follow proven independent consumers rather than precede them.

## Consequences

- The website and product have independent Worker names, build artifacts, preview uploads, custom-domain routes and health checks.
- CI builds both apps and rejects a site artifact containing PWA assets or a product artifact containing known public-page markers.
- A website deploy cannot update or install the product service worker, and the product SPA fallback cannot serve public pages.
- The public Worker receives a D1 binding for beta signup but no authentication, R2, KV, cron, MCP or product API configuration.
- The product Worker keeps its existing `lymi` name, bindings and secrets so the split does not create an unrelated backend migration.
- Brand assets and foundational styles are temporarily duplicated; their generators update both destinations, and extraction waits for a stable shared API.
- Production activation requires two Workers Builds projects or equivalent independently scoped pipelines, with app-specific watch paths and deploy commands.

## Migration and recovery

The product Worker can be deployed and verified on `my.lymi.app` before the apex route changes. The site Worker must pass a preview upload and production-shaped checks before `lymi.app` is moved from the product Worker. Until the custom-domain switch is verified, rolling `lymi.app` back to the existing product Worker remains possible.

The previously observed stale state on `my.lymi.app` has a one-time recovery: clear the site's stored data, including its service worker and caches, then close and reopen the app. An unregistered worker can continue controlling its current open document, so reopening is part of the tested sequence. No permanent recovery route is added for a single-learner migration.

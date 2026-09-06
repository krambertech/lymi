# Public website and product app architecture

**Status:** Accepted 6 September 2026 by [ADR 0009](../adr/0009-public-website-and-product-deploy-separately.md). [ADR 0008](../adr/0008-public-website-and-product-use-separate-origins.md) remains the authority for the permanent origins, authentication boundary and product-owned backend.

## Why this exists

Lymi first established `lymi.app` and `my.lymi.app` as separate origins on one Worker. After activation, an existing browser reached the product origin while a stale service worker rendered the older public landing shell. Clean browsers and the Worker behaved correctly, but the event confirmed that the public website and offline product have different deployment and caching lifecycles.

## Accepted shape

```text
lymi/
  apps/
    site/       Astro public website + narrow Cloudflare Worker
    web/        Vite React PWA + Hono product Worker
  packages/
    core/       Domain types, schemas and scheduling logic
```

| Surface | Origin | Responsibility |
| --- | --- | --- |
| Public website | `lymi.app` | Landing page, documentation, public metadata and beta signup |
| Product | `my.lymi.app` | Sign-in, decks, cards, review, offline PWA and reminders |
| Product backend | `my.lymi.app` | API, auth, MCP, OAuth discovery, AI, audio and product services |

The two apps are independently buildable and deployable. They are not two deployments of the same bundle: the public artifact has no product service worker, and the product artifact has no public landing or documentation routes.

## Why Astro for the website

Astro produces static HTML for the content-oriented public surface and hydrates the existing interactive React sections as islands. This preserves useful initial HTML, canonical metadata and the current interactions without bringing the product router, authentication state or SPA fallback into the public deployment. Static output also works directly with Cloudflare Workers static assets; an Astro server adapter is unnecessary until a genuinely request-time public page exists.

The public Worker handles only `/api/health`, `/api/beta` and the static asset binding. Beta signup remains a website-owned action and writes the existing `beta_signups` table through a narrowly scoped D1 binding. It does not create an account or make the product API cross-origin.

## Why the product stays React and Hono

The product already benefits from TanStack Router and Query, Better Auth, Hono, the offline shell, background review replay and Web Push. Moving it into Astro would not improve the learning flow and would combine the lifecycles again. The product Worker retains the existing `lymi` Worker identity, D1, R2, KV, secrets and cron trigger.

The backend remains on `my.lymi.app`; no `api.lymi.app` is introduced. Same-origin session and API calls avoid new cookie, CORS and CSRF complexity. Public API documentation reads only the OpenAPI document through its existing exact-origin, credential-free CORS rule.

## Sharing boundary

The split does not create speculative design, brand or UI packages. Public components and foundational CSS currently live under `apps/site`; product components remain under `apps/web`; stable domain types used by both remain in `packages/core`. The brand generator writes both apps' public SVG destinations so duplication cannot silently drift; product-only PWA icons stay in `apps/web`. A shared package should be extracted only when two independent consumers need a stable component or token API.

## Deployment boundary

Each app has its own Wrangler configuration, custom domain, preview policy, deploy command and health identity. The site uses preview URLs because it has no canonical-origin authentication. The product keeps preview URLs disabled because Better Auth has one canonical origin.

Root verification still proves repository coherence, while app-scoped commands support independent delivery. CI builds both artifacts and checks the cross-artifact invariants. Production Workers Builds should use separate projects and watch paths so a site-only change does not deploy the product and a product-only change does not deploy the site.

## Migration

The migration stays reversible until the public preview and both production-shaped packages pass. Deploy and verify the product Worker on `my.lymi.app`, preview the site Worker, then move only the `lymi.app` custom domain to `lymi-site`. If that switch fails, restore the apex route to the existing product Worker while the repository change is still unmerged or easily reverted.

For the one previously affected learner, clear stored data for `my.lymi.app`, including service workers and caches, then close and reopen the app. This recovery is tested. A permanent recovery endpoint would add long-lived product behavior for a one-time migration and is intentionally absent.

## Deferred work

- A blog, localization and public shared objects remain separate product decisions.
- A shared design or UI package waits for demonstrated reuse.
- A third backend origin waits for a consumer that genuinely needs an independent API identity.

## References

- [Astro framework components](https://docs.astro.build/en/guides/framework-components/)
- [Astro static output](https://docs.astro.build/en/guides/on-demand-rendering/)
- [Cloudflare Workers static assets](https://developers.cloudflare.com/workers/static-assets/)
- [Cloudflare Workers Builds monorepos](https://developers.cloudflare.com/workers/ci-cd/builds/advanced-setups/)

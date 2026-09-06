# Public website and product app architecture

**Status:** Partially accepted 6 September 2026. [ADR 0008](../adr/0008-public-website-and-product-use-separate-origins.md) accepts `lymi.app` for the public website and `my.lymi.app` for the product and backend, initially on the existing Worker. A separate Astro website and deployment remain a future option, not an implementation decision.

## Why this exists

Lymi currently ships the public landing page and the authenticated product from `apps/web`. The
landing page is server-rendered by the Hono Worker and hydrated by React. The signed-in product is a
client-rendered React PWA with an offline shell and service worker.

That is a reasonable shape for one public page. It becomes less comfortable if the public surface
grows into a blog, documentation, localized pages, and shareable public objects. Those pages want
content-oriented routing, strong metadata, mostly static HTML, and public-page caching. The product
wants authentication, application state, offline behavior, and a tightly scoped service worker.

This proposal records a deliberately small separation between those concerns. It does not approve a
migration, add a blog or localization, or change the current deployment.

## Proposed shape

Keep one repository and the existing pnpm workspace, but use two independently deployable apps:

```text
lymi/
  apps/
    site/       Astro public website
    web/        Existing Vite React PWA and Hono Worker
  packages/
    core/       Existing domain types, schemas, and scheduling logic
    design/     Shared design tokens, fonts, and foundational CSS, when extracted
    brand/      Shared logo, icons, and illustration assets, when extracted
    ui/         Shared React components only when real duplication justifies it
```

| Surface | Initial home | Responsibility |
| --- | --- | --- |
| Public website | `lymi.app` | Landing pages, blog, documentation, localization, and SEO |
| Product app | `my.lymi.app` | Sign-in, decks, cards, review, You, and offline PWA behavior |
| Backend | Remains with the product initially | API, auth, MCP, AI, audio, and product services |

An `api.lymi.app` hostname could be considered later if a stable developer-facing API identity is
valuable. It is not needed merely to split the website from the product.

## Why Astro for the public website

Astro matches the likely public-site needs without requiring every page to ship a full client-side
React application:

- build-time HTML is the default for content that changes only when the site is deployed;
- individual React components can still render inside Astro pages and hydrate only when they need
  browser interaction;
- content collections give blog posts and similar structured content a typed local home;
- built-in internationalization routing can support localized URL structures when localization is
  ready;
- the Cloudflare adapter can add on-demand rendering to selected routes if a future public page truly
  needs request-time data.

Public content should be prerendered by default. Server rendering is a tool for genuinely dynamic
routes, not a requirement for good indexing. Both prerendered and request-time rendered pages send
useful HTML and metadata in the initial response.

## Why the product stays React

The authenticated product already benefits from React, TanStack Router and Query, Hono, and its PWA
service worker. Moving it into Astro would not make the learning experience better and would create a
large migration for little value.

The proposed boundary leaves the product architecture intact. `apps/web` remains responsible for
application state, authentication, offline review behavior, API and MCP endpoints, and the current
Cloudflare data bindings.

## Why two apps instead of extending one

A single hybrid React app remains technically possible. It is less attractive as the public surface
grows because the website and product have different operational boundaries:

- a website deploy should not risk changing the product service worker or authenticated shell;
- the product's SPA fallback and offline cache should not intercept public navigations;
- content pages should be easy to create without entering the product router and state model;
- blog and localized content should have a natural file and URL structure;
- each app should be able to evolve and deploy without rebuilding the other unnecessarily.

This separation also responds to problems already observed in the current combined deployment: a
stale PWA service worker could obscure a newly deployed landing page, and importing the landing SSR
bundle into the Worker affected unrelated Worker tests. These are solvable problems, but they show
that the two surfaces already have different lifecycles.

## Why one repository instead of two

The existing pnpm workspace already supplies the useful monorepo behavior: one install, one lockfile,
workspace package links, and root-level checks. No Turborepo, Nx, or additional monorepo service is
proposed.

The two apps are part of one product and should stay easy to change together. A logo update, token
change, or shared interactive demonstration can be reviewed in one pull request. Separate
repositories would add versioning and publishing work without providing meaningful isolation at this
stage.

Each app should have its own build and deployment command. Root checks can continue to use pnpm
workspace recursion and filters. More orchestration should be introduced only if build time or CI
coordination becomes a measured problem.

## What should be shared

Start with the most stable foundations:

- color, typography, spacing, and motion tokens;
- font files and foundational CSS;
- the Lymi wordmark, lantern, icons, and illustration assets;
- framework-independent types or schemas that genuinely apply to both surfaces;
- selected React components used by both apps, such as an interactive card demonstration or beta
  form.

Astro can render React components directly and hydrate interactive ones as islands. Shared React code
should therefore remain possible without turning the entire website into a React SPA.

## What should stay separate

Do not create a universal component library before there is evidence for one. Keep these inside their
own app by default:

- page layouts, navigation, headers, and footers;
- product routing, authentication state, data fetching, and offline behavior;
- blog templates and content-specific website components;
- components that merely look similar but serve different interaction or accessibility needs.

`packages/design` and `packages/brand` are sensible early extractions. Add `packages/ui` only after at
least two real consumers need the same component API. This keeps reuse practical rather than
aspirational.

## Rendering by route

| Route type | Default rendering | Reason |
| --- | --- | --- |
| Landing and marketing pages | Prerendered | Fast, cacheable, indexable, and content changes at deploy time |
| Blog and documentation | Prerendered from content collections | Stable HTML, metadata, feeds, and sitemaps |
| Localized public content | Prerendered locale routes | Explicit indexable URLs and predictable fallbacks |
| Future public shared deck | On-demand server rendering | Per-request data, privacy checks, and link-preview metadata |
| Authenticated product | Client-rendered PWA | Rich state, offline behavior, and no public indexing requirement |

A future public shared deck still requires its own product and privacy decision. This proposal only
reserves an appropriate rendering option for it.

## Deployment and domain implications

The website and product would become separate Cloudflare deployables even though they remain in one
repository. The exact Cloudflare project and Worker configuration should be validated in an
implementation spike before an ADR is accepted.

Moving the product from the apex domain to `my.lymi.app` needs more care than creating `apps/site`:

- Better Auth callback, issuer, cookie, and trusted-origin configuration;
- API key and MCP endpoint URLs already used by clients;
- CORS and CSRF boundaries for any website form that calls the product backend;
- PWA manifest scope, start URL, installed-app behavior, and service-worker scope;
- redirects or temporary compatibility routes for existing bookmarks and integrations;
- canonical URLs, sitemap ownership, analytics, and deployment health checks.

The product Worker and backend should remain one deployable initially. Splitting the backend onto a
third hostname or into another service is explicitly outside this proposal.

## Low-risk migration sequence, if approved

1. Add `apps/site` to the existing pnpm workspace and reproduce the current landing page without
   changing production routing.
2. Extract only the brand assets and design foundations needed by both apps.
3. Verify HTML output, metadata, responsive layout, reduced motion, interactive animations, beta
   signup, and visual parity.
4. Configure independent preview deployments and app-scoped CI commands.
5. Move the product to `my.lymi.app`, with verified auth, API, MCP, PWA, and compatibility behavior.
6. Point `lymi.app` at the website only after both production surfaces pass smoke tests.
7. Remove the old landing renderer and public service-worker exceptions from `apps/web` after the new
   site is proven.

The migration should remain reversible until the domain switch is verified. There should be no
period where the landing page is removed from the current app before the replacement is live.

## Costs and trade-offs

This structure adds:

- a second application build and Cloudflare deployment;
- a domain boundary to consider for auth links and website-to-product forms;
- some duplicated page-level CSS or components where forced sharing would be worse;
- a migration and compatibility pass when the product moves to `my.lymi.app`.

In return, the public website gets a content-first architecture and the product keeps its focused PWA
architecture. The monorepo keeps shared work straightforward without coupling the two runtimes.

## Questions to resolve before implementation

1. Which current API, OAuth, MCP, and PWA URLs must remain backward compatible?
2. Should the beta form post directly to the product Worker, or through a narrow website endpoint?
3. Which design foundations are stable enough to extract immediately?
4. Should the default language remain unprefixed while translations use locale prefixes?
5. Which public routes, if any, need request-time rendering in the first version?
6. What independent preview and production checks are required for each app?
7. Does the current Cloudflare account configuration favor static assets or an Astro Worker for the
   initial site deployment?

## Trigger for a decision

Write an ADR and implementation plan before adding a second substantial marketing page, a blog,
localization, or a public object page. The ADR should confirm the domain migration and backend URL
strategy after a small deployment spike. Until then, the current server-rendered React landing page
remains the production implementation.

## References

- [Astro framework components](https://docs.astro.build/en/guides/framework-components/)
- [Astro content collections](https://docs.astro.build/en/guides/content-collections/)
- [Astro internationalization routing](https://docs.astro.build/en/guides/internationalization/)
- [Astro Cloudflare adapter](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)

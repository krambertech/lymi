# Lymi website and product

Lymi has two permanent origins and two independent Cloudflare Workers. `lymi-site` serves the public website and documentation at `https://lymi.app`. The existing `lymi` Worker serves the product, authentication and backend at `https://my.lymi.app`. The repository configuration is ready for this split, but production remains unverified until OAuth, both Workers Builds pipelines, the custom-domain handoff and signed-in smoke checks are confirmed.

## Origin contract

| Origin and path | Owner | Purpose |
| --- | --- | --- |
| `lymi.app/` | `apps/site` | Prerendered public landing page with interactive React islands. It remains visible whether or not a product session exists. |
| `lymi.app/languages` | `apps/site` | Prerendered page for anyone learning a language, built from the landing sections with examples across many languages. |
| `lymi.app/languages/estonian` | `apps/site` | Prerendered page for people learning Estonian, with Estonian cards, notes, conversations and class deck. |
| `lymi.app/ai-assistants` | `apps/site` | Prerendered page for people who already use an AI assistant: a conversation that turns a photo of notes into cards, what else to send, a review, conversation practice, enrichment, the API and how to connect. |
| `lymi.app/teachers` | `apps/site` | Prerendered page for tutors and small classes: a class deck, sections that open in order, filling a deck with an assistant, the join link and the deck library. Sections and the library are a painted-door test ahead of #101, #102 and the library plan, disclosed in the join section; signups record the source `teachers`. |
| `lymi.app/join` | `apps/site` | Public private-beta information and invitation request. |
| `lymi.app/decks/<slug>` | `apps/site` Worker | A published deck, rendered per request from D1, with no Request access in its bar because adding it is the way in: its name, publisher and **Add to Lymi**, which links to `my.lymi.app/add/<slug>`, over a spread of its cards; its sections as a contents list in order, with every card in a view that opens over the page and at `#cards`; how adding and reviewing work beside a hand of five cards drawn from the deck revision, dealt by the server, each turned once, after which the lantern lights and asks the visitor to keep going in Lymi, with nothing saved. Its sources stay in the page's structured data rather than on the page. An unknown slug is 404, a withdrawn or archived deck 410. ADR 0016. |
| `lymi.app/uk/*`, `lymi.app/ru/*` | `apps/site` | Ukrainian and Russian editions of every public page except privacy, terms, support and documentation. |
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

## Public page languages

Every public marketing page ships in English, Ukrainian and Russian. English lives at the path, and the other editions live under `/uk/` and `/ru/`, rendered by the same island with the page locale. Privacy, terms, support and the documentation stay in English on purpose.

`apps/site/src/lib/routes.ts` lists the translated pages, the English-only paths and the pages rendered per request. The sitemap, the `hreflang` alternates, the footer language links and the links between pages all read from it. `/sitemap.xml` is a prerendered index of `/sitemap-pages.xml`, built from that list, and `/sitemap-decks.xml`, which lists every published deck in each locale at request time.

A published deck page translates its own chrome, title, description and structured data, while the deck's name, summary, sections and cards stay in the deck's one meaning language.

Use case pages sit under one **Use cases** menu in the header rather than as links of their own, so the header stays the same width as pages are added. `apps/site/src/components/landing/site-links.ts` lists them in menu order, with a narrower page such as Estonian under its broader one; the header menu, the phone menu and the footer all read that list. Privacy, terms and support use the same header. `routes.test.ts` fails when a page in `src/pages` is on neither list, when a translated page lacks a locale, or when the sitemap misses a page, so a new public page needs its `/uk/` and `/ru/` files or a place on the English-only list before `pnpm verify` passes.

## Deployment and PWA boundary

`apps/site` is built with `@astrojs/cloudflare`: every page is prerendered except published deck pages and the deck sitemap, and a small Worker answers health and beta signup before Astro's handler. It has no SPA fallback, service worker, PWA manifest, authentication, product API, MCP, R2, KV or cron. Its only data binding is D1: it writes `beta_signups` and reads published decks only through `loadPublicDeck` in `packages/core/src/catalog.ts`, which selects allowlisted columns and parses them through `PublicDeckOut`. Astro owns canonical metadata, sitemaps and public indexing for both kinds of page.

`apps/web` remains the Vite React PWA and Hono Worker. It owns the product SPA fallback, Workbox service worker, manifest, offline cache, review outbox, notification icons and reminder destinations. Product HTML always sends `noindex, nofollow`, and product `robots.txt` disallows all crawling.

CI's artifact boundary check fails if the public build contains service-worker or manifest markers, or if the product build contains known landing, documentation or public-signup markers. That structural check complements browser coverage of the route and indexing contracts.

## Documentation structure

Documentation source lives in `apps/site/src/components/docs`, with one Astro page per public route in `apps/site/src/pages/docs`. The navigation registry drives the sidebar, next-page links and search. The sidebar puts connecting an assistant before the API, because more readers arrive with an assistant than with a script.

| Path | Purpose |
| --- | --- |
| `/docs` | What the docs cover and which way in to choose. |
| `/docs/quickstart` | Make a key, add a card and see it in the app. |
| `/docs/authentication` | Keys, scopes, rate limit and error codes. |
| `/docs/mobile` | For learners: adding the product to the home screen on iPhone, iPad and Android until a native app exists, what an installed Lymi adds, removing it, and the two problems a learner can fix. |
| `/docs/cards` | Card shape, duplicate rules, directions and FSRS states. |
| `/docs/import-from-anki` | For learners, not developers: exporting from Anki on a computer and a phone, what an import brings across and leaves behind, duplicates, importing again, undo and the three failures a learner can fix. |
| `/docs/import-from-mochi` | For learners: exporting a deck or everything from Mochi, what comes across from plain and template cards, what stays behind, duplicates, importing again, undo and the failures a learner can fix. |
| `/docs/export` | For learners: exporting a deck or the library, what the Anki package, Lymi file and spreadsheet hold, opening the package in Anki and Mochi, importing a Lymi file, shared decks and the download window. |
| `/docs/scheduling` | How FSRS sets intervals and how the draw picks the next card. Tables, the simulated day and interval examples are computed from `packages/core` at build time; the year-long studies come from `packages/core/simulation/results.json`. |
| `/docs/recipes` | Import a word list, safely re-run a script and back up a deck. |
| `/docs/api` | Browser-rendered reference loaded from `https://my.lymi.app/api/openapi.json` without credentials. |
| `/docs/mcp`, `/docs/mcp/claude`, `/docs/mcp/chatgpt`, `/docs/mcp/gemini` | Connecting an assistant to `https://my.lymi.app/mcp`. |

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
5. Upload a public-site preview version and verify landing, Join, beta signup, docs, a published deck page, metadata, both sitemaps, 404 behavior and absence of any service-worker registration before changing the apex domain.
6. Deploy and verify the product Worker on `my.lymi.app`, including signed-in and signed-out roots, a safe deep link through Google sign-in, API keys, MCP OAuth, PWA installation, offline startup and one reminder delivery.
7. Move only the `lymi.app` custom domain from the product Worker to `lymi-site`, then run both health commands and compare each reported tag with the intended commit.
8. If the apex checks fail, restore `lymi.app` to the existing product Worker. Do not remove the old route ownership until the public Worker is verified.

The deploy and production migration commands remain user-owned. A green build or preview is not proof that the corresponding custom domain is serving that version.

## One-time browser recovery

If an existing `my.lymi.app` tab or installed app still renders the old public shell, clear the stored site data for `my.lymi.app`, including its service worker and caches, then close and reopen the tab or app. Unregistering a worker does not stop it from controlling its current open document, so reopening is required. Sign in again and re-enable reminders if the browser discarded the push subscription.

This sequence is explicitly covered by browser tests. There is no permanent recovery endpoint because Lymi currently has one learner and the stale state is a one-time deployment migration.

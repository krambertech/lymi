# Lymi website and product

The public `lymi-site` Worker serves the website and documentation at `https://lymi.app`. The product `lymi` Worker serves authentication, API, MCP and the web app at `https://my.lymi.app`. This document describes repository routing and deployment configuration. Verify the active production versions with the health commands before making claims about a particular release.

## Origin contract

| Origin and path | Owner | Purpose |
| --- | --- | --- |
| `lymi.app/` | `apps/site` | Prerendered public landing page with interactive React islands. It remains visible whether or not a product session exists. |
| `lymi.app/languages` | `apps/site` | Prerendered page for anyone learning a language, built from the landing sections with examples across many languages. |
| `lymi.app/languages/estonian` | `apps/site` | Prerendered page for people learning Estonian, with Estonian cards, notes, conversations and class deck. |
| `lymi.app/languages/japanese` | `apps/site` Worker | Japanese learning page, rendered per request with current published decks and examples of readings, reviews, capture and pronunciation. |
| `lymi.app/ai-assistants` | `apps/site` | Prerendered page for people who already use an AI assistant: a conversation that turns a photo of notes into cards, what else to send, a review, conversation practice, enrichment, the API and how to connect. |
| `lymi.app/teachers` | `apps/site` | Tutor and small-class page explaining shared decks, ordered sections, assistant-based capture and join links. |
| `lymi.app/medicine` | `apps/site` | Medical-study page covering anatomy, pharmacology and lab-value cards, Anki history, capture and review. |
| `lymi.app/certifications` | `apps/site` | Certification-study page with examples from cloud, security, finance and project management. It states that most certifications do not yet have a published deck. |
| `lymi.app/tutor-lessons` | `apps/site` | Guide to making cards from tutor lessons, notes and transcripts. Lymi has no direct tutoring-platform integration; material can be read by Smart add or a connected assistant. |
| `lymi.app/notes-to-flashcards` | `apps/site` | Guide to creating cards from notes, PDFs, slides and photos through an assistant. Smart add also accepts text, PDFs and photos directly. |
| `lymi.app/exams` | `apps/site` Worker | Exam catalogue rendered per request from D1. `apps/site/src/lib/exams.ts` defines exams, format facts and sample questions; show only exams with readable published decks. |
| `lymi.app/exams/<exam>` | `apps/site` Worker | One template per exam with format, sources, readable decks and attribution. The German citizenship page also offers state-specific decks. Unknown exams return 404. Make no claim of official affiliation or guaranteed results. |
| `lymi.app/changelog`, `/changelog/<update>` | `apps/site` | Prerendered changelog: every update newest first, each also on a page of its own with Older and Newer, and an RSS feed at `/changelog/rss.xml`. Built from `src/content/changelog`; [the changelog design](design/changelog.md) has how to add an update. |
| `lymi.app/download` | `apps/site` | Prerendered download page for the Mac app, linked from the footer: the app icon, what it adds, **Download for Mac** for Apple silicon and a line for macOS 13 or later with a link for an Intel Mac. Safari reports every Mac as Intel, so the page never guesses the chip. Under it, three install steps: open the DMG, drag Lymi to Applications, sign in. |
| `lymi.app/download/mac`, `/download/mac-intel` | `apps/site` Worker | A 302 to `downloads.lymi.app/darwin/arm64/Lymi.dmg` or `/darwin/x64/Lymi.dmg`, the newest build the release job uploads under a fixed name, so a shared link never goes stale. The Worker counts each one as `mac_download_started` ([analytics](analytics.md)). |
| `lymi.app/explore/<slug>` | `apps/site` Worker | Published deck rendered from the public D1 projection, with publisher, summary, sections, card previews and Add to Lymi. A five-card trial saves no progress. Unknown slugs return 404; withdrawn or archived decks return 410. [ADR 0016](adr/0016-public-catalog-pages-render-on-the-public-worker.md). |
| `lymi.app/uk/*`, `lymi.app/ru/*` | `apps/site` | Ukrainian and Russian editions of every public page except terms, support and documentation. |
| `lymi.app/privacy`, `/terms`, `/support` | `apps/site` | Public privacy, service terms and support information. |
| `lymi.app/docs/*` | `apps/site` | Public documentation, MCP setup and API reference. |
| `lymi.app/llms.txt` | `apps/site` | Plain-text description of Lymi for an assistant reading the site, with the pages worth following. |
| `lymi.app/api/health` | `apps/site` Worker | Public deployment identity and active version. |
| `my.lymi.app/` | `apps/web` | Session-aware product entry. A valid session opens Today; otherwise it opens sign-in. |
| `my.lymi.app/app`, `/today`, `/library`, `/review`, `/you`, `/activity`, `/archived`, `/insights` | `apps/web` | Product screens. Private data requires authentication. |
| `my.lymi.app/login`, `/consent` | `apps/web` | Sign-in and integration authorization. |
| `my.lymi.app/api/*` | `apps/web` Worker | Product and integration API, Better Auth, OpenAPI and product health. |
| `my.lymi.app/mcp`, `/.well-known/*` | `apps/web` Worker | MCP endpoint and OAuth discovery. |

The product Worker permanently redirects `/docs`, `/docs/*`, `/join`, `/privacy`, `/terms` and `/support` to the public origin while preserving path and query. The site answers `/join`, in every locale, with a permanent redirect to `my.lymi.app/login?mode=sign-up`: it was the private beta's waiting list, and its links are already shared. Without a live session, the product Worker answers `/explore` and `/explore/*` with a 302 to the same path and query on the public origin, and a service-worker shell that finds the session gone does the same in the browser. The site answers `/add/<slug>` with a permanent redirect to `my.lymi.app/add/<slug>`, keeping the query, so an add link written with the wrong domain still opens the add page. Every other unknown browser path returns the product 404 or authenticated SPA behavior; it cannot fall through to a public landing page. The public Worker serves its prerendered routes and returns 404 for product API paths. There is no `api.lymi.app`.

Public addresses never end in a slash except the root, so the served URL, the canonical, `hreflang` and the sitemap name the same address. A slash form such as `/languages/` or `/uk/` redirects to the bare path with its query: Wrangler's `html_handling: "drop-trailing-slash"` does it for prerendered pages, and Astro's `trailingSlash: "never"` for pages rendered per request.

Having an account is different from being signed in. Outside Explore, an existing learner with an expired product session reaches sign-in and returns to the original safe product path after authenticating. A return path is always an internal product route; a protocol-relative, external, malformed, hashed or authentication route falls back to Today. Anyone may create an account: Lymi is in public beta and no allowlist gates sign-up.

The public landing page's Open Lymi link always goes to the product root and lets that origin resolve session state. The product’s learner menu links back to the public website. Authentication cookies remain host-only on `my.lymi.app` and are never sent to the website.

## Public page languages

Every public marketing page and the privacy policy ship in English, Ukrainian and Russian. English lives at the path, and the other editions live under `/uk/` and `/ru/`, rendered by the same island with the page locale. The web and phone apps open the privacy policy in the app language. Terms, support and the documentation stay in English on purpose.

`apps/site/src/lib/routes.ts` lists the translated pages, the English-only paths, the pages built from content and the pages rendered per request. The sitemap, the `hreflang` alternates, the footer language links and the links between pages all read from it. `/sitemap.xml` is a prerendered index of `/sitemap-pages.xml`, built from that list, and `/sitemap-decks.xml`, which lists every published deck in each locale at request time. `routes.test.ts` fails when a page in `src/pages` is on neither list, when a translated page lacks a locale, or when the sitemap misses a page, so a new public page needs its `/uk/` and `/ru/` files or a place on the English-only list before `pnpm verify` passes.

A published deck page translates its own chrome, title, description and structured data, while the deck's name, summary, sections and cards stay in the deck's one meaning language.

## Building a marketing page

A marketing page is one view, one island and a short route file in each locale. The route in `src/pages` wraps its island in `layouts/MarketingLayout.astro`, which takes the page key, title, blurb and questions and writes the head, canonical path and structured data. The island in `components/islands` wraps its view in `Island`, which supplies the page language and a query client. The view in `components/landing` draws its sections inside `LandingLayout`, which owns the nav, the footer and the page frame.

Reach for an existing section before writing markup. `FeatureSection` puts a claim beside its demo and `Wide` puts it above a wide one; `Questions`, `SignUpSection`, `UseCases` and `RightMoment` close most pages. A language page builds from `LanguageSections.tsx`: its hero, the return lane, the voice tiles, the enrich demo, the assistant chat, the class deck and the bento, each taking only the copy and words that differ by language. Share a section only once pages already lay it out the same way. Copy that differs passes in as a prop; a section laid out differently on one page stays in that page's view. `language-decks.ts` turns a page's published decks into add links and path steps. A link onward under a section's copy is an `ArrowLink`. An Astro page that renders a React part on the server wraps it in `Localized`.

## Structured data and llms.txt

`apps/site/src/lib/structured-data.ts` builds every page's JSON-LD. A marketing page declares the `SoftwareApplication`, which carries the same `@id` wherever it appears, and a `FAQPage` built from the same message descriptors the page renders, so a rich-result answer can never differ from the visible one. The homepage adds the `Organization` and the `WebSite`. The questions live in `apps/site/src/components/landing/questions.ts` as plain strings; a question that needs a link puts it beside the answer rather than inside it.

`/llms.txt` gives an assistant one definition of Lymi, taken word for word from the homepage description, and the URLs worth following. It holds no count, and `llms.test.ts` fails when one appears.

## Header and footer links

Use case pages sit under one **Use cases** menu in the header rather than as links of their own, so the header stays the same width as pages are added. `apps/site/src/components/landing/site-links.ts` lists them in menu order, with a narrower page such as Estonian under its broader one; the header menu, the phone menu and the footer all read that list. A menu entry carries an icon on a tray in the hue of its landing tile, never violet, so the menu and the landing's use cases read as one set. Privacy, terms and support use the same header.

## Deployment and PWA boundary

`apps/site` is built with `@astrojs/cloudflare`: marketing and documentation pages are generally prerendered; Explore, shelf and deck pages, language pages, exam pages, preview images and the deck sitemap render per request, and a small Worker answers health and the legacy redirects before Astro's handler. It has no SPA fallback, service worker, PWA manifest, authentication, product API, MCP, R2, KV or cron. It writes no learning content. It proxies analytics and records eligible Mac download events. Its only data binding is D1, and it reads published decks through the catalogue functions in `packages/core/src/catalog.ts`, which selects allowlisted columns and parses them through `PublicDeckOut`. Astro owns canonical metadata, sitemaps and public indexing for both kinds of page.

`apps/web` is the Vite React PWA and Hono Worker. It owns the product SPA fallback, Workbox service worker, manifest, offline cache, review outbox, notification icons and reminder destinations. Product HTML always sends `noindex, nofollow`, and product `robots.txt` disallows all crawling.

CI's artifact boundary check fails if the public build contains service-worker or manifest markers, or if the product build contains known landing or documentation markers.

## Documentation structure

Documentation source lives in `apps/site/src/components/docs`, with one Astro page per public route in `apps/site/src/pages/docs`. The navigation registry drives the sidebar, next-page links and search. The sidebar puts connecting an assistant before the API, because more readers arrive with an assistant than with a script.

| Path | Purpose |
| --- | --- |
| `/docs` | What the docs cover and which way in to choose. |
| `/docs/quickstart` | Make a key, add a card and see it in the app. |
| `/docs/authentication` | Keys, scopes, rate limit and error codes. |
| `/docs/mobile` | For learners: adding the product to the home screen on iPhone, iPad and Android as a PWA; the native Expo phone app is a separate option, what an installed Lymi adds, removing it, and the two problems a learner can fix. |
| `/docs/cards` | Card shape, duplicate rules, directions and FSRS states. |
| `/docs/import-from-anki` | For learners, not developers: exporting from Anki on a computer and a phone, what an import brings across and leaves behind, duplicates, importing again, undo and the three failures a learner can fix. |
| `/docs/import-from-mochi` | For learners: exporting a deck or everything from Mochi, what comes across from plain and template cards, what stays behind, duplicates, importing again, undo and the failures a learner can fix. |
| `/docs/import-from-noji` | For learners: exporting a deck as OFC from Noji, what comes across from cards, cloze and progress, what stays behind, duplicates, importing again, undo and the failures a learner can fix. |
| `/docs/import-from-pleco` | For learners: exporting flashcards from Pleco as a UTF-8 text file with both character sets, choosing the script, what comes across from pinyin, definitions and categories, what stays behind, duplicates, importing again, undo and the failures a learner can fix. |
| `/docs/yomitan` | For learners: connecting Yomitan's Anki settings to Lymi with the AnkiConnect address and a key from Settings, what each field becomes, one deck per language, duplicates, what stays behind, the errors a learner can fix and what Yomitan sends. |
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
- `apps/web/wrangler.jsonc` owns the `lymi` Worker, product custom domain, backend bindings, secrets, cron and disabled preview URLs.
- `apps/web/src/server/origin-routing.ts` enforces product-only paths and public-route redirects before the product SPA fallback.

Browser E2E gives the website, the interactive product journeys and the production-built product package a port each, from the base in `e2e/ports.mjs` (4173 by default, `E2E_PORT` to move all three). It builds both apps, starts each Worker with isolated local state, and exercises the route boundary, product journeys, installed service worker and offline shell in one test run.

## Build configuration and release checks

Use separate Workers Builds projects rooted at the repository. The product project runs `pnpm --filter @lymi/web run deploy:ci`; the site runs `pnpm --filter @lymi/site run deploy:ci`. Each needs a D1-enabled build token because the scripts apply pending shared migrations before deployment. Include each app’s source, its shared packages, migration tooling and root workspace files in its build watch paths.

The product domain’s Google callback is `https://my.lymi.app/api/auth/callback/google`. Keep authentication on the product origin. Production deploys, domain changes and manual production migrations remain user-owned.

Run the required local gates from [AGENTS.md](../AGENTS.md#before-you-push). After deployment, run both health commands and compare each reported tag with the intended commit. Check affected public pages, sign-in and safe deep links, API and MCP access, PWA startup, offline behavior and reminders as appropriate. A successful build or preview does not prove the custom domain serves that version.

## One-time browser recovery

If an existing `my.lymi.app` tab or installed app still renders the old public shell, clear the stored site data for `my.lymi.app`, including its service worker and caches, then close and reopen the tab or app. Closing matters, because an unregistered worker keeps controlling the document it already has open. Sign in again and re-enable reminders if the browser discarded the push subscription.

Browser tests cover clearing a stale shell. This is a client recovery procedure, not a requirement to reset every learner after deployment.

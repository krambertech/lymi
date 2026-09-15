# Technical stack

**Status:** Agreed 5 September 2026, integrations layer decided the same day. Edit in place as decisions change. Vocabulary is in [CONTEXT.md](../CONTEXT.md).

Everything runs on Cloudflare. An Astro site and narrow Worker serve the public website and docs on `lymi.app`. A separate Vite React and Hono Worker serves the product, API, auth and MCP server on `my.lymi.app`. Interactive public sections hydrate as React islands, while the private product remains a client-rendered PWA that behaves like a native app on the phone and like a keyboard-driven web app on the desktop. Shared logic lives in a package a future React Native app can import unchanged.

## Shape

```mermaid
flowchart LR
  subgraph Site["apps/site (Astro + site Worker)"]
    Public[Prerendered landing + docs]
    Islands[React islands]
    Beta[Website API\n/api/beta + /api/health]
  end
  subgraph Product["apps/web (Vite + React + Hono)"]
    UI[TanStack Router + Query]
    SW[Service worker\nshell cache]
    Assets[Static assets\nproduct SPA fallback]
    API[Hono /api\nOpenAPI at /api/openapi.json]
    Services[Service layer\ndb, userId, actor]
    Auth[Better Auth /api/auth\nsessions, API keys, OAuth server]
    MCP[MCP server /mcp\ncreateMcpHandler, stateless]
    AI[Enrichment + TTS\nOpenAI text, Gemini speech]
  end
  subgraph Core["packages/core"]
    Schema[Drizzle schema + Zod types]
    FSRS[ts-fsrs scheduling]
    Client[Typed API client]
  end
  D1[(D1, SQLite)]
  R2[(R2, audio + private images)]
  KV[(KV, sessions cache)]

  Public --> Islands
  Beta -->|beta signups only| D1
  UI --> Assets
  UI -->|fetch, session cookie| API
  SW -->|replay queued reviews| API
  API -->|calls| Services
  MCP -->|calls| Services
  Services -->|reads, writes, audits| D1
  Services -->|enrich after add| AI
  AI -->|fills empty fields| Services
  API -->|serves audio| R2
  API -->|session or API key| Auth
  MCP -->|OAuth token| Auth
  Auth --> D1
  Auth --> KV
  Client -.shared.-> UI
  Client -.shared.-> MCP
  Schema -.shared.-> API
  FSRS -.shared.-> UI
  FSRS -.shared.-> API
```

## Decisions

### Clients: prerendered Astro website plus a client-rendered React PWA

The public site at `lymi.app` is statically rendered by Astro. Landing, Join and documentation ship useful HTML and canonical metadata before JavaScript runs; interactive React components hydrate as islands. A narrow Worker serves the static assets, beta signup and a versioned health endpoint. It has no product shell, authentication or PWA behavior.

The signed-in product at `my.lymi.app` is still a client-rendered single-page PWA. It sits behind a login, so a static shell remains the right fit for fast offline starts. TanStack Router gives typed routes and a proper mobile navigation model. TanStack Query, with its IndexedDB persister, is the cache that makes the review screen usable on a train. `/today` is the product home and `/app` redirects there. The product root sends a valid session to Today and a signed-out visitor to sign-in, preserving safe product deep links through authentication.

`vite-plugin-pwa` handles the manifest and Workbox service worker on the product origin only. The app captures Chromium's install event for its in-app button and shows manual instructions on browsers that do not expose one. The shell is precached. Data goes through Query's cache plus a grade outbox in localStorage. A grade enters the outbox before it is sent, so the review moves to the next card without waiting for the server, and the outbox replays queued grades in order when the connection returns and keeps each sent grade until a fetched log holds it. The review draws its next card on the device from `GET /api/review/draw` and that outbox, so a reload, offline grading and Undo land on the card the server would pick ([ADR 0019](adr/0019-the-review-queue-is-a-deterministic-weighted-draw.md)). The public deployment neither generates nor serves a product service worker.

Review reminders use standards-based Web Push with VAPID, sent directly by the product Worker. Subscriptions and local reminder times are per device in D1. One UTC Cron Trigger runs every 15 minutes, evaluates each device in its stored IANA timezone, sends only when active cards are due, and atomically records the local date before delivery so retries do not duplicate a reminder. See ADR 0006.

The deployment boundary is accepted in [ADR 0009](adr/0009-public-website-and-product-deploy-separately.md). The permanent origin and authentication contract remains in [ADR 0008](adr/0008-public-website-and-product-use-separate-origins.md).

### Feels native on the phone

This is a design requirement with a technical checklist:

- `display: standalone`, `theme-color` per theme, splash icons, iOS `apple-mobile-web-app-*` meta.
- `100dvh` layouts, safe-area insets, no body scroll, scroll containers per screen.
- Bottom drawers via Base UI's Drawer, page transitions via the View Transitions API with a Motion fallback.
- `touch-action: manipulation`, 44 px targets, 16 px inputs, haptics via `navigator.vibrate` where available.
- Keyboard shortcuts and a command palette on desktop; the same routes, a different shell.

The bar is "could be mistaken for native." Every screen is checked on a real iPhone in standalone mode before it ships.

### UI: Tailwind v4 + shadcn/ui on Base UI, tokens from DESIGN.md

Tailwind v4 reads design tokens as CSS variables in OKLCH, which is exactly what DESIGN.md defines. Interactive primitives are shadcn/ui components on Base UI, copied into `apps/web/src/client/components/ui` and restyled with Lymi's tokens rather than shadcn's theme variables; `cn` merges their classes. Motion handles the lantern and transitions. [ADR 0017](adr/0017-interface-primitives-are-shadcn-components-on-base-ui.md) owns the component boundary.

Alternative considered: hand-built primitives on `<dialog>` and the `popover` attribute with vaul for the drawer. That was the first version. vaul stopped being maintained, and four separate open-and-close implementations disagreed on scroll lock, focus return and which device got which shape.

### Type: self-hosted Onest, sizes in rem

Both apps bundle variable Onest from `@fontsource-variable/onest`: Latin (34 KB), Latin extended (28 KB), Cyrillic (16 KB) and Cyrillic extended (11 KB) woff2 files, each behind a `unicode-range`, so a page downloads only the scripts it renders. The `@font-face` rules declare weights 400–600, the range the interface uses. The Latin file is preloaded, and the product's service worker precaches all four with the shell. No font request leaves the origin.

`--font-sans` puts "Onest Fallback" after Onest: local Arial, or the metric-compatible Liberation Sans, resized so text laid out before the swap already fills Onest's box. The values come from fontTools, run against the shipped Latin file and macOS Arial. `size-adjust` is Onest's average advance width over Arial's, weighted by English letter and space frequency. The ascent, descent and line-gap overrides are Onest's typo metrics (970, −305 and 0 per 1000; `USE_TYPO_METRICS` is set) divided by that adjustment. There are two faces, measured at weight 400 and 500 and split at 450, because Onest widens as it gets heavier and the card term is set at 500. Re-measure when an upgrade changes the font files.

Text sizes are rem, so the reader's default font size scales the type; spacing and radii stay px. Form controls on phones are `1rem`, which is 16 px on iOS, where a smaller size makes Safari zoom on focus.

Alternative considered: the Google Fonts stylesheet with `display=swap`. It cost a connection to two third-party origins before first text, and the service worker could only cache it at runtime. With no metric-matched fallback, the term on the card reflowed when the font arrived.

### Servers: two Cloudflare Workers, with Hono on the product

The public `lymi-site` Worker serves Astro's static output and runs first only for `/api/*`, where it exposes beta signup and health. The product `lymi` Worker routes `/api/*`, `/api/auth/*`, `/mcp`, OAuth discovery and product navigations through Hono before its SPA asset fallback. Product documentation paths redirect to `lymi.app`; unknown product paths can never render public content. Local browser tests run the two Workers on separate loopback origins.

Alternative considered: Cloudflare Pages plus Functions for the website. A Worker with static assets keeps both deployments on the same platform, supplies version metadata and supports the narrow beta action without another service.

### Data: D1 with Drizzle

D1 is SQLite at the edge. Drizzle gives a typed schema shared with the client and generates migrations. One database for now, tenanted by `user_id` from day one so adding users later is a policy change, not a migration. Review history is append-only.

Language lives on the card, not the deck. `cards.language` is nullable; a deck may carry a default as a convenience. Detection fills it in at capture time and a chip lets you correct it. Cards without a language get no audio and no language-specific enrichment, and everything else works the same, so decks can mix languages or hold content that is not vocabulary at all.

Later option: a Durable Object per user holding its own SQLite, which turns sync and offline into a solved problem. Not needed for one user.

### Auth: Better Auth on the Worker

Better Auth runs on Workers, supports D1 natively as of 1.5, and does social login plus sessions, API keys for the public API, and an Expo plugin for the React Native app later. Google is the only sign-in provider at launch. An allowlist of one email keeps the app private until that changes.

Known issue to watch: a reported bug where sessions expire after five minutes with D1 and KV. Test session refresh before relying on it.

Cloudflare Access was considered as an interim and rejected. Better Auth is built first so the API and MCP tokens have one auth system from day one.

Three ways in, one system:

| Caller | Credential | Better Auth piece |
| --- | --- | --- |
| The web app | Session cookie | core |
| curl, scripts, Claude Code | Personal API key, made and revoked in Settings | `apiKey` plugin |
| Claude Desktop, Codex, other MCP clients | OAuth 2.1 access token | `@better-auth/mcp` plugin, which makes this Worker the authorization server |

Claude Desktop and Codex both require OAuth for remote MCP servers, which is why a bearer key alone was not enough. `@better-auth/mcp` (Better Auth 1.7) serves the `.well-known` metadata, the consent page and JWT access tokens. The Worker checks tokens against its own JWKS with no database hit. Cloudflare's `workers-oauth-provider` was the earlier plan and is no longer needed.

Every key and every OAuth grant carries one scope, `read` or `write`. Write allows creating, editing and archiving decks and cards. Nothing an integration holds can grade a review.

### Spaced repetition: ts-fsrs

FSRS in TypeScript, in `packages/core`, used by the client (to schedule offline) and the server (to validate and persist). Grades and intervals are the algorithm's, not invented. One 10-minute learning step sets FSRS state only; which card comes next, and when a missed card returns, is the weighted draw in `packages/core/src/draw.ts` ([ADR 0019](adr/0019-the-review-queue-is-a-deterministic-weighted-draw.md)).

### AI: enrichment plus lazy multilingual speech

**The server does not extract vocabulary from lessons. The MCP client does.** Claude Desktop or Codex already holds the transcript and a model, so it reads the lesson and calls `add_cards`. That keeps the Worker's AI to one job, enrichment: fill the empty fields on a card (meaning, example, pronunciation, language) and leave every field that already has text alone.

Enrichment runs in the background after any add that leaves fields empty, whether the card came from the web quick-capture sheet or from an integration. Typing "sbrigarsi" on the phone and finding the meaning there by the time you open the deck is the point. Each filled field is stored with `source: "ai"` so the UI labels it. Meanings are written in the learner's meaning language, a per-user setting, English by default.

OpenAI remains the text-enrichment vendor. Speech defaults to Gemini-TTS through Google Cloud Text-to-Speech, with Chirp 3 HD and then OpenAI as runtime fallbacks. Both Google models receive the card's locale as `languageCode`, because a single word is too little text to detect a language from; OpenAI has no such parameter and read Estonian terms with an English accent, so it is last. Speech prompts name the language in English ("Estonian"), never as a bare code such as `et`. The routing layer is provider-neutral, so an R2 hit does not parse credentials or call a vendor.

### MCP: stateless handler in the product Worker

`createMcpHandler` from the Agents SDK at `/mcp`, Streamable HTTP, no Durable Object. `McpAgent` was the earlier plan and is deprecated. Authorization is the Better Auth OAuth server above.

Tools call the same service layer the REST routes call, so MCP cannot bypass product rules and every write lands in the audit log with actor `mcp`. The tool set mirrors the REST API less review grading: list, get, create, update, archive and restore decks; search, get, add, update, archive and restore cards; due counts; settings; insights. An `enrich` tool follows once the enrichment service exists. There is no delete tool because the app has no delete. Claude Desktop does not support elicitation, so the server cannot ask "are you sure". Archive being reversible is the safety. A meaning or example an assistant sends without naming its source is stored as `ai`, so the app never shows an assistant's text as the lesson's.

### Integrations: cards land as cards

A card added through the API or MCP is an ordinary card from the moment it lands. There is no proposals table and no approval step. In its place, an **Activity** view in Settings lists every write made by an integration or the AI, and you can inspect, edit or archive from there. Cards carry a `created_by` actor so Activity can filter without parsing the audit log.

Adds take one card or many. A lesson produces 20 to 40 terms, and one tool call per term is 40 model turns. A **duplicate** is a card whose normalised term and language match an active card anywhere in your decks. A duplicate is skipped, never rejected, and the response names the existing card, so re-running the same call is safe. A card with no language only matches other cards with no language.

### API: a service layer and generated docs

Route logic lives in service functions that take `db`, `userId` and `actor`. Hono routes and MCP tools are thin callers. The OpenAPI document is generated from the Zod schemas in `packages/core` and served at `https://my.lymi.app/api/openapi.json`. The documentation site at `https://lymi.app/docs` renders it without credentials through narrowly scoped CORS; `/api/docs` redirects to the public reference.

### Audio: first play, then R2

Pronunciation audio is generated only when the learner first presses play. Cards without a language never show the control and never call a speech provider. The Worker tries Gemini, Chirp 3 HD and OpenAI in that order for the languages each one publishes, stores the MP3 in R2, and remembers the object on the card. The cache identity includes the term, locale, provider, model and voice, and changing the term or language detaches stale audio. Remembered audio from anything other than the preferred provider is regenerated on the next play, and still plays if every provider fails.

### Avatars: Images binding, private R2

A photo is normalised on the Worker by the Cloudflare Images binding, not by a WASM codec: decoding runs outside the Worker's CPU budget and adds nothing to the bundle, and WebP output drops all metadata. The client crops to a square and uploads the crop; the server sniffs the bytes, bounds size and pixels, refuses SVG and animation, and re-encodes whatever arrives. Local development and service tests use the binding's offline mode. Rules are in [the data model](data-model.md#avatars).

### Card pictures: the avatar pipeline, plus a link import

A card's picture takes the avatar path: the same byte checks, the same Images binding and the same private bucket, re-encoded to WebP of at most 1600 px a side rather than cropped square. It arrives through the API or MCP as bytes or a public link; a link is fetched once, with every redirect checked against private hosts, and only its host is kept. Rules are in [the data model](data-model.md#pictures). ADR 0014.

### Imports: R2, a Workflow and a reader that holds the collection once

An import's file goes to the `IMPORTS` R2 bucket in 10 MB parts through R2 multipart uploads, because a phone's file can be far larger than one request. `ImportWorkflow` (binding `IMPORT_WORKFLOW`) reads it, stores its notes as JSON chunks beside it, and after the learner confirms writes one chunk of 500 notes per step and pictures fifty per step, so closing the app loses nothing and a failure retries one step. A run hands over to a new run after 9,000 steps, under the paid plan's 10,000 per instance, carrying the next chunk and any pictures still to store. Each chunk is one D1 batch whose statements run only while the import's `written` count equals that chunk, so a retried step writes nothing twice, and rows travel as one JSON parameter to stay under D1's 100-parameter limit. The file and its chunks are deleted when the import ends, and the cron trigger fails imports left waiting for three days. [The import proposal](proposals/importing-from-other-apps.md).

A source is one adapter in `apps/web/src/server/imports`: detect, inspect into a summary and notes, and turn a note into the common imported card. The Anki adapter reads the zip's central directory by ranges, decompresses zstd with `fzstd`, decodes Anki's protobuf itself, and reads the collection's SQLite pages with a small reader in `sqlite.ts`. The proposal named `sql.js`, but a WASM SQLite copies the database into its own heap, which doubles an 80 MB collection past a Worker's 128 MB; the reader walks b-trees over the one copy and is tested against `node:sqlite`. A 50 MB collection of 40,000 notes and 480,000 reviews read in about a second and held its 50 MB plus 38 MB of cards and logs, so the limit is 64 MB rather than the proposal's 80. Fixtures are exported by Anki's own library from `fixtures/generate.py`.

The Mochi adapter reads `data.json` from a `.mochi` zip, which is Transit JSON: keywords as `~:` strings, lists and sets as `~#` tags and review dates as `~t` milliseconds, confirmed against a real 6 MB export on 15 September 2026. Its tags are `:tags`, not the API's `manual-tags`. It skips `component-cache`, where Mochi keeps generated speech and AI text, and a 6 MB export peaked at about 23 MB while parsing, so `data.json` is limited to 20 MB. Mochi dates a review by its day, so grades on one day are kept a minute apart for the replay. Its fixture is written in the real export's shape by `fixtures/generate.py`.

A preview Worker's Workflow is named after the preview, because Workflow names are account-wide and a preview must never register production's.

### Repo: pnpm workspace

```
lymi/
  apps/site         Public deployable: Astro static site + narrow Worker
    src/pages       Landing, Join, documentation, metadata and public files
    src/worker.ts   Beta signup, health and static asset binding
  apps/web          Product deployable: Vite React PWA client + Hono Worker
    src/client      Routes, components, styles (Tailwind v4 tokens from DESIGN.md)
    src/server      Hono app, Better Auth, API and MCP routes, product asset fallback
    migrations      Drizzle-generated SQL for D1
  packages/core     Drizzle schema, Zod types, ts-fsrs scheduling, ids
  design/           The identity board
  docs/             This file and the brief
```

Each app owns one build artifact and Worker configuration so its custom domain and release lifecycle can change independently. `packages/core` is the stable domain layer both Workers and a future React Native app can import. Brand SVGs and foundational styles are duplicated deliberately for now; a shared design or UI package waits until both clients need a stable common API.

Two workspace details worth knowing. `drizzle-orm` is a dependency of `packages/core` only and is re-exported as `@lymi/core/db`, because better-auth pulls in kysely and pnpm would otherwise build two copies of drizzle with incompatible types. And the Better Auth tables are generated, not hand-written: `pnpm --filter @lymi/web auth:schema` reads `src/server/auth-cli.ts` and writes `packages/core/src/schema/auth.ts`.

### Localization: Lingui catalogs, one app language

The English text in a component is the message. Lingui macros mark it, `lingui extract` writes one `.po` catalog per locale in each app, and `@lingui/vite-plugin` compiles them at build time. The learner's app language is a stored setting that also sets the meaning language; the Worker reads it for push reminders and treats an unset value as English. The public site serves `/uk/` and `/ru/` through Astro's i18n routing with `hreflang` on landing and Join, and the docs stay English. [ADR 0012](adr/0012-interface-text-is-english-source-translated-by-lingui.md) owns interface translation and [ADR 0013](adr/0013-app-language-is-one-setting-that-meaning-language-follows.md) owns the language setting.

Alternatives considered: keyed catalogs (i18next, Paraglide), which make every string change a two-file edit; a hosted translation editor, which is a third service for two locales the maintainer reads herself.

### Tooling

TypeScript strict. Biome for lint and format. Vitest covers packages and Worker behavior. A build-artifact check enforces that the website has no PWA and the production product has no public pages or preview tools. Playwright runs the canonical learning journey and two-origin contract in desktop Chromium and iPhone-sized WebKit against isolated local Cloudflare bindings. GitHub Actions keeps the base gates in one fail-fast quality job and runs required browser E2E beside it, adds Chromium and both Wrangler deployment dry runs for production-affecting pull requests, and runs Chromium plus WebKit on every push to `main` or explicit `/e2e` request. After quality passes, affected pull requests receive stable deployment links: the public site uses a version alias on `lymi-site`, while the product uses its own disposable Worker and synthetic D1, KV and R2 state as decided in [ADR 0018](adr/0018-product-previews-use-isolated-disposable-workers.md). Separate Cloudflare Workers Builds projects own production deployments from `main`; each health endpoint identifies its active Worker version, and both configurations enable Workers Logs.

Local development accepts email and password sign-in so the app is usable before Google is configured. It is enabled only when `PRODUCT_URL` is a loopback URL.

## Decided

- Sign-in: Google only at launch. Apple can be added when React Native arrives.
- Origins and deployments: `lymi-site` serves the public website and docs on `lymi.app`; `lymi` serves the product, auth, API, MCP and PWA on `my.lymi.app`.
- Auth: Better Auth from the start, no Cloudflare Access interim.
- AI: OpenAI for text enrichment. Gemini-TTS for speech, with a pinned locale, falling back to Chirp 3 HD and then OpenAI (14 September 2026).
- Integrations (5 September 2026): MCP clients are Claude Desktop and Codex first, so OAuth from day one via `@better-auth/mcp`. Personal API keys via the `apiKey` plugin. Two scopes, `read` and `write`.
- Cards from integrations are ordinary cards. No proposals table. Activity in Settings is the oversight.
- Duplicate means same normalised term and same language anywhere in the learner's decks. Skipped and reported, never rejected.
- The server enriches, the MCP client extracts. Enrichment is automatic, background, fills only empty fields.
- App language (12 September 2026): one per-user setting, seeded from the browser, drives the interface, push copy and the meaning language. Ukrainian and Russian first. ADR 0013.
- Interface text is English source in the code, translated through Lingui `.po` catalogs, extracted in `pnpm verify`, drafted by the agent on the PR. ADR 0012.
- Integrations never grade reviews.
- No scopes finer than read and write.
- API and MCP (12 September 2026): both expose the whole product surface, less review grading. A service that one has, the other gets in the same pass, so a learner never has to open the app for something an assistant could have done.
- A meaning or example an assistant sends without naming its source is stored as `ai` (12 September 2026). The assistant is a model; the label exists so its text is never shown as the lesson's.

## Sources

- [Full-stack development on Cloudflare Workers](https://blog.cloudflare.com/full-stack-development-on-cloudflare-workers/)
- [Cloudflare Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/)
- [Static assets and SPA fallback](https://developers.cloudflare.com/workers/static-assets/)
- [Better Auth 1.5](https://better-auth.com/blog/1-5)
- [Better Auth + Cloudflare Workers integration guide](https://medium.com/@senioro.valentino/better-auth-cloudflare-workers-the-integration-guide-nobody-wrote-8480331d805f)
- [better-auth-cloudflare](https://github.com/zpg6/better-auth-cloudflare)

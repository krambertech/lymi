# Public rendering beyond the landing page

**Status:** The landing-page boundary is implemented. Additional public routes remain a proposal,
6 September 2026.

## Why this exists

Lymi's private, authenticated learning experience remains a client-rendered React PWA. The public
landing page is now request-time server-rendered by the Hono Worker and hydrated by React. Its useful
HTML, metadata, and canonical URL therefore arrive before JavaScript runs.

The public surface may grow beyond one landing page. A future read-only shared deck is also a useful
example: its URL should produce a meaningful title, description, and preview card when pasted into a
messaging app, without exposing private deck data.

This proposal records how that boundary could extend if the public surface grows. It does not bring
shared decks, a blog, or additional marketing routes into the current product scope.

## Proposed shape

Keep one codebase, one design system, and preferably one Cloudflare deployment, but give each route
the rendering mode that matches its job.

| Surface | Example routes | Proposed rendering |
| --- | --- | --- |
| Landing | `/` | Request-time server-rendered, then hydrated (implemented) |
| Future marketing | `/about`, `/how-it-works`, future campaign pages | Decide between prerendering and request-time SSR per route |
| Documentation | `/docs/*` | Prerendered where content is static; server-rendered only when necessary |
| Public objects | `/share/decks/:shareId` | Server-rendered per request, then hydrated if interactive |
| Private product | `/app/*` or the existing private routes | Client-rendered PWA by default; selective SSR only where it adds value |
| Backend | `/api/*`, `/mcp`, `/.well-known/*` | Worker handlers, never client routes |

The root URL should have one stable meaning: the public landing page. A signed-in learner can enter
through `/app` or `/today`; the server should not need to choose between two unrelated pages for `/`.

## What “hybrid” means

For a prerendered or server-rendered route, the first response already contains the page content and
metadata. React then hydrates that HTML in the browser, where navigation, forms, and motion work as
they do today. Later navigation can stay client-side.

The PWA and hybrid rendering are compatible. The service worker can continue caching application
assets and an offline product shell, while public HTML follows a separate cache policy. Public pages
do not need to inherit the private app's navigation fallback.

## Future shared-deck example

A public deck preview should be an explicit, revocable read-only representation, not a public view of
the private deck record by default.

On a request to `/share/decks/:shareId`, the server could:

1. Resolve an opaque share identifier.
2. Verify that the share is active and expose only its approved public fields.
3. Render the deck title, short description, sample terms, canonical URL, and Open Graph metadata.
4. Return a private or unavailable response for revoked and unknown shares without disclosing whether
   a private deck exists.
5. Hydrate optional interactions such as expanding sample cards or copying the share link.

The exact sharing permissions, revocation model, indexing policy, and public data shape require a
separate product proposal before this route is built.

## Likely implementation path for additional public routes, if approved

TanStack Start is the most direct option to investigate because Lymi already uses TanStack Router and
Query. It supports server rendering, static prerendering, selective SSR, and Cloudflare Workers. A
manual TanStack Router SSR integration remains an alternative if replacing the application entry
point would disturb the existing Hono Worker too much.

The current landing handler deliberately avoids a framework migration: it renders the shared React
component into Vite's HTML shell with `react-dom/server`, then hydrates the same tree in the browser.
If several public route types are approved, an expanded implementation would likely:

1. Introduce shared router creation plus separate server and browser entries.
2. Hydrate server HTML in the browser instead of mounting into an empty root.
3. Prerender the known marketing and documentation routes during the build.
4. Give public dynamic routes a request-time server loader.
5. Keep Hono services and `/api/*` behavior intact, composing them with the rendering handler at the
   Worker boundary.
6. Keep the signed-in home at `/today`, with `/app` as its alias and the installed PWA starting there.
7. Create an isolated Query client for each server request and safely dehydrate public initial data.
8. Make responsive and browser-dependent components hydration-safe. Server output cannot depend on
   `window`, `localStorage`, pointer capability, or viewport width.
9. Define separate caching rules for immutable assets, prerendered public HTML, dynamic public pages,
   and the offline product shell.

Primary references:

- [TanStack Start static prerendering](https://tanstack.com/start/latest/docs/framework/react/guide/static-prerendering)
- [TanStack Start selective SSR](https://tanstack.com/start/latest/docs/framework/react/guide/selective-ssr)
- [TanStack Start on Cloudflare Workers](https://tanstack.com/start/latest/docs/framework/react/guide/hosting)
- [TanStack Router SSR](https://tanstack.com/router/latest/docs/guide/ssr)

## What stays unchanged

- React components, visual design, and client-side motion remain reusable.
- D1, Better Auth, API keys, MCP, and the service layer remain server concerns.
- The authenticated product can retain its offline-first Query cache and review outbox.
- A second repository or deployment is not required merely to add public pages.
- Shared and public decks remain outside the initial product scope.

## Questions to resolve before expanding

- Should additional public routes extend the current Hono rendering boundary, or justify making
  TanStack Start the primary handler and delegating API requests to Hono?
- Which app URLs must remain stable for OAuth callbacks, PWA shortcuts, bookmarks, and MCP clients?
- Should documentation be part of the prerendered build or deployed as independently cached assets?
- How should the service worker distinguish public navigations from authenticated offline routes?
- Is TanStack Start sufficiently stable for Lymi at the point this work begins?
- Which metadata and canonical URL tests are required in CI?
- What privacy and abuse controls are required before any share URL can exist?

## Trigger for revisiting

Revisit this proposal before adding a second substantial marketing page, a content section such as a
blog, or any public object page that needs reliable link previews. At that point, validate the current
TanStack Start and Cloudflare integration, prototype the Worker boundary, and make an ADR only after
the trade-off is tested.

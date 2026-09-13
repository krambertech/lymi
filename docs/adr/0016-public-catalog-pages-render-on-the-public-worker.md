---
status: accepted
date: 2026-09-13
---

# Public catalog pages render on the public Worker

Localized catalog, series, and deck pages live on `lymi.app` and are rendered by the `lymi-site` Worker from deliberately published D1 records. Product authoring, membership, authentication, and learning stay on `my.lymi.app`; **Add to Lymi** crosses that origin and returns through product authentication with the public content identity and chosen edition intact.

## Context

[ADR 0008](0008-public-website-and-product-use-separate-origins.md) and [ADR 0009](0009-public-website-and-product-deploy-separately.md) make the website public and indexable while keeping product cookies and private data on a separate origin. Today the website is prerendered Astro output and its Worker handles only narrow APIs. A maintained catalog and future community publishing need stable pages that can change without rebuilding the website and must still return useful HTML and truthful status codes to crawlers.

## Decision

The public Worker gains one runtime HTML boundary for catalog routes. It queries a strict public projection from the shared D1 database and renders only publication-approved metadata and preview fields. Unknown, private, withdrawn, incomplete, or unsupported editions return the appropriate public 404 or unavailable state rather than falling through to product content.

The website remains unauthenticated and never receives product cookies. The product owns the idempotent add operation and safe authentication return path. Catalog cache keys include publication identity, revision, and locale and never include a learner identifier or authenticated response.

Astro continues to own page templates, localization, metadata, sitemap generation, and the rest of the static website. The runtime catalog route is the sole HTML exception to ADR 0009's static-output rule unless a later ADR expands it.

## Considered options

- Render catalog pages on `my.lymi.app`. Rejected because product HTML is noindex, authenticated, and intentionally separated from public acquisition.
- Generate every page only at website build time. Rejected because corrections, withdrawal, and future community publishing would require a deployment to change public truth.
- Fetch catalog content only after a static client shell loads. Rejected because crawlers, previews, status codes, and no-JavaScript visitors need complete useful HTML.
- Let the public Worker render a strict publication projection. Accepted because it preserves the origin boundary while supporting live indexable content.

## Consequences

- Public catalog queries and serializers become an explicit security boundary with allowlisted fields and tests proving private cards, memberships, reviews, account identifiers, and drafts cannot leak.
- The website Worker needs read access to published content in D1 but no product session, OAuth, MCP, audio, review, or mutation authority.
- Publication and withdrawal must invalidate or version cached responses predictably.
- Public catalog routes require responsive, localized, accessible error and unavailable states in addition to successful pages.
- CI must verify rendered HTML, 404s, canonical and alternate links, sitemap entries, structured data, cache isolation, and the existing two-origin artifact boundary.

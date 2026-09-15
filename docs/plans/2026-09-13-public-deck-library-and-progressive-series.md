# Public deck library and progressive series

**Status:** Accepted for implementation on 13 September 2026. Product behavior is in [the accepted proposal](../proposals/public-deck-library-and-progressive-series.md), [ADR 0015](../adr/0015-published-decks-use-pinned-localized-editions.md), and [ADR 0016](../adr/0016-public-catalog-pages-render-on-the-public-worker.md). This plan prepares issue-sized slices; it does not authorize production data changes, deployment, or public content publication.

## Current foundation

[ADR 0011](../adr/0011-a-shared-deck-is-one-deck-with-many-learners.md) and its merged membership foundation already provide one owner, many learners, owner-only content writes, per-learner card states, and member-scoped reads. Lingui supports English, Ukrainian, and Russian interfaces, and the public Astro site is already separate from the product PWA. This plan extends those foundations rather than rebuilding them.

## Done when

One compact first-party series has a useful localized page on `lymi.app`, at least two maintained meaning-language editions, an idempotent add flow into `my.lymi.app`, progressive sections, independent learner review state, learner-controlled review of meaningful updates, privacy-safe acquisition measurement, and verified absence of private data in public responses.

Existing flat personal and shared decks must retain their current behavior when they have no series, sections, publication, or localization records.

## Slices

### 1. Add optional series and sections

Add the vocabulary, schema, services, API contracts, and owner interface for ordered series, decks within a series, sections within a deck, and cards without a section. Archive and restore remain reversible and audited; existing flat decks need no migration-time setup or new interface step.

Series and sections ship as two pull requests: series with series review and Today's series rows ([#101](https://github.com/krambertech/lymi/issues/101)), then sections ([#206](https://github.com/krambertech/lymi/issues/206)). Series stay the owner's until publication; a member of a shared deck sees the deck without its series.

Complete when an owner can create and reorder the hierarchy on phone and desktop, app, API, and MCP enforce ownership consistently, and fresh plus existing disposable databases pass generated-migration verification.

### 2. Gate learning by section and review by series

Make the first section active and the next ready after every current card was introduced and at least 80 percent are Known. Add **Start next section** and **Start anyway**, and never relock a started section. Series review already mixes a series' eligible cards through the existing queue (slice 1); this slice keeps locked cards out of it.

Complete when locked cards stay out of Today, scoped review, refill, reminders, and offline manifests; readiness agrees across devices; and urgency, new-card pacing, durable review, and sibling-mode exclusion remain intact.

### 3. Publish localized editions from the product

Add publication metadata, original meaning language, typed series/deck/section/card localizations, pinned edition membership, revision status, and an owner-only internal publish/import path. Keep community self-publishing and automatic AI publication out of scope.

Complete when ordinary decks create no localization rows, two editions share canonical target content, stale or incomplete editions cannot publish, human approval and provenance are visible, and public serializers expose only approved fields.

### 4. Render a public page and complete the add flow

Implement the public Worker projection and one localized series or deck route with preview, sources, publisher, edition selector, metadata, and correct unavailable states. Send **Add to Lymi** to the product and preserve content identity plus edition through sign-in.

Complete when no-JavaScript HTML is useful, unknown and withdrawn pages return 404, repeated adds create one membership, the edition is pinned, and page source, caches, metadata, and analytics contain no private state.

### 5. Add library discovery and SEO foundations

Add the catalog landing page, useful category and series browsing, canonical URLs, `hreflang`, sitemap entries, structured data, and privacy-safe events from public visit through first review. Exclude ranking, comments, community feeds, and indexable filter combinations.

Complete when every indexed page has unique editorial value, locale relationships and status codes validate, responsive and assistive states work, and acquisition can be measured without card answers or learner content.

### 6. Let learners review meaningful changes

Record affected stable content identities for corrections, new material, and material term or meaning changes. Apply current content automatically, keep future sections in progression, and add a quiet indicator plus **Deck settings → Review changes** for learning behind prior progress.

Complete when corrections preserve schedules, affected items activate once without rewriting reviews, stacked updates and concurrent owner/member actions are idempotent, and two learners at different positions receive the correct eligibility.

### 7. Launch the first-party lighthouse series

Create one compact essential-language series with a few progressive sections and at least two human-reviewed meaning-language editions. Record sources, provenance, editorial status, last review, correction ownership, and truthful public claims; publication remains a separate authorized action.

Complete after structured content, language-pair, duplicate, source, responsive journey, link, metadata, and small real-learner checks pass. Ukrainian road-sign recognition follows only after card images and source and redistribution rights are ready; exam simulation stays separate.

## Order and compatibility

Slices are dependency-ordered and should each fit one focused pull request. Slices 1–4 form the smallest end-to-end technical proof using internal fixture content; slices 5–7 complete the first public release.

Use expand, migrate, verify, and contract for schema changes. Inspect shared D1 migration state before generating files, preserve old clients and offline reviews, and never edit Drizzle metadata by hand. Membership, fan-out, update acknowledgement, archive, and restore paths must remain idempotent under retries and concurrent writes.

Adding published access does not copy, merge, or move a matching personal card. Withdrawing a publication stops discovery and new adds but does not delete existing memberships, states, or reviews.

## Recovery

Disable catalog listing and new adds while preserving authenticated study for existing members. Withdraw a faulty edition without deleting canonical content or learner history. If progression or update eligibility fails, disable new starts and change review while continuing valid issued reviews; repair forward rather than reversing additive schema or rewriting evidence.

---
status: accepted
date: 2026-09-13
decision: localized published editions with progressive sections and learner-controlled updates
issues:
  - https://github.com/krambertech/lymi/issues/103
  - https://github.com/krambertech/lymi/issues/104
---

# Public deck library and progressive series

## Outcome

People can discover a useful public deck on `lymi.app`, choose its meaning language, add it once through `my.lymi.app`, and learn it gradually. The publisher maintains one canonical source while every learner keeps independent review state and control over meaningful updates.

[ADR 0015](../adr/0015-published-decks-use-pinned-localized-editions.md) owns edition and update behavior. [ADR 0016](../adr/0016-public-catalog-pages-render-on-the-public-worker.md) owns the public-site boundary.

## Accepted shape

- Existing personal and private shared decks remain flat unless they opt into series, sections, publication, or localization.
- A series contains ordered decks; a deck may contain ordered sections. The first section starts active, and later sections become ready after the current material has been introduced and mostly learned. Learners may start a ready section manually.
- First-party editions share canonical target-language content and localize meaning-side content. The selected meaning language is pinned when the learner adds the deck; changing the app language does not rewrite learned prompts.
- Small corrections arrive without resetting progress. New or materially changed learning behind the learner's position waits for an explicit review of changes.
- Public pages show useful, crawlable information, representative previews, sources, publisher, language pair, scope, and editorial status without exposing learner data.
- Adding crosses from the public origin to the product origin, survives sign-in, and is idempotent.

The first content proof is one compact essential-language series with a few sections and at least two human-reviewed meaning-language editions. Ukrainian driving material follows only when image support, authoritative sources, redistribution rights, jurisdiction, and editorial ownership are clear.

Community publishing, ranking, comments, collaborative editing, classes, assignments, creator payments, and automatic AI publication remain later directions.

## Delivery

1. Add optional sections to the existing series model without changing ordinary decks.
2. Gate learning by section and allow review across a series through the existing queue.
3. Add approved localized editions, provenance, and an owner-only internal publishing path.
4. Render one public page and complete the edition-preserving add and sign-in flow.
5. Add a small catalog, canonical locale relationships, sitemap entries, and privacy-safe acquisition measurement.
6. Let learners review meaningful changes without rewriting schedules or review history.
7. Prepare one human-reviewed first-party series; publication itself requires separate authorization.

Use additive migrations and preserve old clients, offline reviews, stable card identities, memberships, and archive history. If catalog or progression fails, disable new discovery or starts while existing members keep studying.

## Done when

- Two learners use one canonical published deck with independent schedules and update choices.
- A visitor selects an edition, signs in, returns to it, and adds it exactly once.
- Sections introduce cards gradually without forcing many separate decks.
- Public responses, caches, metadata, and analytics contain no private content or learner state.

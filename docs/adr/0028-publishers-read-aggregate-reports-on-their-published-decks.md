---
status: accepted
date: 2026-10-09
---

# Publishers read aggregate reports on their published decks

A publisher reads how their published decks perform through `GET /api/reports/decks` and `GET /api/reports/decks/:id`, with the same API key they publish with. A read-only key on the same account reads them too. Reports cover every deck the account owns that has a `deck_publications` row, withdrawn and archived decks included. A deck the caller does not own, or never published, is not found. Reports return counts and never name a learner or return one learner's reviews.

This extends [ADR 0020](0020-a-published-deck-admits-anyone-who-adds-it.md), whose join audit rows are the record of adds, and keeps [ADR 0011](0011-a-shared-deck-is-one-deck-with-many-learners.md)'s rule that an owner never sees a member's progress. [Issue #441](https://github.com/krambertech/lymi/issues/441) holds the requirements.

## Context

A growth agent working for a publisher needs to know which decks people add, which lead to a first review, and which bring learners back. The Analytics Engine datasets carry no deck or account, and nothing counted visits to a public deck page.

## Decision

**Figures come from the rows Lymi already keeps.** Adds are the deck's `join` audit rows, because rejoining rewrites `deck_members.joined_at`. A learner's first join row is a new learner and any later one is a rejoin. `via` splits adds by publication and join link. Reviews are `reviews` joined through `cards.deck_id`, less `review_undos`, less `source = 'import'`, less the owner's own.

**Days are UTC.** A period is the last 7 or 30 UTC days, or a custom `from` and `to` of at most 366 days. Each report carries the equal-length period before it.

**Definitions are fixed.** Activation follows the new learners added in the period: a first accepted review within 7 days of the add activates a learner. Learners still inside those 7 days with no review are `pending` and stay out of the rate's denominator. A returning learner has accepted reviews on two or more UTC days in the period. Each field's OpenAPI description is its definition.

**Counts are exact.** Lymi does not suppress small counts. The reports already omit identities, publishers are a short list Lymi chooses, and a suppressed figure would make a new deck's first week unreadable. A rate is null when its denominator is 0.

**The site Worker counts page views.** Each request for a published deck's page in any locale adds one to `deck_page_views` for that deck, UTC day and locale. A HEAD, a prefetch, and a user agent that names a crawler, link previewer or script are skipped. The figure is requests, not people, and it stores nothing about the visitor. Days before the first counted day report null, never zero.

## Considered options

- **Suppress counts below 5:** rejected. See the counts decision above.
- **Count page views in Analytics Engine:** rejected. It keeps data for 3 months, and reading it needs a Cloudflare API token on the product Worker.
- **Add a human-facing report page now:** deferred. The first reader is an agent, and a page can read the same routes.
- **Report per edition:** deferred. A learner's pinned edition can change, which makes counting by edition harder, and no current question needs it.
- **Google Search Console figures in Lymi:** deferred. An agent can bring them, and keeping them apart keeps search impressions distinct from Lymi's own counts.
- **An MCP tool:** not added. Publishing is not on MCP either, and reports belong to the publishing key.

## Consequences

- Each counted page view is one D1 write from the site Worker, off the response path.
- Page views are not abuse-resistant. Nothing limits counting per visitor, so a script with a browser user agent can inflate a deck's figure and cost D1 writes. Adds and reviews need a signed-in learner and are the figures to trust; a per-visitor cap would need a rate-limiting binding on the site Worker.
- Report queries scan the owner's join audit rows. A publisher whose decks gather many thousands of adds will need a stored daily aggregate.
- Changing a definition changes past figures, because reports are computed when asked.

---
status: accepted
date: 2026-09-15
---

# A published deck admits anyone who adds it

A publisher can publish a deck they own. Anyone can then add it from `my.lymi.app/add/<slug>`, and a visitor without an account may create one on the way. The first public deck is Everyday Estonian, owned by a separate Lymi publisher account, with English meanings.

This extends [ADR 0011](0011-a-shared-deck-is-one-deck-with-many-learners.md): a published deck is still one live deck with many learners. [ADR 0015](0015-published-decks-use-pinned-localized-editions.md) owns editions and updates, and [ADR 0016](0016-public-catalog-pages-render-on-the-public-worker.md) owns the public page that links here. [The proposal](../proposals/public-deck-library-and-progressive-series.md) holds the product direction.

## Context

Account creation is gated. `user.create.before` admits an email on `ALLOWED_EMAILS`, or anyone arriving through a working join link. A public deck is meant to bring people from search and community posts who have neither, so the gate needs a third door or the deck cannot do its job.

## Decision

**Publishing is a row, not a copy.** `deck_publications` holds one row per published deck: the slug, status (`published` or `withdrawn`), and only what the public page may show (summary, level, meaning language, publisher, sources, last review). Every publish raises `revision` so public caches can key on it.

**Only listed publishers publish.** An account on `PUBLISHER_EMAILS` may publish a deck it owns, through `PUT /api/decks/:id/publication`. Withdrawing is `DELETE` on the same path and needs only ownership. Both are audited. There is no publishing interface yet.

**Adding reuses joining.** `/add/<slug>` renders like a join page. A signed-in visitor presses **Add to Lymi** and becomes a learner member. A signed-out visitor presses **Add with Google**. The slug rides through sign-in in the join cookie with a `p.` prefix, `user.create.before` admits the account while the deck is published and not archived, and `session.create.after` adds the deck. Adding twice changes nothing. A learner the owner removed is refused, as with a join link.

**Withdrawing closes the door, not the deck.** A withdrawn or archived deck admits nobody new and its add page returns 410. Members keep studying.

## Considered options

- **Open sign-up to everyone.** Deferred. Opening only through a published deck keeps the door tied to content Lymi curates, and it can widen later by removing a check.
- **Give the published deck a join link and link to `/join/<token>`.** Rejected. A join link is a capability the owner turns off for good, and its URL is unreadable. A public deck needs a stable, readable address that can be withdrawn and brought back.
- **Copy the deck into each learner's Library.** Rejected by ADR 0011; corrections would never reach anyone.
- **A publishing screen in deck settings.** Deferred. One first-party deck does not justify it, and the API route is the same contract a screen would call.

## Consequences

- Anyone who finds a published deck can create an account. AI enrichment, pronunciation audio and support load now scale with public traffic, not with an allowlist.
- The publisher account's Activity records every add. Join audit rows now say `via: link` or `via: publication`, which is enough to count adds without a new table.
- A deck's cards reach every member as soon as they are added. Until [learners can review deck changes](https://github.com/krambertech/lymi/issues/107), a published deck should get corrections, not new cards behind a learner's position.
- `PUBLISHER_EMAILS` is a Worker variable, so adding a publisher is a deploy.

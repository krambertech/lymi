---
status: accepted
date: 2026-09-13
decision: ADR 0015 and ADR 0016
---

# Public deck library and progressive series

This direction advances the public-deck opportunity previously deferred in [Market differentiation and go-to-market](market-differentiation-and-go-to-market.md). [ADR 0015](../adr/0015-published-decks-use-pinned-localized-editions.md) decides content and learning behavior, [ADR 0016](../adr/0016-public-catalog-pages-render-on-the-public-worker.md) decides the origin boundary, and [the plan](../plans/2026-09-13-public-deck-library-and-progressive-series.md) orders delivery.

## Opportunity

A visitor should be able to discover a useful Lymi deck on the open web, understand what it teaches, choose the language in which meanings are written, add it, and begin reviewing without first constructing the material.

The initial library is curated by Lymi. A small number of credible series with visible sources, useful previews, and maintained localizations should feel more valuable than thousands of thin or duplicated sets.

In the longer term, an owner may publish an ordinary deck or series. Community publishing extends the same content model; it does not create a marketplace-specific kind of deck.

## Product shape

**Category** is public browse metadata such as Languages, Driving, or Exams. It is not a learner-managed object.

**Series** is an optional ordered group of decks and a review scope, such as **Learn Estonian** or **Ukrainian driving**. Learners may create a series themselves or add a published one.

**Deck** remains a named group of cards. It may optionally contain ordered **sections** that stage when cards enter learning. A flat deck continues to work as it does today.

Only active sections enter review. The next section becomes ready after every card in the current section has been introduced and at least 80 percent are Known. The learner starts it explicitly, may choose **Start anyway**, and never has an unlocked section relock. Reviewing a series mixes eligible cards from all its decks through the ordinary queue.

## One deck, localized when needed

[ADR 0011](../adr/0011-a-shared-deck-is-one-deck-with-many-learners.md) already makes a shared deck one live deck with personal card states and reviews. Publishing adds public metadata to that deck; it does not copy the cards.

The existing deck and card text is the original meaning-language edition. First-party content may attach typed localization rows for series, deck, section, and card fields. The target term, target-language example, pronunciation, source, ordering, media, and review modes stay canonical; meanings, explanations, shared notes, example translations, and public descriptions may vary by meaning language.

Community decks normally have one owner-chosen meaning language and no localization rows. First-party editions record provenance, editorial status, and the canonical revision they translate so a changed source can mark a localization stale without creating separate decks.

The public-site language selects the corresponding edition by default. A quiet selector on the public page can change it before adding. The chosen meaning language is pinned to the membership and cannot change later; changing the app language does not rewrite learned prompts. This is a published-content exception to the personal enrichment default in [ADR 0013](../adr/0013-app-language-is-one-setting-that-meaning-language-follows.md).

## Author changes and learner control

The owner may edit published content freely. Learners always read current canonical content, so corrections arrive automatically and preserve review history. A small wording or metadata correction leaves schedules alone; a term or meaning change is treated as material by default and is offered for focused review.

Future sections appear automatically as upcoming material and follow normal progression. New or materially changed cards behind the learner's current position do not silently enter the queue. A quiet **Update available** indicator leads to **Deck settings → Review changes**, which changes learning eligibility without pinning the learner to an old content snapshot.

Moving content preserves progress attached to stable card identities. A fundamentally different learning item receives a new card identity. Archiving removes it from future queues without deleting any learner's review evidence.

## Public acquisition

Published series and decks have stable localized URLs on `lymi.app`. A page names the owner or publisher, target and meaning languages, scope, sections, card count, sources, last editorial review, and a representative preview without exposing learner data.

**Add to Lymi** crosses to `my.lymi.app`. Sign-in returns the visitor to the same deck and selected edition; repeated adds are idempotent. The public site never receives product cookies or learner state.

Pages must return crawlable useful HTML, correct 404s, canonical URLs, `hreflang`, sitemap entries, and suitable structured data. Near-duplicates stay out of the index. Lymi measures the privacy-safe path from public visit through add, first review, and retained review rather than optimizing page count.

## First-party catalog

The technical lighthouse is one compact essential-language series with a few sections and at least two meaning-language editions. It proves localization, acquisition, progression, and shared scheduling before content production grows toward thousand-card series.

Candidate expansions include Essential Estonian, Ukrainian, Russian, English, Spanish, and Japanese. A language series may contain level- or purpose-based decks such as A1 vocabulary, common phrases, or script foundations.

Ukrainian driving should separate road-sign recognition from exam preparation. Driving material requires authoritative sources, jurisdiction and revision dates, redistribution rights, and human editorial review. AI may draft or localize public material but never publishes it automatically.

## Future community

Publishing eventually becomes an optional owner action on an ordinary private deck or series. Community content begins with one meaning language, owner-controlled publication, correction reporting, moderation, clear provenance, and visible separation from first-party reviewed material.

Creator profiles, ranking, comments, collaborative editing, classes, assignments, analytics, and creator payments remain later directions. Private invitations and membership management continue under the separate [shared-decks plan](../plans/2026-09-12-shared-decks.md).

## Success evidence

- A flat personal deck remains unchanged when no series, section, publication, or localization exists.
- Two learners add one canonical published deck and retain independent schedules, progress, and update choices.
- A visitor changes the meaning language, signs in, returns to the same selection, and adds the deck exactly once.
- Sections introduce cards gradually and allow a manual start without forcing many separate decks.
- Corrections arrive automatically while new or materially changed learning behind prior progress waits for **Review changes**.
- Public pages earn qualified visits that convert into first reviews and retained use without exposing private content.

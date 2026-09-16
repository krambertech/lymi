---
status: exploration
date: 2026-09-16
decision: none
---

# What to publish in the deck catalog

## Outcome

The catalog grows from one deck to a set that brings people to `lymi.app` from search, and that the people who arrive actually study. [The library proposal](public-deck-library-and-progressive-series.md) owns how a published deck works; this one asks which decks are worth the editorial cost, and in which meaning languages. Nothing here is decided, and the shortlist is deliberately shorter than the ideas that produced it.

## The selection test

A deck earns a page only if it passes all five.

1. **The search ends in study.** "Eesti keele tasemeeksami sõnavara" is typed by someone who will review for months. "Laundry symbol meanings" is typed by someone who wants one answer and leaves. Traffic from the second kind is vanity.
2. **Supply is weak.** Quizlet, Anki shared decks and Memrise own English-meaning decks for large languages. They are thin or absent for small languages, and for meaning languages other than English.
3. **The material is Lymi's shape.** A term with one stable meaning, helped by an example, a pronunciation or a picture. Not facts, not procedures.
4. **The rights are clear.** Public domain, a permissive licence, or authored fresh. A ShareAlike source makes the deck ShareAlike too.
5. **One publisher can maintain it.** Content that changes rarely and can be re-reviewed in about an hour.

## The wedge worth taking

Lymi already ships English, Ukrainian and Russian, and [ADR 0015](../adr/0015-published-decks-use-pinned-localized-editions.md) makes a second meaning language an edition rather than a second deck. Almost every competing deck explains a language in English. A deck of Estonian, Polish or German explained in Ukrainian is close to unserved, and the people searching for it have a residence permit or a citizenship application riding on it. That is where weak supply and real study intent overlap, so it is where the catalog should be thickest.

## Shortlist

**Relocation and exam vocabulary, first.** Everyday Estonian in Ukrainian and Russian editions, which is the cheapest new page the catalog can produce. Then Estonian A2 and B1 exam vocabulary in all three meaning languages; B1 is the level Estonian citizenship requires, and 2025 pass rates near 60% say the demand is real (Haridus- ja Noorteamet, September 2026). Then Polish A1 and German A1 with Ukrainian meanings, and Latvian, Lithuanian or Finnish A1 with English meanings where the competition is thinnest.

**Road signs, second.** A sign deck answers "road signs and their meanings" with its own content rather than a page about content, and the same skeleton repeats per country. Estonia first: the theory exam is sat in Estonian, Russian or English, and the sign set is small. Germany, Poland and the United States follow. US MUTCD designs are public domain by the manual's own terms; German StVO signs are official works under §5 UrhG, where §62 and §63 still require no alteration and a named source. Each sign deck cites its national regulation and carries a review date, both already columns on the publication row, because a wrong meaning here fails somebody's exam.

**English for a purpose, third.** The New General Service List and New Academic Word List are CC BY-SA 4.0 (checked September 2026), so an academic-English or spoken-core deck is buildable today provided the deck carries attribution and inherits ShareAlike.

**One capped experiment.** Two decks, dropped if they bring no adds in 90 days: a writing-system deck such as Cyrillic or hiragana, which suits picture and production modes and has constant demand, and false friends across English, Ukrainian, Russian and Polish, which is the most shareable thing in this list. Both have weaker study intent than anything above them.

## Not now

General-knowledge picture decks — flags and capitals, laundry symbols, knots, element symbols — fail the first test and blur what Lymi is for. Medical, legal and first-aid material is out while a wrong card can cause harm. Official exam wordlists from Goethe or Cambridge are copyrighted selections; build to the level independently instead of copying one. Mass AI-generated decks are out on two counts: ADR 0015 requires a human publisher per edition, and unreviewed content at scale is what search engines penalise.

## What has to exist before the third deck

- The public catalog page and index from [ADR 0016](../adr/0016-public-catalog-pages-render-on-the-public-worker.md) are not built, so a published deck currently has no indexable page at all — only the product's add page, which is `noindex`.
- `sitemapPaths` in `apps/site/src/lib/routes.ts` is a static list; catalog entries have to come from publication rows, with a canonical and `hreflang` set per edition.
- Publishing is `PUT /api/decks/:id/publication` against a `PUBLISHER_EMAILS` Worker variable, so there is no authoring screen and adding a publisher is a deploy.
- New cards reach every member immediately until [learners can review deck changes](https://github.com/krambertech/lymi/issues/107), so publish a deck complete rather than growing it in public.
- Adds per deck is the measure, not sessions. Join audit rows already record `via: publication`, which is enough to count them.
- Every add puts enrichment and audio cost on a traffic curve rather than an allowlist ([ADR 0020](../adr/0020-a-published-deck-admits-anyone-who-adds-it.md)), while [payment](premium-subscription-and-payments.md) is unexplored. That, not editorial capacity, is the first thing a successful deck will break.

## Open questions

- Does each deck page need its own editorial layer — notes, sources, a short guide — to avoid three meaning editions reading as one list published three times?
- Who checks a sign deck against the current national regulation, and how often does that repeat?
- Do sign decks wait for [card pictures](card-images-and-visual-review.md), or ship as text and gain pictures later?
- Does the catalog stay first-party, or does growth past roughly a dozen decks require community publishing and the review load that brings?

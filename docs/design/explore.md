# Explore

Explore lets visitors and signed-in learners find published decks by language or subject. The public site and apps use catalogue rules from `packages/core/src/catalog.ts`. Public responses contain only published content; the signed-in API also identifies decks already in the learner’s Library.

The public route is `lymi.app/explore`, with Ukrainian and Russian versions at `/uk/explore` and `/ru/explore`. The public Worker renders it on the server. [ADR 0016](../adr/0016-public-catalog-pages-render-on-the-public-worker.md) defines the boundary between public and private data.

## Page layout

The header contains the title, a short description and search over a static background light. It has no primary button or total deck count. Each shelf shows its own count.

A sticky navigation row starts with **All shelves**, followed by a chip for each shelf. All shelves opens a list of languages A–Z followed by subjects. A chip jumps to its shelf. The row scrolls horizontally, with edge fades and desktop arrow controls. Once sticky, it highlights the visible shelf and keeps its chip in view. A shelf selected by a jump remains highlighted while its heading is visible, including near the page’s end.

Language shelves come first, followed by subject shelves. A shelf with its own page shows one row of decks and **See all**. A shelf without a page shows every deck. Search also shows all matching decks. Hide overflow tiles rather than clipping them so keyboard focus cannot reach invisible links. Keep consistent tile widths across short and full rows.

Each tile shows a real card from the deck’s current revision in a [deck tray](system/surfaces.md#the-deck-tray), followed by the deck name, summary, card count and section count. The deck name is larger than the preview’s cue. Preview the card in an available review mode, with its answer below the divider. Up to two background sheets indicate additional cards and spread on hover. The same revision produces the same preview for every visitor.

Tray colour is derived from the deck’s slug and reused on its page. Search and shelf membership do not change it.

## Shelves

`packages/core/src/types.ts` defines publication categories: `languages`, `geography`, `science`, `nature`, `arts`, `driving`, `citizenship`, `technology` and `work`. Categories are a fixed list with translated labels.

`shelvesOf` groups language decks by the language they teach and orders those shelves by deck count, largest first. Subject shelves follow in the order above. Decks with no category, an obsolete category, or `languages` without a language appear under **More decks**. Empty shelves are hidden, and each deck appears once.

Subject decks use their subject in page titles, link previews and structured data, regardless of the language their terms use. A publication has no separate level field; put a level in its name when needed.

## Availability by language

`readableIn` includes decks whose original meaning language or published edition matches the reader’s language. Ukrainian and Russian lists also include English decks. Draft and withdrawn editions do not qualify. The rule applies to public Explore, `GET /api/explore`, deck sitemaps and related-deck lists.

`offersDeck` also excludes language decks teaching the reader’s own language and excludes Russian language decks for Ukrainian readers. Subject decks remain eligible. The corresponding Ukrainian and Russian language-page links are hidden, and disallowed localized page addresses redirect to English. A directly shared deck page can still open in any locale allowed by `offersDeck`, even when it does not appear in that locale’s lists.

## Search

Public search filters the rendered catalogue by deck name, summary, preview card, subject, taught language, meaning language and tags. Subject, language and tag labels are searchable in both the page language and English. Shelf chips update with the results. Search and chip navigation do not change the URL.

The full catalogue is present in server-rendered HTML. Without JavaScript, chips link to shelf headings and All shelves uses a native popover. No results shows an unlit lantern, a clear message, a suggestion to try a card term or language, and an action to clear the search. The illustration is an empty-state treatment, not learner progress.

## Shelf pages

A shelf with at least three readable decks gets a page at `/explore/languages/<name>` or `/explore/subjects/<name>`, including localized versions where the threshold is met. Language path names come from their English names. **More decks** has no page. `shelfRoute` and `shelfAt` decide which routes exist.

A shelf page has a breadcrumb, one heading, a short description, deck and card counts, and a static background in the shelf’s colour. List all decks below, followed by explanatory text, questions and links to other shelves of the same kind. Do not use a single-card hero for a page containing many decks.

Default copy comes from the template. `shelf-copy.ts` provides translated overrides for individual shelves. Structured data includes `CollectionPage`, `BreadcrumbList` and `FAQPage` using the visible answers. The deck sitemap includes each available localized shelf page.

## Publisher identity

Use the publisher’s photo when available, the lantern tile for Lymi, and an initial on a dark surface otherwise. Use the same identity on the public deck page, product add page and Library attribution.

Publishing makes the publisher photo public through `/public/media/deck/<slug>/publisher-avatar?v=<version>` on the product Worker. The URL identifies the deck rather than the account. Withdrawing or archiving the deck stops serving the photo. Responses use `no-store` to avoid retaining access after withdrawal. Join links do not expose the owner’s photo.

The server-rendered byline keeps a fallback mark behind the photo. If the photo fails, it collapses to reveal the fallback.

## Deck tags

`PUBLICATION_TAGS` in `packages/core/src/types.ts` defines the allowed keys, such as Travel and HSK 1. Each app maps the keys to translated labels, with typechecking for missing labels. `PUT /api/decks/{id}/publication` rejects unknown keys; omitting `tags` preserves existing values. Removed keys are ignored when rendering.

Show tags as plain chips above Add, in stored order and the reader’s language. They do not navigate. On public pages use `over-tint`; in the product use a darker version of the header colour. Deck tags are separate from card tags.

## More like this

`rankRelated` sorts readable decks by shared tag count, then taught language, then category, preserving catalogue order for ties. Primary language subtags match, so `pt-BR` and `pt` match. Subject decks do not match by taught language. Omit unrelated decks and hide the section when no related deck remains.

Public pages show up to four decks, one row on desktop and two columns on phone. Their response validator includes related decks, so edits and withdrawals invalidate the page. The product excludes decks already in Library before ranking and shows up to three. Product related tiles open the deck page without an Add button, preventing an add from immediately removing the clicked tile.

## Publication and caching

List a deck only while it meets the conditions for its own public page to return 200. Withdrawal and archive remove it from cached catalogue pages within five minutes. Validators depend on catalogue content, locale and Worker version, never the requesting account.

## In the product

Signed-in learners open `my.lymi.app/explore` from the desktop rail or the learner menu in the narrow web layout. The native phone app has an Explore tab. `GET /api/explore` returns `PublicDeckSummary` rows for the learner’s meaning language plus Library membership.

Use the public shelf grouping and tray previews. Product tiles wrap the preview, name and actions in one panel. **Add** is secondary; it adds the deck without leaving the shelf and offers to open it in a toast. The tile then shows **In your library** and links there.

The deck page at `/explore/<slug>` uses the product layout. Its full-width coloured header contains the publisher, counts, name, summary and a white **Add to Library** button. Preview up to three cards beside the text on desktop and above it on phone, taking one from each section before repeating a section. Below the header, show sections in order with cards inside collapsed disclosures, followed by More like this.

Adding from the deck page keeps the page open. The preview cards combine into a stack with a check, and Add becomes **Open in Library**. A deck already added opens in this state. Do not repeat the confirmation in a toast. Reduced motion applies the final state immediately.

Product shelves show one row and link through See all to the full shelf in the product layout. All shelves uses an anchored menu on desktop and a drawer on touch. Search and the interactive trial review are public-site features.

Before the first web review, Today also shows **Explore ready-made decks about** with a searchable language or tests choice, up to twelve deck tiles, and **All decks**. Adding there starts the first review. Phone onboarding and its ready-made-deck banner are described in [onboarding.md](onboarding.md).

Share decks using `lymi.app/explore/<slug>`. Signed-out visits to product Explore routes receive a temporary redirect to the equivalent public path, preserving the query. Signed-in learners stay in the product.

# Explore

Explore is one catalogue in two places: the public page a visitor lands on, and the screen a signed-in learner browses. Both read the same projection, so neither can say something the other does not. Everything below describes the public page, and **In the product** at the end says what changes inside Lymi.

`lymi.app/explore` is where a visitor finds a published deck without knowing its address. It renders on the public Worker from a strict projection, carries no learner data, and is localized at `/uk/explore` and `/ru/explore` like every other public page. [ADR 0016](../adr/0016-public-catalog-pages-render-on-the-public-worker.md) owns the origin boundary.

## The page

The header is one thing: a search field, under the page's name and one line of what the catalogue is, over a still pool of the lantern's light. It carries no amber, because the page has no single primary action — a visitor is here to find one deck among many, not to press the one button. It does not count the decks: the shelves below already do, each under its own heading.

Under it the catalogue is a **shelf per category**, each wrapping into as many rows as its decks need. Every published deck is on the page, because a sideways scroll puts most of a shelf behind a gesture nobody asked for, and a catalogue this size has nothing worth hiding. The tracks fill the row, so a shelf of three decks is three decks rather than three banners, and a new category adds a shelf rather than changing the layout. A category large enough to bury the page will need paging or its own page; that is a decision to make when those decks exist.

A deck on a shelf is one of its own cards in a [tray](../../DESIGN.md#the-tray), its name under the tray, then its summary and its level, card count and section count. The card is real, drawn from the deck's own revision so every visitor to one revision sees the same page. The name is the largest thing in the group and the card's term sets smaller than it. Behind the card is a sheet of paper for each further card the deck holds, up to two; pointing at a deck spreads them.

The tray's colour follows the deck to its own page, where the same hue becomes the pool behind its name. Nothing stores it: both pages hash the slug, and neither takes the shelf into account, so narrowing the page never repaints a deck.

## Search and shelves

Search narrows what is already on the page: the deck's name, summary, level, the card on its tray, and the languages it teaches and explains, in the reading language and in English. Choosing a shelf narrows it the same way. Neither touches the address, so neither makes a page of its own for a crawler to find, and the whole catalogue is in the server-rendered HTML — the page is complete with JavaScript off.

A search with no match shows the lantern with its flame out — the search looked here and found nothing — says so, suggests a word from a card or a language, and offers the way back to everything.

## The publisher's mark

A published deck's byline is the publisher: their photo where they have one, the lantern tile where the publisher is Lymi, and one letter on a dark plate otherwise. The deck's page on `lymi.app` and the add page on `my.lymi.app` draw the same mark, because a visitor crosses from one to the other in a single press and the source of the deck must not change face on the way. The product draws it too, wherever a deck the learner added from Explore names its owner, so the deck keeps the face it was added under.

Publishing is what makes the photo public. The address carries the deck's slug rather than the account — `/public/media/deck/<slug>/publisher-avatar?v=<version>` on the product Worker, which is the only Worker holding the image bucket — so no account identifier reaches a public page and [ADR 0016](../adr/0016-public-catalog-pages-render-on-the-public-worker.md)'s boundary holds. Withdrawing or archiving the deck stops the photo with the page, and the response is `no-store` for the same reason a deck's approved media is: a cached copy would outlive the withdrawal. A join link never carries one: sharing a deck with a classmate is not publishing, and its owner's photo stays private.

The public page is server-rendered with no island, so it layers the mark behind the photo rather than swapping on an error; a photo that fails to load collapses and the mark shows through.

## Categories

A category is a column on the publication, from a closed list in `packages/core/src/types.ts`. It is closed because each one is a heading a translator writes and a visitor learns; adding a shelf is a deliberate change, not a typo in a publish call. A deck sits on one shelf. A deck with no category, or one naming a category that has since gone, gathers under **More decks** at the end, so publishing is never blocked on choosing a shelf, and a shelf with nothing on it never renders.

## What it costs to be wrong

A deck appears here only while its own page answers 200, from the same conditions, so the two can never disagree: withdrawing a deck or archiving it takes it off this page within the five minutes the cache holds. The response's validator changes with the catalogue's content, the locale and the Worker version, and never with who is asking.

## In the product

A signed-in learner reaches the same catalogue at `my.lymi.app/explore`, under Insights in the rail. On a phone it sits in the learner menu, because the pill is drawn for two destinations. `GET /api/explore` returns the same `PublicDeckSummary` rows the public page reads, in the learner's own meaning language, plus the deck in Library for each published deck they already study.

The shelves and the tray are the public page's. What is added is one press: **Add** on a tile joins the deck and leaves the learner on the shelf, with a toast that offers to open it; the tile then reads **In your library** and leads there. Add is secondary here rather than amber, because a shelf of decks has no single thing to press.

The one departure from the public page is that a tile here **is a card**, where the public page sets the deck's name on the open canvas below its tray. The press is why: a button under a name on bare canvas belongs to nothing and reads as loose, so the group it acts on has to be a surface. The tray keeps its hue inside that card, with its corners stepped down by the card's padding.

`/explore/<slug>` is the deck in the app's chrome, on the same column and the same title as every other screen: the name, the publisher under it behind the app's mark, the summary, the counts and **Add to your library**, with one of the deck's own cards in its tray beside them. Under that come the sections in order and every card under a closed disclosure per section.

The deck's colour lives on that tray and nowhere else. A full-bleed band of it was drawn first and rejected: against the rail it ended on an arbitrary edge, and it put an amber button on a coloured ground, where amber stops reading as the one thing to press. The tray is also the object the learner just pressed on the shelf, so the same card in the same colour meets them here.

The tray on this page shows its card **whole**, where a tray on a shelf cuts it at two thirds. A row of cropped cards reads as a shelf; one cropped card on its own reads as a rendering fault.

Amber lives on this page and nowhere else in Explore, because this page does have one thing to press; pressing it opens the deck in Library, since a learner who opened the page came for that deck. Search, the shelf filters and the try-it stack stay on the public page: a learner already inside Lymi can simply add the deck.

A deck is still shared as `lymi.app/explore/<slug>` and never as a product address, so a link works for someone who has no account. A signed-out visitor who opens the product address is sent to sign in and lands here afterwards, like any other screen behind authentication.

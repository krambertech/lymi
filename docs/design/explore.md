# Explore

Explore is one catalogue in two places: the public page a visitor lands on, and the screen a signed-in learner browses. Both read the same projection, so neither can say something the other does not. Everything below describes the public page, and **In the product** at the end says what changes inside Lymi.

`lymi.app/explore` is where a visitor finds a published deck without knowing its address. It renders on the public Worker from a strict projection, carries no learner data, and is localized at `/uk/explore` and `/ru/explore` like every other public page. [ADR 0016](../adr/0016-public-catalog-pages-render-on-the-public-worker.md) owns the origin boundary.

## The page

The header is one thing: a search field, under the page's name and one line of what the catalogue is, over a still pool of the lantern's light. It carries no amber, because the page has no single primary action — a visitor is here to find one deck among many, not to press the one button. It does not count the decks: the shelves below already do, each under its own heading.

Under it a chip per shelf, in shelf order, is the way to move through the catalogue: each jumps to its shelf. Below them the catalogue is a **shelf per language, then a shelf per subject**, each one row deep where the shelf has a page of its own: as many decks as fit the width, with **See all** in the shelf's header leading to the page. A shelf without a page shows every deck, since nothing else would lead to them, and so does every shelf while a search is narrowing the page. The row is a fixed number of tracks per width, and the decks past it are hidden rather than clipped, so a keyboard never lands on a tile nobody can see. The tracks fill the row, so a shelf of three decks is three decks rather than three banners, and a new language or subject adds a shelf rather than changing the layout. A shelf of three decks or more also has a page of its own, under **Shelf pages** below.

A deck on a shelf is one of its own cards in a [tray](system/surfaces.md#the-tray), its name under the tray, then its summary, card count and section count. The card is real, drawn from the deck's own revision so every visitor to one revision sees the same page. The card shows the way the deck asks it, by its picture, its meaning or its term, with the answer under the rule ([surfaces](system/surfaces.md#the-tray)). The name is the largest thing in the group and the card's cue sets smaller than it. Behind the card is a sheet of paper for each further card the deck holds, up to two; pointing at a deck spreads them.

The tray's colour follows the deck to its own page, where the same hue becomes the pool behind its name. Nothing stores it: both pages hash the slug, and neither takes the shelf into account, so narrowing the page never repaints a deck.

## Which decks a locale lists

Each locale's Explore lists only the decks its readers can use. A deck is listed where its original meaning language is the locale's language, or where it has a published edition in that language. On `/uk/explore` and `/ru/explore` a deck written in English is listed too, because those readers can use it; this covers AI Terms and the older English-only decks. The English page therefore leaves out a deck explained only in Ukrainian or Russian, such as an English vocabulary deck for Ukrainian speakers. A draft or withdrawn edition counts for nothing.

The rule is `readableIn` in `packages/core/src/catalog.ts`, and every list of decks follows it: the public Explore in each locale, `GET /api/explore` for the learner's meaning language, each locale's deck entries in `sitemap-decks.xml`, and More like this. A shelf left with no deck a reader can use does not render, and neither does its chip. A deck's own page is not a list: it still answers 200 at every locale's address, so a shared link never breaks.

## Search and shelves

Search narrows what is already on the page: the deck's name, summary, the card on its tray, its subject, the languages it teaches and explains, and its tags, the last three in the reading language and in English. The chips follow the narrowed shelves, so every chip still has a shelf to jump to. Neither touches the address, so neither makes a page of its own for a crawler to find, and the whole catalogue is in the server-rendered HTML — the page is complete with JavaScript off, where a chip is a plain link to its shelf's heading.

A search with no match shows the lantern with its flame out — the search looked here and found nothing — says so, suggests a word from a card or a language, and offers the way back to everything.

## Shelf pages

A shelf of three decks or more also has a page of its own, at `/explore/languages/<name>` or `/explore/subjects/<name>` and under `/uk/` and `/ru/`. A language is named by its English name, taken from the language tag, so the address reads the same in every locale and nothing is stored. A smaller shelf has no page, because it would be one deck with a header, and More decks never has one. A shelf may have a page in one locale and not another, and the page names only the locales that have it. `shelfRoute` and `shelfAt` in `packages/core/src/catalog.ts` decide both.

The page is text first: a breadcrumb back to Explore, the shelf's name as its one heading, a line on who it is for and its deck and card counts, over a still pool of the shelf's own colour, the way the lantern's light sits behind Explore's search. No card and no hand sits up there, because the page holds many decks and a card would make it read as one deck's page. Under it every deck on the shelf in Explore's tiles and order, then a short piece about the shelf, questions and answers, and the other shelves of the same kind that have a page.

Every shelf gets the template's words, filled with its own name. A shelf worth writing for gets its own line, about text and questions, which replace the template's; they live in `shelf-copy.ts` and are translated like any other message. The page carries a `CollectionPage`, a `BreadcrumbList` and an `FAQPage` whose answers are the visible text, and `sitemap-decks.xml` lists it in each locale that has it.

## The publisher's mark

A published deck's byline is the publisher: their photo where they have one, the lantern tile where the publisher is Lymi, and one letter on a dark plate otherwise. The deck's page on `lymi.app` and the add page on `my.lymi.app` draw the same mark, because a visitor crosses from one to the other in a single press and the source of the deck must not change face on the way. The product draws it too, wherever a deck the learner added from Explore names its owner, so the deck keeps the face it was added under.

Publishing is what makes the photo public. The address carries the deck's slug rather than the account — `/public/media/deck/<slug>/publisher-avatar?v=<version>` on the product Worker, which is the only Worker holding the image bucket — so no account identifier reaches a public page and [ADR 0016](../adr/0016-public-catalog-pages-render-on-the-public-worker.md)'s boundary holds. Withdrawing or archiving the deck stops the photo with the page, and the response is `no-store` for the same reason a deck's card media is: a cached copy would outlive the withdrawal. A join link never carries one: sharing a deck with a classmate is not publishing, and its owner's photo stays private.

The public page is server-rendered with no island, so it layers the mark behind the photo rather than swapping on an error; a photo that fails to load collapses and the mark shows through.

## Shelves

A publication's category is a column from a closed list in `packages/core/src/types.ts`: `languages`, or one of the subjects `geography`, `science`, `nature`, `arts`, `driving`, `citizenship`, `technology` and `work`. It is closed because each subject is a heading a translator writes and a visitor learns; adding one is a deliberate change, not a typo in a publish call.

A `languages` deck sits on the shelf of the language it teaches, which is the deck's own language, headed by that language's name in the reader's language; no Languages heading groups them. Language shelves come first, most decks first, then the subjects in the order above. A deck with no category, a `languages` deck with no language, or one naming a category that has since gone, such as `exams`, gathers under **More decks** at the end, so publishing is never blocked on choosing a shelf. A shelf with nothing on it never renders, and every deck sits on exactly one. `shelvesOf` in `packages/core/src/catalog.ts` does the grouping for both Explores.

A deck teaches a language only when it is not on a subject shelf. A subject deck's page title, link preview and structured data name its subject ("Periodic Table · Science · Lymi"), never a language's vocabulary, whatever language its terms are spoken in. A publication carries no level: a level belongs in the deck's name.

## Tags

A tag says what a deck is for, such as **Travel**, **For beginners** or **HSK 1**. The keys are a closed list, `PUBLICATION_TAGS` in `packages/core/src/types.ts`, for the same reason the categories are: each label is a string a translator writes. Each app keeps its labels beside its shelf headings, and the `Record` over the keys fails the typecheck when one is missing. A publisher sets them through `PUT /api/decks/{id}/publication`, which refuses a key not on the list; leaving `tags` out keeps the deck's tags, so a publishing tool that does not know them yet never clears them. A key later dropped from the list disappears from every page rather than breaking it.

A deck page shows its tags as plain chips just above its add button, in the list's order and the reader's language. They lead nowhere until a tag has a page of its own. On the public page they sit on the hero's colour as `over-tint` surfaces; in the product they take the cover's hue a step darker, as Back's hover does, rather than a grey `plate-2`.

A publication's tags are not a card's tags, and nothing copies one into the other.

## More like this

Every deck page ends with a row of the published decks most like it that the page's reader can use, drawn as Explore draws them. `rankRelated` in `packages/core/src/catalog.ts` orders them by the most shared tags, then the same taught language (so `pt-BR` and `pt` match, and a subject deck matches no language), then the same category, and keeps the catalogue's order on a tie. A deck that shares none of the three is not related, and a deck with nothing related shows no row at all rather than a row of strangers.

The public page shows four, one row of its widest column and two by two on a phone. Its validator covers the row as well as the deck, so another deck's new tag or withdrawal reaches the page like an edit to the deck itself.

## What it costs to be wrong

A deck appears here only while its own page answers 200, from the same conditions, so the two can never disagree: withdrawing a deck or archiving it takes it off this page within the five minutes the cache holds. The response's validator changes with the catalogue's content, the locale and the Worker version, and never with who is asking.

## In the product

A signed-in learner reaches the same catalogue at `my.lymi.app/explore`, under Insights in the rail. On a phone it sits in the learner menu, because the pill is drawn for two destinations. `GET /api/explore` returns the same `PublicDeckSummary` rows the public page reads, listed and written for the learner's own meaning language, plus the deck in Library for each published deck they already study.

The shelves and the tray are the public page's. What is added is one press: **Add** on a tile joins the deck and leaves the learner on the shelf, with a toast that offers to open it; the tile then reads **In your library** and leads there. Add is secondary here rather than amber, because a shelf of decks has no single thing to press.

The one departure from the public page is that a tile here **is a card**, where the public page sets the deck's name on the open canvas below its tray. The press is why: a button under a name on bare canvas belongs to nothing and reads as loose, so the group it acts on has to be a surface. The tray keeps its hue inside that card, with its corners stepped down by the card's padding.

`/explore/<slug>` is the deck in the app's chrome, on the same column as every other screen. Its header is one line naming the publisher behind their mark and the deck's card and section counts, then the name, the summary and **Add to Library**, with a hand of up to three of the deck's cards beside them on desktop and above them on a phone. The hand takes one card per section before a second from any, so it shows the deck's range. Under the header come the sections in order and every card under a closed disclosure per section, then More like this.

More like this here leaves out every deck already in the learner's Library before it ranks, so the row fills with decks they could add. It holds three, the column's one row. Its tiles are Explore's without the Add press: they lead to the deck's page, because an add from the row would take the tile out of the row it was pressed in.

The deck's colour is the ground of the whole header, back included: a band from the rail to the window's edge and up under the status bar, with its text on the page's own column. Add is white on it rather than amber, because amber on a coloured ground stops reading as the thing to press.

Adding leaves the learner on the page. The fan gathers into one squared stack under a check and the button becomes **Open in Library**, so the page itself says the deck arrived and no toast repeats it. A deck already in Library opens as that stack. Under reduced motion the stack and the check are simply there.

Today's getting started guide offers the catalogue in one banner under its plate: **Start with a ready-made deck**, on the first offered deck's tray colour, holding a card from each of up to three decks the learner has not added and a white **Browse ready-made decks** that opens Explore. It points rather than adds, because a learner with an empty Lymi does not yet know which deck they want, and Explore is where the decks sit on their shelves. It reads `GET /api/explore` only while the guide shows, and it is gone once every published deck is in Library and with the guide after the first review. Its button is white on the colour rather than amber, so the guide's own step stays the one thing to press. On a phone it is also the first sight of Explore, which otherwise sits in the learner menu.

The shelf chips are the public page's too. Search and the try-it stack stay on the public page: a learner already inside Lymi can simply add the deck.

A deck is still shared as `lymi.app/explore/<slug>` and never as a product address, so a link works for someone who has no account. A visitor without a live session who opens `my.lymi.app/explore` or `my.lymi.app/explore/<slug>` is sent to the same path and query on `lymi.app` with a temporary redirect, because the answer depends on the session; a signed-in learner stays on the product page.

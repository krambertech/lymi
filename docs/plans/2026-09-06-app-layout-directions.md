# App layout and information architecture: three directions

**Status:** Proposal, 6 September 2026. Nothing decided. Sketches of each direction, phone and desktop side by side, are on the [Lymi App Layout canvas](https://claude.ai/code/artifact/6d1d2635-c33f-46a5-94a8-2c7cee2b3d9a). Vocabulary is in [CONTEXT.md](../../CONTEXT.md); the register is [PRODUCT.md](../../PRODUCT.md).

## What is wrong with the current shell

The app has three top-level items (Today, Decks, Settings) for two daily jobs (review, add) and one occasional one (browse). Four things follow from that.

- **Today and Decks show the same list.** Today ends in every deck as a row. The Decks tab is the same rows with a create form on top. On desktop the sidebar lists the decks a third time.
- **Settings is a daily tab for a monthly screen.** It takes a quarter of the phone tab bar and a slot in the sidebar, and nobody opens it on purpose more than once a month.
- **Activity is planned for inside Settings.** The integrations plan puts the list of MCP and AI writes under Settings. After a lesson, Claude adds twenty cards and the only place to see them is three taps deep. The whole point of Activity is that nothing lands unseen.
- **Today with nothing due is a dead end.** The lantern is unlit, the copy says "Nothing due right now", and the only way forward is the tab bar. Product says the two daily jobs are review and capture. Today serves one of them.

Smaller things: there is no search surface although `/` is promised, the desktop column is 672 px in a 1440 px window with a 240 px sidebar, and the phone Add sits in the tab bar as a fourth tab rather than as the one thing to press.

## What the field does

The home screens of the apps worth learning from fall into three shapes.

| Shape | Apps | What people like | What they complain about |
| --- | --- | --- | --- |
| Deck list with counts | Anki, Mochi, AnkiDroid | Every deck's state at a glance; one tap into a deck | Two steps to start reviewing (deck, then Study); no "review everything" by default; feels like a file manager |
| Two big numbers plus a forecast | WaniKani, Bunpro | "Reviews 42 / Lessons 8" answers the only question; the hourly forecast lets you decide now or later | Dashboard creep: level bars, accuracy, heatmaps |
| A path or a Continue button | Duolingo, Memrise, Drops | Zero decisions | Streak pressure, mascots, nagging. Lymi's anti-reference |

Two other patterns matter. Things (the to-do app) uses Today as a plan, not a launcher: a short list of what is on for the day, quick add always one tap away, and settings behind an icon. Readwise's Daily Review opens straight into the first card. Both are closer to Lymi's register than any flashcard app.

Across reviews of Mochi and Anki alternatives the recurring wants are a single obvious start with a count, a quick capture from anywhere, cards you recently added visible before they hit review, and no numbers beyond a count. The recurring dislikes are duplicated navigation, settings as a top tab, and stats where the work should be.

## What Today has to answer

Five questions, in the order the learner asks them.

1. Is anything due, and how much? Then review.
2. What arrived since I last looked? Twelve cards from Tuesday's lesson, added by Claude. Then look them over, or trust them and let review find them.
3. Am I keeping the habit? The seven lights.
4. When is the next batch? "31 tomorrow." So I can leave it or do it now.
5. Can I add the word I just heard? Then add.

The three directions below differ in how many of those five the home screen answers on its own, and what it pushes to a second screen.

## Direction A: Lantern

One stage, one action. Today is the lantern, the count, the Review button, the seven lights, and one quiet row for cards that arrived since last time. Decks live behind a tab. Settings is a gear icon in the header on both screens.

Phone tab bar: Today, Add, Decks. Desktop: no sidebar. A top bar carries the lockup, Today and Decks, a search field, Add word, and the gear. The content column is centred and narrow.

**Answers 1, 3 and 5 on the home screen.** Questions 2 and 4 get one row and nothing.

Why choose it: it is the calmest of the three and the only one where the lantern is the screen rather than a decoration on it. It is also nearly what exists, minus the deck rows and the Settings tab.

What it costs: desktop uses very little of the window, and the post-lesson job (see what Claude added, fix two meanings, move one card) is always a tab and a tap away. With eight decks the Decks tab becomes the real home and Today becomes a splash screen.

A variant worth trying: Today opens on the first due card, with the lantern small above it. Space reveals, 1 to 4 grades, and there is no Review button at all. It removes one tap from the daily habit at the price of the moment of choice.

## Direction B: Day

Today is a plan for the day, in time order. A hero strip at the top: lantern, count, Review. Then "New", the cards that arrived since you last reviewed, one row per deck with who added them and when. Then "Due", one row per deck with a due count, so a deck can be reviewed on its own. Then one line of forecast and the seven lights.

Phone tab bar: Today, Add, Library. Settings is a gear in the header. Desktop keeps a sidebar, restructured: search at the top, Today and Library, the decks nested under Library, and Add word, Activity and Settings at the bottom. Activity keeps its own screen but stops being the only place integration writes are visible, because the "New" rows on Today are the same cards.

**Answers all five on the home screen.**

Why choose it: it fixes the two real problems, Activity being buried and Today being a dead end when nothing is due. With nothing due the hero strip shrinks and "New" and "Coming up" still fill the screen with something to do. The sections are lists of decks and cards, which is what the app is made of.

What it costs: the lantern shrinks to a strip except at the end of a session, and the screen has to be policed so it stays a list and never becomes a dashboard. The rule that keeps it honest: the only numbers on the screen are counts of cards. It also needs two small endpoints, cards added since the last review and due counts per day for the next week.

## Direction C: Shelf

Decks are the home. A review bar sits above them with the lantern, the total due and one Review button. Each deck row carries its due count, its new count and its size. On desktop the sidebar is the deck list with "All due" at the top, and the main pane is the open deck: title, Review this deck, a quick-add field, filter chips, and the card table.

Phone tab bar: Decks, Add, Activity. Settings behind the gear.

**Answers 1 and 2 per deck, 5 always.** Questions 3 and 4 have no natural home; the lights end up at the bottom of the deck list.

Why choose it: it is the best post-lesson editing surface of the three, and the closest fit with "one deck per lesson". Desktop becomes a proper two-pane tool where you never leave the deck you are filling. It scales to twenty decks without a redesign.

What it costs: the daily ritual becomes a bar above a list, not a moment. The app reads as a tool, which is the Anki shape Lymi set out to avoid. Two of the five playful moments (lit and glowing when something is due, unlit when nothing is) have nowhere to happen at full size.

## What is the same in all three

These are decisions I would make whichever direction wins.

- Settings leaves the primary navigation. A gear in the header on the phone, a bottom row in the sidebar or a gear in the top bar on desktop.
- Add is one tap from every screen: the centre tab on the phone, `N` and a button on desktop. The sheet stays as it is, with an "Add another" loop and, on desktop, a paste-many mode that takes one term per line.
- Search gets a surface: `/` on desktop focuses a field that is always visible, the phone gets an icon in the header. Results are cards grouped by deck.
- Review stays full-screen on both, tab bar hidden, grades along the bottom.
- The deck screen gains filter chips (All, New, Learning, Known) and a Review this deck button. On desktop the card list is a table; on the phone it is rows.
- Activity exists as its own screen in every direction. What changes is whether it is the only place integration writes are seen (A, C) or a fuller record of what Today already showed (B).

## Where it landed after two rounds

Kateryna picked B and reshaped it twice. The first page of the canvas is B as it stands; the second page keeps A and C.

- **A floating pill for navigation.** Two items, Today and Library, in a frosted pill above the home indicator. No Settings tab, no Add tab, no Review tab. A three-item version with You sits on the canvas as an alternate.
- **Review is a button, not a tab.** The amber button in the Today hero, and a bar at the top of Library with the lantern, the due count and Review. On desktop the hero button keeps `R`.
- **The flame is the streak, shown differently per screen.** On the phone it is a small pill in the Today header: the flame and the day count, nothing else. On desktop it is its own plate beside the hero: the count, the best run, the seven lights and one line of prose. This contradicts the "no streak counter" line in PRODUCT.md and DESIGN.md; if the streak stays, both change.
- **Insights is reserved.** A sidebar row on desktop and a third item in the pill on the phone, both marked later. Candidates for it: reviews per day, cards by state, the hardest cards, time per session.
- **You, from the avatar.** The avatar top right on Today opens the profile screen: Activity and Archived, then Settings, then API keys and connected apps, then Sign out. On desktop the sidebar ends in a profile row.
- **Add is a plus.** In the Today and Library headers on the phone. On desktop a small plus next to the logo opens a menu with New word (`N`) and New deck.
- **Library shows decks as two-line cards.** The name with its language, then chips for due, new and the card count. A deck with nothing due says when it is next up.
- **A quieter Today.** The lantern and the count, Review, the streak, what is new since the last review, one line of what is coming. Due-by-deck rows live in Library.
- **A capped desktop shell.** The whole app, sidebar included, sits in a centred frame of at most 1120 px.

## Features this shapes

The directions surface features that are not in the integrations plan. This is the list to document once a direction is picked, roughly in the order Today needs them.

1. **Review all due, or one deck.** Exists. Adds a per-deck entry point from Today and the deck screen.
2. **New since last review.** Cards added after the learner's last review, grouped by deck, each with its actor (you, Claude, the API) and time. Tapping opens the deck filtered to New. This is the daily face of Activity.
3. **Due forecast.** Due counts per day for the next seven days. One line on Today; later, maybe, a row under the deck.
4. **Search across cards.** Term, meaning, example. Results grouped by deck. `/` on desktop.
5. **Deck filters and a per-deck Review.** All, New, Learning, Known chips over the card list.
6. **Card editor with sources.** Every field shows where its text came from, with Undo. A "Fill in" action that runs enrich by hand on a card with empty fields.
7. **Paste-many add.** One term per line on desktop, into a chosen deck, duplicates reported as "already in Cucina".
8. **Activity.** The full record by day, from the integrations plan, reachable from Today's "New" header and from the sidebar.
9. **Archived.** A view of archived cards and decks with Restore.
10. **Settings.** Theme, meaning language, keyboard map, API keys, connected MCP clients, account.
11. **Seven lights and "That's the lot".** Exist. Unchanged.

## Open questions

- Should Today open straight into the first due card on the phone (A's variant), or keep the moment of choice?
- Does the flame streak replace the seven lights, or sit above them as drawn? And does the streak forgive a missed day?
- Is a daily cap on new cards wanted? FSRS tools default to one. Without it, a lesson that adds forty cards makes a forty-card session the next morning.
- Where does Activity's unread state live: the dot on its row, the count in the "New" header, or nowhere?
- Does the desktop deck screen become two-pane (C) under B, or stay a single column?

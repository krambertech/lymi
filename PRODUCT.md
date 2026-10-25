# Product

## Register

product

## Users

Lymi is for people who learn from real material and want to keep what they learned: words from a language lesson, terms for an exam, drug names for a pharmacology test. Language learners come first, and the languages Lymi supports in full get their own readings and stress marks; every other subject works with plain cards.

Kateryna is the first learner and the bar for every feature. She takes language lessons and uses Lymi in two places. On the phone, in short sessions, often in the evening. On the laptop, after a lesson, when she turns notes or a transcript into cards and wants the keyboard to do the work.

The job to be done is "remember what I learned in this week's lesson without spending my evening making cards." Capture has to be fast enough to do while the lesson is still fresh. Review has to be pleasant enough to do every day without being asked.

Two more kinds of people meet Lymi. A member studies a shared deck someone else writes, starting with Kateryna's Estonian class ([ADR 0011](docs/adr/0011-a-shared-deck-is-one-deck-with-many-learners.md)). A visitor finds a published deck on the public site and adds it. A feature earns its place by a real learner's need, never an imagined audience's.

## Product Purpose

Lymi turns what you learn into cards, lets AI fill in the tedious fields, and brings each card back with spaced repetition (FSRS).

It exists because the current tools each fail in one way. Anki is capable and unpleasant. Mochi is pretty and hard to feed from outside. AI card generators are fast and untrustworthy. Lymi should be pleasant, programmable, and honest about what the AI wrote versus what came from the lesson.

Success is repeated use of real material and retained recall, not the number of generated cards, public pages, or AI actions. For Kateryna that means she reviews in Lymi most days by choice, adding a lesson's vocabulary takes a few minutes instead of an evening, what the AI enriches is useful and easy to correct, and her cards and progress are the same on the phone and the laptop.

## Product Position

Lymi keeps what you learned in real life and brings it back until you remember it. It starts with adult language learners who collect material from lessons, reading, work, and conversations with people or AI.

The narrow promise is to remove the clerical work of making cards without removing learner judgment. Lymi keeps the original term, meaning, source, and context together; AI fills only blank fields, clearly marks what it wrote, and stays easy to correct or undo.

Learning moves from recognising material toward producing it. The review queue is calm and honest: it brings back useful material without streak pressure, invented urgency, or hidden grading by an assistant.

Lymi stays open to the tools learners already use. The apps, the API, and MCP share the same product rules, while private card content and review evidence stay under the learner's control.

## Surfaces

The web app, the phone app and the public site share the rules, the data and the design language. Only the layout and the input change with the screen.

- The phone leads the daily jobs: reviewing in the evening, glancing at what is due, catching a word while the lesson is fresh, and turning the lesson's pages into cards right after it. It also reaches the learner outside the app, through widgets, the Lock Screen, controls, sharing from other apps and one reminder.
- The web leads the jobs that want a keyboard and room: turning long material such as a PDF or a transcript into cards, tidying a deck, reading Insights at length, and setup.
- The Mac app is the web product in its own window, plus a menu bar lantern with the due count and a quick-add panel ([its README](apps/desktop/README.md)).
- The site is where a visitor meets Lymi and finds a published deck.
- AI assistants and scripts reach the same rules through the API and MCP.

Every learning feature reaches both apps. It ships on the web first by default and reaches the phone through a linked phone issue once it is verified. Setup runs on the phone too: import, export, API keys and connected apps. Publishing and deck reports go through an API key, from the docs, on either ([ADR 0030](docs/adr/0030-the-phone-leads-the-daily-jobs-and-setup-stays-on-the-web.md), [ADR 0036](docs/adr/0036-setup-runs-on-the-phone.md)).

## Features

What Lymi does today, by the learner's job. Each row names where it runs and the document that owns its rules. The words are defined in [CONTEXT.md](CONTEXT.md); how to drive each feature in a running product is in [the verify skill](.agents/skills/verify/SKILL.md).

### Capture

| Feature | What the learner gets | Where | Owner |
| --- | --- | --- | --- |
| Add a card | One card by hand, with duplicates skipped | Web (⌘K), phone (top bar, Shortcut, share sheet), Mac quick add, API, MCP | [Library, decks and cards](docs/design/library-decks-and-cards.md) |
| Smart add | The AI picks the terms worth a card from a lesson, a PDF or photos of pages | Web, phone | [The proposal](docs/proposals/adding-cards-from-a-lesson.md) |
| Enrich | The AI fills a card's empty fields, in the deck's style, and marks what it wrote | Web, phone, MCP | [ADR 0033](docs/adr/0033-a-deck-decides-what-enrichment-fills.md), [ADR 0037](docs/adr/0037-a-deck-learns-its-style-from-the-owners-cards.md) |
| Import | Decks and history from Anki, Mochi, Noji, Pleco, Quizlet or another Lymi account | Web, phone | [Imports and exports](docs/design/imports.md) |
| Reading apps | Readwise highlights every hour, Yomitan lookups through AnkiConnect | Web, phone | [App pages](docs/design/app-pages.md) |

### Organise

| Feature | What the learner gets | Where | Owner |
| --- | --- | --- | --- |
| Library and decks | Decks, sections inside a deck, series of decks, search and Select cards | Web, phone, MCP | [Library, decks and cards](docs/design/library-decks-and-cards.md) |
| Tags | Labels that find cards across decks, for filtering and review | Web, phone, MCP | [Library, decks and cards](docs/design/library-decks-and-cards.md) |
| Card fields | Meaning, example and its translation, notes, hint, picture, recordings | Web, phone, API, MCP | [CONTEXT.md](CONTEXT.md) |
| Supported languages | Furigana, pinyin, jyutping, Tamil readings, Russian and Ukrainian stress | Web, phone | [`packages/core/src/languages`](packages/core/src/languages) |
| Deck settings | Review modes, what enrichment fills, instructions for the AI, how sections open | Web, phone | [Library, decks and cards](docs/design/library-decks-and-cards.md) |
| Archive | Every card, deck and section can be archived and restored | Web, phone, MCP | [CONTEXT.md](CONTEXT.md) |

### Remember

| Feature | What the learner gets | Where | Owner |
| --- | --- | --- | --- |
| Today | What is due, the streak, rounds, and the first-run guide for a new account | Web, phone | [Getting started](docs/design/onboarding.md) |
| Review | One card at a time, graded 1 to 4, with Undo, hints and offline grading | Web, phone, Mac | [How a review works](docs/review.md) |
| Daily goal and streak | A chosen number of attempts a day, days in a row, one automatic rest day a week | Web, phone, MCP | [How a review works](docs/review.md), [The streak](docs/design/streak.md) |
| End of a review | One success screen with today's total and the ways on | Web, phone | [Review completion](docs/design/review-completion.md) |
| Insights | Charts of the learner's history, and the cards they often forget | Web, phone, MCP | [Insights](docs/design/insights.md) |
| Outside the app | One daily reminder, widgets, Lock Screen, controls, the Mac menu bar count | Phone, web push, Mac | [Phone](docs/design/system/phone.md) |

### Share and discover

| Feature | What the learner gets | Where | Owner |
| --- | --- | --- | --- |
| Shared decks | A join link or an invitation; every member keeps their own schedule | Web, phone | [ADR 0011](docs/adr/0011-a-shared-deck-is-one-deck-with-many-learners.md) |
| Explore | Published decks on shelves by language and subject, added in one press | Site, web, phone | [Explore](docs/design/explore.md) |
| Editions | A published deck in the learner's meaning language | Site, web, phone | [ADR 0015](docs/adr/0015-published-decks-use-pinned-localized-editions.md) |
| Report | A member tells Lymi a deck or card someone else wrote is wrong | Web, phone | [CONTEXT.md](CONTEXT.md) |
| Public site | Landing and use-case pages in English, Ukrainian and Russian, the changelog, the API docs | Site | [Site structure](docs/site-structure.md) |
| Deck reports | Adds and returning learners for a publisher's own decks | API | [ADR 0028](docs/adr/0028-publishers-read-aggregate-reports-on-their-published-decks.md) |

### Connect and control

| Feature | What the learner gets | Where | Owner |
| --- | --- | --- | --- |
| Connected apps | Claude, ChatGPT and other MCP clients read and write cards under the same rules | Web, phone | [Letting an app in](docs/design/connected-apps.md), [App pages](docs/design/app-pages.md) |
| API keys | A scoped key for scripts and the documented API | Web, phone | [ADR 0001](docs/adr/0001-integration-cards-are-ordinary-cards.md) |
| Activity | Every write that came from outside the app, with a way to inspect it | Web, phone | [Activity](docs/design/activity.md) |
| Export | One deck or the whole library, as an Anki package or a Lymi file | Web, phone | [Imports and exports](docs/design/imports.md) |
| AI services | One switch for everything Lymi sends to an AI service | Web, phone | [ADR 0039](docs/adr/0039-the-phone-sends-nothing-to-ai-until-the-learner-allows-it.md) |
| Account | Settings, feedback, and deleting the account | Web, phone | [CONTEXT.md](CONTEXT.md) |

## Brand Personality

Three words: warm, calm, quick.

The name is cut from lyhty, the Finnish word for lantern. The symbol is a storm lantern, the kind you carry. Its flame is the continuity of remembering: repetition keeps it alive, so it is out only when there is no streak and no review yet today, and the first review lights it again. What it shows in the signed-in product is in [the brand rules](docs/design/system/brand.md).

Brand-only appearances do not expose learner state. The app icon, login, and public surfaces use one canonical healthy flame. That is the emotional register: a small warm light you bring with you, not a coach, not a game, not a productivity dashboard.

Voice is plain and friendly. It says "Daily goal reached" when the chosen number is complete and "Nothing left today" when no useful reviews remain, not "Congratulations!" It counts cards, not points. It never nags. Undo is everywhere, because cheap mistakes are most of what "delightful" means in a review app.

Playfulness is allowed in four places, each tied to honest product state: the flame growing and sparking after a saved review, the stronger rise when the daily goal is complete, seven small lights for the last seven days, and the Undo toast. Forgot feeds the flame just as Easy does because both are repetitions. On the phone they can also be felt. A haptic answers every touch that changes state, and one sound, which the learner can turn off, marks the daily goal. Everywhere else the interface is quiet: the lantern and what it lights are the only things that glow, and every other surface is flat by day and lifted only slightly at night.

## Anti-references

- **Duolingo.** No mascot with a personality, no streak pressure, no confetti, no push notifications that guilt.
- **Anki.** No walls of settings, no default-widget grey, no feeling that the tool is fighting you.
- **Generic AI apps.** No sparkle icon on every AI feature, no purple-to-blue gradient, no "magic".
- **Editorial dark mode.** No display serifs, no near-black with a lone neon accent, no landing-page typography inside an app.
- **Skeuomorphic flashcards.** No paper textures, ruled lines, or drop shadows pretending to be a desk.
- **The dashboard.** No hero metrics, no charts on the home screen, no gamified progress rings shouting numbers. Today's counts are cards to act on, each leading to its review, and its one picture is the streak's run. Charts belong in Insights, on their own screen, where looking at them is a choice.

## Design Principles

1. **The words are the content.** Every screen is built around the term on the card. Type, spacing and colour serve legibility first. Nothing competes with the term for attention.
2. **Quick before clever.** Capture and review are the two things done every day. They get keyboard shortcuts, one-tap answers, and no confirmation dialogs. Cleverness goes into enrichment, where the learner has time.
3. **Show what the AI did.** Anything the AI wrote carries its field source, so AI text is never mistaken for the lesson. Enrichment fills only empty fields and never overwrites text. A card an integration adds is an ordinary card from the moment it lands, and Activity lists the write so the learner can inspect, edit or archive it.
4. **Standard controls, one symbol.** Buttons, inputs, chips and lists look like what they are. The lantern is the single piece of illustration in the app, and it appears at full size only where there is nothing else to look at.
5. **Cheap mistakes.** Every destructive or scheduling action can be undone within a few seconds. Archive instead of delete. Progress is never lost to a wrong tap.
6. **Same app on both screens.** Desktop and phone are the same product with different layouts, not a main app and a companion. Review continuity across devices is a feature, not a sync detail. Which screen leads which job is in [Surfaces](#surfaces).

## Accessibility & Inclusion

- WCAG 2.2 AA is the floor. Body text meets 4.5:1 in both themes, including muted text and placeholders.
- Light and dark themes are both first-class. The app follows the OS unless the learner picks one. Dark is a warm room lit by the lantern, not black.
- All motion respects `prefers-reduced-motion`. The flame's flicker, its breath and spark after a review, and its rise at the goal each have a still alternative: the flame takes its new size and halo at once, and no spark plays.
- Everything works from the keyboard on desktop: grading (1 to 4), reveal (Space), add (N), review (R), search (/).
- Tap targets are at least 44 px on the phone. Grade buttons are 72 px tall on the web and 80 pt, nearly square, in the phone app.
- Inputs are 16 px or larger so iOS does not zoom.
- Status is never colour alone. "New", "Learning" and "Known" carry a label and, where colour is used, the state's icon.
- Audio has a visible control and never autoplays.

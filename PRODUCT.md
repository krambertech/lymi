# Product

## Positioning

Lymi is a flashcard app for learning any subject with spaced repetition. Learners create cards from notes, lessons, books and other material, or start with a published deck. AI reduces the work of preparing cards while the learner controls their content and grades their own recall.

Language learning is one use case alongside exams, medicine, professional certifications and other subjects. Language-specific readings, stress marks and pronunciation improve language cards without defining the scope of the app. Cards also work without a language.

## Who it is for

Lymi is for people who want to remember what they study and spend less time preparing cards. They may write their own cards, use an assistant or import an existing deck. Members of a shared deck review the owner’s content with their own schedule and history. Visitors can browse published decks and add one to Library.

Kateryna’s language lessons are an important source of product feedback. They are a concrete use case, not a limit on the audience or subject matter. Evaluate a feature against a real learning need rather than an imagined audience.

## What should work well

Capture and review are the main tasks. Adding useful cards should take minutes, and daily review should be quick to start and easy to continue across devices.

- **Create useful cards with less effort.** Accept material from the learner’s existing tools, preserve its context and skip duplicates.
- **Keep AI work inspectable.** Mark fields written by Lymi’s AI, make them easy to correct and preserve learner-written text. Enrichment fills empty fields; its own example translation can be refreshed when the example changes.
- **Support recall.** FSRS schedules reviews, and the learner grades each attempt. Count attempts honestly and keep reminders free of guilt or invented urgency.
- **Keep control with the learner.** Provide archive and restore for learning content, Undo for supported actions, portable exports and scoped integration access. Account deletion is a separate permanent action.

Success means regular review of useful material and improved recall. Generated-card counts, public-page counts and AI usage alone do not establish that success.

## Surfaces

The apps share product rules, account data and design tokens. Layout and input follow the device.

- **Phone:** daily review, quick capture, photos of notes, widgets, sharing from other apps and reminders.
- **Web:** review, longer source material, keyboard-based editing, deck organisation and detailed Insights.
- **Mac:** the web product in an Electron window, plus a menu bar due count and quick-add panel ([README](apps/desktop/README.md)).
- **Public site:** product information, published decks, guides and API documentation.
- **API and MCP:** card and deck management from scripts and assistants under the same permissions as the apps. Integrations cannot grade reviews.

Learning features belong on both web and phone. By default, ship on the web first and track phone delivery in a linked issue after verification. This is a delivery policy, not a claim that every screen already matches. Import, export, API keys and connected apps are available on the phone too. Publishing and publisher reports use an API key ([ADR 0030](docs/adr/0030-the-phone-leads-the-daily-jobs-and-setup-stays-on-the-web.md), [ADR 0036](docs/adr/0036-setup-runs-on-the-phone.md)).

## Features

What Lymi does today, by the learner's job. Each row names where it runs and the document that owns its rules. The words are defined in [CONTEXT.md](CONTEXT.md); how to drive each feature in a running product is in [the verify skill](.agents/skills/verify/SKILL.md).

### Capture

| Feature | What the learner gets | Where | Owner |
| --- | --- | --- | --- |
| Add a card | One card by hand, with duplicates skipped | Web (⌘K), phone (top bar, Shortcut, share sheet), Mac quick add, API, MCP | [Library, decks and cards](docs/design/library-decks-and-cards.md) |
| Smart add | The AI extracts candidate cards from text, PDFs or photos; the learner chooses which to add | Web, phone | [Getting started](docs/design/onboarding.md), [implementation](docs/stack.md#ai-enrichment-plus-lazy-multilingual-speech) |
| Enrich | The AI fills a card's empty fields, in the deck's style, and marks what it wrote | Web, phone, API, MCP | [ADR 0033](docs/adr/0033-a-deck-decides-what-enrichment-fills.md), [ADR 0037](docs/adr/0037-a-deck-learns-its-style-from-the-owners-cards.md) |
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
| Daily goal and streak | A chosen number of attempts a day, days in a row, an automatic rest day when no rest day occurred in the preceding six days | Web, phone, MCP | [How a review works](docs/review.md), [The streak](docs/design/streak.md) |
| End of a review | Today’s review total and the available next actions | Web, phone | [Review completion](docs/design/review-completion.md) |
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
| Export | Owned decks as an Anki package or a Lymi file; a single deck also supports a spreadsheet | Web, phone | [Imports and exports](docs/design/imports.md) |
| AI services | One switch for everything Lymi sends to an AI service | Web, phone | [ADR 0039](docs/adr/0039-the-phone-sends-nothing-to-ai-until-the-learner-allows-it.md) |
| Account | Settings, feedback, and deleting the account | Web, phone | [CONTEXT.md](CONTEXT.md) |

## Design and voice

Use clear text, readable content, standard controls and quick interactions. Give capture and review keyboard shortcuts and comfortable touch targets. Explain failures and provide a recovery action. Use confirmation for irreversible choices and Undo where the operation supports it.

Write in plain, friendly language. Name the action or outcome directly. Count cards and reviews, and keep status separate from praise or pressure. [CONTEXT.md](CONTEXT.md) defines product terms; [DESIGN.md](DESIGN.md) indexes the interface rules. The lantern’s role and rendering rules live in [brand.md](docs/design/system/brand.md).

Keep charts in Insights, where the learner chooses to inspect them. Today should help the learner start a review. Avoid decorative gradients, unnecessary illustrations, excessive settings and game mechanics that compete with learning.

## Accessibility

Target WCAG 2.2 AA. Use both themes, visible focus, keyboard access and status labels that do not rely on colour. Text contrast must meet 4.5:1 for normal text. Phone touch targets are at least 44 points; web inputs use at least 16 px text to prevent iOS zoom.

Respect the learner’s reduced-motion setting and the OS preference. State changes must remain clear without animation. Audio starts only when requested and has a visible, named control. Platform-specific requirements and component sizes belong in [the design system](DESIGN.md#where-the-rules-live).

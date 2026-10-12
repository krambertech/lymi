# The phone app

The phone app in `apps/mobile` takes the tokens, the lantern, the flame, the reveal, the end of a review and the moments in [motion.md](motion.md) from `packages/design`, and keeps the web's component names, Onest and Lucide. This file lists only where the phone differs, each time because touch or iOS gives it a better way. Lymi draws its persistent chrome and every row and icon; Apple draws the sheets they sit in, the share sheet, alerts, the keyboard and permission prompts ([ADR 0029](../../adr/0029-the-phone-app-is-expo-react-native-sharing-core.md)). iOS's pull-down menus brought SF Symbols and a morph that did not match Lymi, so a menu is a sheet of Lymi's rows instead. Which jobs the phone leads is in [PRODUCT.md](../../../PRODUCT.md#surfaces).

## Navigation

- The tabs are iOS's own tab bar, in Onest with Lucide icons: Today, Library, Explore and You, each an icon over its label. The chosen tab is ink on the system's lens; the rest take iOS's monochrome style. Tapping the current tab returns its stack to the top. Before iOS 26 it is the system's classic bar ([ADR 0034](../../adr/0034-the-phone-uses-the-system-tab-bar-and-captures-from-the-top-bar.md)).
- Every screen's top bar is pinned, with its actions as glass buttons at its end. A tab's large title starts in the bar and shrinks to an inline title at its start as the page scrolls; a page's title travels from under the bar into its middle, and its named back folds into a round glass back. What scrolls beneath softens into the room, never at rest, so nothing crosses the lantern's light.
- **You** gathers what is about the learner: their photo, name and email at the top, where a tap opens a sheet of Lymi's rows, as a Select does, to rename and to take, choose or remove the photo; Insights as one plate that opens the full page, carrying the month's recall and the thirty-day strip once there is a review; then the reminder time and the theme, then Activity, Settings, feedback and sign-out. The theme and the reminder time belong to the phone, as the web keeps them per browser. Between Settings and feedback, **Your data** holds the setup jobs that stay on the web ([ADR 0030](../../adr/0030-the-phone-leads-the-daily-jobs-and-setup-stays-on-the-web.md)) as rows that end in an arrow out and open the web; publishing and deck reports, done with an API key, show only to an account with a published deck. A place the phone does not have yet pushes a page that says so and opens the web's. Archived closes Library.
- Capture is an amber glass button at the end of every tab's top bar, beside the streak. A tap opens Add a word as a sheet from below. Explore has neither: its bar holds Filter and Search in one glass capsule, because finding a deck there is the job, and a word is caught from any other tab.
- Library's bar holds what Library is for instead: search, then the amber plus, which grows into a small menu of Lymi's rows where it stands (Add a card, New deck, New series, Import decks) and shrinks back into the button. The streak stays on Today.
- Search sits at the foot of the screen and rides on the keyboard, as iOS 26's own search does: a glass field and a round glass close, with a filter between them where the screen has one. The screen above it is empty until the first letters are typed. Every search on the phone uses `SearchBar`.
- Inside a deck with cards due, the tab bar's accessory shows how many and a play button, as Podcasts shows what is playing; a tap starts the deck's review. Before iOS 26 the deck shows its Review button instead.

## How a screen arrives

| Motion | For | Leaves by |
| --- | --- | --- |
| Push from the side | A page to read or work in: a deck, a card, a series, Insights, Activity, Settings, a deck in Explore | The named back, or a swipe from the start edge |
| Sheet from below | A task with an end: Add a word, New deck, Edit card, a choice list such as the daily goal, the card menu in a review, the reminder time, the streak | A swipe down, with detents where the task grows |
| Cover from below | A mode that takes the screen: a review, Welcome and sign-in | X, or pulling the top bar down |

This is [overlays.md](overlays.md)'s rule in iOS's own navigation: from the side means back, from below means swipe down.

The streak is the one place that differs from the web, where touch shows it as a page from the end edge ([streak.md](../streak.md)). On the phone it peeks at the run and today and drags up for the month, so glancing at it never leaves the screen under it. Its daily goal is a choice list in a sheet of its own over it: a preset is saved once the sheet has gone, a number of one's own on Save, and with no connection the list says it needs one.

## Components

The phone's components are in `apps/mobile/src/ui` under the web's names, and follow [forms.md](forms.md), [buttons.md](buttons.md) and [chips-and-marks.md](chips-and-marks.md). They differ in these ways:

- Every control is 44 pt, so a `md` button is 44 pt tall and `sm` reaches 44 pt through its hit area.
- `Sheet` is iOS's own sheet with Lymi's content, so it is Liquid Glass, follows the finger and swipes away. It opens at the height of what it holds, titled in line with the rows' text. Rows that belong together share one plate inset 16 pt from the sheet's edge, 12 pt from the next, split by full-width hairlines, as every plate in Lymi is. A row is 52 pt with a Lucide icon in the slot every row keeps, red when it removes something, a check when chosen, a chevron when it opens more. A sheet with more to show peeks at its first group and drags up to the full screen, where iOS makes it opaque and the sheet colour keeps the plates apart, as the dev menu does. `DropdownMenu` and `Select` are sheets of rows; a choice runs once the sheet has gone. Which kind of sheet a task gets is in [Sheets](#sheets).
- A sheet's own controls float on it as glass: a round 44 pt button in each top corner, close at the start and the sheet's action at the end, tinted amber, with a glass pill between them for what the sheet works in, such as the deck.
- Chips come in `sm` and `md`, and a state chip is one size wherever it shows, Forgotten included; the AI badge is the `sm` chip. A due count has one size. The web's `xs` chip, `lg` chip, `lg` due count and `xs` icon button have no phone use yet.
- `Switch` is drawn by Lymi, amber when on, so it sits in a form beside the other controls.

The design screen shows each component in every state. Open `lymi://design`, as the web has `/design`; each canvas has its own switch for the other room.

## Empty states

`EmptyState` in `ui/empty-state.tsx` is every place with nothing to show, following [empty-states.md](empty-states.md)'s rules in one component rather than the web's several. Why the place is empty picks the icon, and where it sits picks the size.

- **Kinds:** `start` for nothing made yet, `noMatch` for a search or filter that matched nothing, `failed` for a read that failed, and `offline` for a place that needs a connection the phone does not have. Only `failed` is red; being offline is no failure.
- **Sizes:** `page` when the whole screen is empty, large and centred in the room the bars leave, with a primary button; `inline` inside a plate already on the screen, which is its surface, with a small secondary button. It never brings a plate of its own.
- The icon sits in a soft disc, never the lantern, and the title names what is missing: "No decks match “map”", not "Nothing here". Still loading is a skeleton, never an empty state.

## Sheets

Every sheet rises from below and swipes away. What the task holds decides its kind, and the kind decides its glass and its fills:

| Kind | For | Built with | Surface | Fills |
| --- | --- | --- | --- | --- |
| Row sheet | A choice or a small edit over the screen: a menu, a `Select`, one of Add a word's fields, the daily goal, the reminder time, the learner's name and photo | `Sheet`, inside the screen | iOS's glass, untinted, at the height of what it holds | On-glass |
| Peek sheet | A screen to glance at that drags up for more: the streak | A route presented as `formSheet`, with detents | `useFrost`, the sheet colour at 50%, while it peeks; iOS makes it opaque at full height | On-glass |
| Full sheet | A form with long text or several fields, keyboard up: Add a word, feedback | A route presented as `formSheet` at full height | Opaque, the sheet colour | The room's own, since on-glass fills vanish against an opaque sheet |

- Reach for a row sheet first. A small edit belongs in one even when it has a text field: the field is a `bg-glass-plate` box with no label over it, and the keyboard's done key or a swipe keeps the value, with no Save button.
- A row sheet never opens a sheet, the camera or the photo library over itself. A row that needs one closes the sheet and acts once it has gone.
- A peek sheet and a full sheet carry their controls as glass in the top corners; a row sheet has none.
- A full sheet's header is one row: close at the start, its name centred at `text-md`, the one action at the end. Nothing under it repeats the name as a large title; a line saying what the sheet is for comes first in the content.
- A row sheet's groups carry the hairline `edge` every plate has, so they still read when iOS turns the sheet opaque at full height, in either theme.
- Whatever fails after a row sheet has gone says so on the screen under it, beside what it changed.

## Add a word

Add a word composes a card the way Linear composes an issue: a Liquid Glass sheet with close, the deck and Add as glass in its top corners, then the term, large with the keyboard already up, the meaning and the notes. Each is its name in small text over a line with no box, so a filled line still says what it holds and the empty one says what goes in it; all wrap as they fill. Return in the term goes to the meaning, Return in the meaning adds, and Return in the notes starts a new line.

The card's other fields are chips over the keyboard, after the AI's fill: example, pronunciation, memory hook, source, the section when the deck has any, the picture, and how it's asked. A chip adds nothing to the form. A text field's chip opens that one field in a sheet with the keyboard up, as the web's FieldChip opens a drawer; the keyboard's done key or a swipe closes it, and the chip then shows what it holds. The section is a choice list, and how it's asked is the deck's modes or the text modes ticked here; unticking the last one goes back to the deck's. The picture is taken or chosen in its sheet with a description that does not name the answer, and uploads once the card exists; one chosen offline is dropped with a line that says so. Tags wait for their own phone control. Autocorrect is off wherever the text is in the language being learned: the term, the example and the pronunciation.

The sheet stays for the next card: a line under the fields says where the last one went, with Undo for five seconds, or which deck already has it. A duplicate keeps the form with the term selected, as on the web. The deck, the AI choice, the picture until it is added, and the source carry over.

## Review

- Grades are four plates under the card, 80 pt tall and nearly square, and the card shrinks to make room.
- X is a plain icon button with a 44 pt target and no glass disc, because leaving is rare.
- Pulling the top bar down follows the finger and, past a third of the screen, ends the review on the end screen, as X does. Today shows behind it as it moves.
- The cards are a stack, where the web keeps one plate whose words change ([motion.md](motion.md#review)). The next card slides in over the one just graded from the end edge, turned a little and straightening as it lands, while the graded card and its grades wait underneath. Under Reduce Motion the next card fades in.
- A swipe from the start edge drags the top card off the same way and uncovers the last graded card, revealed with its grades and waiting for a grade, and removes that grade. It goes back one card. The pointing hand shows it once, on a learner's second card ever; VoiceOver offers it as an action on the card.
- A tap on a revealed card opens its menu as a sheet of rows. A hook is written in a sheet with the keyboard up, as Add a word's fields are, rather than in place under the word, which the keyboard would cover; the keyboard's done key saves it, with no button repeating that, and on an empty field keeps the AI's draft, which is its placeholder; a swipe down discards it. Pressing Easy after a peek says why in a tip over the grades.
- After a grade the flame breathes and sparks from the hood, as on the web.
- At the end the lantern's light reaches the edges of the screen. Review forgotten leads with the Forgot mark, as on the web.

## Insights

Insights keeps the web's figures, lines and order ([insights.md](../insights.md)), and changes the grid of four plates, whose lines are too narrow to read at phone width. Recall keeps a plate of its own with its period switcher and chart. Consistency, Cards and Ahead are rows on one plate, each figure beside its number and its line under both: Cards draws its three states as one bar and Ahead its seven days as bars without labels. Day by day shows two months, swipes back through the year and opens on today; a tap on a day says what it held on the line under the field, which starts on today. Often forgotten closes the page: each row is the term and how often it was forgotten, and opens its deck.

## Activity

Activity is the web's list ([activity.md](../activity.md)): day headings over plates of rows, and Show more at the foot. A row that wrote cards opens them in a sheet over the list rather than in place, so the day keeps its shape; it peeks at the first six and drags up for the rest. A card or a deck opens its deck in Library. An import or an export opens on the web with an arrow out, because files are handled there ([ADR 0030](../../adr/0030-the-phone-leads-the-daily-jobs-and-setup-stays-on-the-web.md)). A kind of row a newer server sends reads as a change to its deck, and a file's stage or format it does not know is named neutrally, never as finished or as a Lymi file. Activity is not kept on the phone, so opened with no connection it says it needs one.

## Opening

A cold start lights the lantern. The launch screen is the unlit lantern in the middle of the room's colour, in each room, drawn by `apps/mobile/scripts/splash-images.mjs` from the lantern data and the palette. As the app's code loads, the flame catches, its warm light floods the room, then the lantern rises to its place on Today, or on Welcome when signed out, while the flood draws back into that screen's pool. Opened by a link into any other screen, the lit room fades where it is. [motion.md](motion.md#opening-the-phone-app) has the timings. It never waits for data: the screen underneath shows its own loading state, and a return from the background shows nothing.

## Update Lymi

When the Worker no longer serves the installed release, the whole app becomes one screen: the lantern, Update Lymi, a line saying unsent reviews and cards are kept when there are any, and one amber Update that opens TestFlight or the App Store. It has no close and no way back, because every request would be refused. It is a route guarded ahead of every other, so an open review closes under it and a widget or notification link lands on it. ADR 0032 owns when it shows.

## Offline

The phone keeps its query cache in MMKV for 30 days, as long as an unused session lasts, and fetches every deck's cards, sections and draw once while online, as the web does ([ADR 0023](../../adr/0023-offline-writes-queue-on-the-device-and-replay-in-order.md)). A cold launch with no connection opens Today, Library and each deck as of the last sync, and a review runs on the kept draw. A refresh that fails keeps the last good copy on disk, and warming that the connection cut short picks up on reconnect and on return to the front. The cache is versioned by the shapes the screens read rather than by the app's version, so an update fetched online never empties the next launch offline; it belongs to one learner and one Worker, and is forgotten when either changes.

While a screen shows what was kept, one muted line with a cloud at its top says so and since when: "You’re offline. Showing your cards as of 14:05." It is not an error and asks nothing. Today counts what is due from the kept draw and this phone's grades, because the decks' counts miss everything since the last sync. With nothing kept yet, Today says it couldn't load and offers to try again. Coming back online says nothing: queued grades and writes send, the screens refresh, and the line goes.

Signing out asks first when grades or changes made offline have not landed, as the web does, then forgets this learner's cache, outboxes and Add a word's choices; the theme and the reminder stay with the phone.

## Haptics

A haptic answers a touch or marks the goal. These are all of them:

| Moment | Haptic |
| --- | --- |
| Reveal | Light impact |
| Every grade, Forgot included | Soft impact |
| Undo, or crossing the line while pulling to end | Selection |
| The daily goal | Success |
| The end of a review | A faint tick under each ember and one warm pulse as today's light fills, through Core Haptics |
| Starting a review | Medium impact |

## Sound

One sound, when the daily goal is reached. It follows the silent switch, and You has a setting to turn sound off entirely.

## Glass

Liquid Glass suits Lymi: it is a material that holds light, and the lantern is a light. The phone uses it for chrome that floats over content: the tab bar, the top bar's buttons and sheets refract what scrolls beneath them and morph as the learner moves. Tinted amber, glass marks the one standing action, as plain amber marks a press on the web. Where else tinted glass carries Lymi's light is open, to try on a device rather than in mockups. What the learner reads, such as the review card, stays on opaque plates. Reduce Transparency, and iOS before 26, get the web's opaque surfaces. The web keeps its opaque pill.

## Outside the app

- **Widget:** one widget, two sizes. Small is the lantern with what is due; medium is the Week, the run and seven glasses with the due count. Both open a review. In a tinted or clear Home Screen the lantern has its own one-colour drawing.
- **Lock Screen:** a ring for today's goal around the due count, and a line with the count, the goal and the run.
- **Controls:** Add a word and Review, for Control Center, the Lock Screen and the Action button.
- **Reminder:** one ordinary notification at the learner's time, only while the day is open and something is due. It says how many cards are due and offers Review now and In an hour. It never mentions the streak, because PRODUCT.md rules out streak pressure.
- No Live Activity for now.

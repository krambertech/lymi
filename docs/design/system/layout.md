# Layout

Two destinations, Today and Library, in one centred column. Review is the primary button on both, never a place you navigate to ([ADR 0005](../../adr/0005-review-is-a-button-not-a-destination.md)).

## Build every screen with Screen

`Screen` in `components/layout/screen.tsx` builds the column, the top bar and the title from props, so a view never assembles its own. **A screen without `Screen` is a bug.**

```tsx
// Correct: a tab
<Screen kind="tab" title={<Trans>Today</Trans>}>…</Screen>

// Correct: a page, with a way back and its controls passed once
<Screen title={deck.name} back={{ label: t`Library`, to: "/library" }} actions={<IconButton label={t`Search`}>…</IconButton>}>…</Screen>

// Incorrect: a hand-built header that drifts from every other screen
<div className="mx-auto max-w-3xl px-4"><h1 className="text-3xl">{deck.name}</h1>…</div>
```

- `kind="tab"` is a row in the rail: Today, Library, Insights and Explore. Everything else is a page (the default) and has a way back.
- `actions` go in the bar on the phone and beside the title on a desktop. They are `IconButton`s and menu triggers only; a text button, such as a form's submit, belongs in the content.
- `status` is a short line such as Saved, beside the title at every width, because it is not a control.
- `width="md"` narrows a reading screen to 672 px; the default is `--column`, 880 px.

## The column

The column is capped at `--column` (880 px) and centres in whatever the rail leaves. It never stretches: a vocabulary app is one column, and a wider one is a worse read. On a 2560 px screen the rail fills the left edge and the column sits in the middle of the rest. Reading screens narrow to 672 px.

Spacing is Tailwind's 4 px scale. DESIGN.md's frontmatter names `xs` 4, `sm` 8, `md` 16, `lg` 24, `xl` 32 and `2xl` 48, which are `1`, `2`, `4`, `6`, `8` and `12` in class names (`gap-4`, `p-6`).

## Container queries

Views lay out by their container (`@3xl` = 768 px), not the viewport, so the design page and the component tests can render them at any width. Chrome that follows the rail, such as page padding, top bars and back rows, queries the whole window's `@3xl/shell`, because the rail appears at a 768 px window while the column beside it is still narrower. The toast renders outside the shell, so its clearance for the pill uses the matching `md` media query. Form controls size by the viewport ([forms.md](forms.md#the-control-box)).

## Headings

Every screen carries one `h1` and nothing under it skips a level. The page title is the `h1`, a section or a plate on the page is an `h2`, and a heading inside one of those is an `h3`. A screen with no room for a visible title still carries its `h1` in `sr-only`, as the review screen does, because a screen with no heading leaves a screen-reader user with nowhere to land.

## Desktop: the rail

On desktop the navigation is the 240 px rail, and the rail is a surface: it runs the full height of the window flush to the start edge, in `rail`, with a hairline down its inner side. Top to bottom it holds the app tile beside the wordmark, search and the capture button on that same line, the four tabs, the decks, and the learner at the bottom under a rule: a 34 px avatar, the name, and what the screen behind it holds.

The rail's first line and the page title beside it sit on the same line, 32 px down. That shared line is what makes the two columns read as one app rather than a menu next to a document.

On a desktop the rail is the way back and the top bar is hidden, except on a page whose parent is not a row in the rail, such as deck settings or an import.

## Phone: the top bar and the pill

On the phone the navigation is a floating pill, two items wide (Today and Library), opaque over the content and clear of the home indicator. It is a `plate-2` track with a `plate` item selected inside it, the same shape as the segmented control, because a frosted pill is a material the rest of the app does not use. The avatar menu opens the other tabs.

Every screen starts with the same top bar: 56 px, the way back on the start side, the screen's own controls on the end, and the title under it on the same line and with the same gap on every screen.

- A tab has nowhere to go back to, so its bar starts with the app tile at 40 px, the height of every control in the bar, with a hairline edge so it holds its shape on the dark canvas. The wordmark stays on the rail: on the phone it read as a second title over the screen's own.
- The end of a tab's bar reads streak, capture, avatar on every tab, from one `ShellChrome` context set at the root: the status leads, the two round buttons stay a pair, and the account keeps the outer corner.
- The controls are square ghost `IconButton`s at 40 px. Capture keeps its round amber shape and goes first among the buttons, so it never sits between two squares; the avatar, also round, follows it.
- A control that needs the whole bar, such as a deck's search, replaces the bar at the same height and gives it back on Cancel, so the title stays put.

## Back

Back is `BackButton`: a 44 px target with a 22 px chevron and the name of the screen it returns to, so a word says which deck. It goes to that screen's parent and ignores browser history, so it lands in the same place every time. Settings, Activity and Archived open from the avatar menu on any tab, and their back names Today.

## You

Settings, Activity and Archived sit behind **You**, one profile screen reached from the avatar on the phone and the rail's profile row on desktop. Insights holds its slot before it has content.

## Capture

Capture is one plus for what a learner adds by hand: a word or a deck. It is round and amber, because it is the app's standing action and the only control on every screen, and the menu under it names each with an icon (`AddMenu`). It sits in the rail beside the mark on desktop and in the top bar on the phone, and `N` opens it from anywhere. Imports are occasional, so they start from the Import group at the end of Settings.

## Today

Today is a page of cards, not a single stage. Until the first review it is the getting started guide ([empty-states.md](empty-states.md)).

1. The due card leads: the lantern beside how many cards are due, then one full-width Review button, `size="xl"`. With a single deck it names the deck.
2. The streak card sits beside it on desktop, in the narrower column, and under it on the phone.
3. **Also on your list** shows the rounds as three tiles, always in this order: **Forgotten today**, which is freshest, **New cards**, then **Often forgotten**. Forgotten today leads its name with the Forgot mark and New cards with New's; Often forgotten is not a state and has no mark. A tile with cards opens its review. An empty tile keeps its place with a muted zero and a plain line, and an empty New cards tile offers Add cards, so no tile is ever left on its own. On desktop the three sit in a row with the action along the foot; on the phone they stack as rows with an arrow.
4. **Decks to review** lists only decks with cards due, each row leading with its due count, with a small Library link at the end of its heading. It appears only when the learner has more than one deck, and comes after the rounds because the Review button already covers the same cards. A series with cards due is one row that reviews the whole series, and its decks get no rows of their own.

Deck rows and round tiles are whole links that end in a label and an arrow in a circle, never a button inside a row. Today never shows a term, because seeing the answers before a review asks for them spoils the recall.

## Review

A review holds the screen: the page never scrolls, and the grade strip always sits under the card. A card too long for its room first steps its cue and target down the type scale; the example and notes never shrink or hide, so whatever still does not fit scrolls inside the plate, softened at its top and bottom edges.

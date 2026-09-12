---
name: Lymi
description: A vocabulary app with a storm lantern. Two rooms, one flame. Warm, calm, quick.
colors:
  canvas: "#f8f7f5"
  rail: "#f1efec"
  plate: "#ffffff"
  plate-2: "#f1efec"
  hover: "#edebe7"
  edge: "#2a221c1a"
  edge-2: "#2a221c33"
  text: "#2d2622"
  text-2: "#5a524c"
  muted: "#7a716a"
  faint: "#a89f97"
  amber: "#f5ad48"
  amber-hover: "#eb9f3a"
  amber-ink: "#3a2a12"
  amber-text: "#9c4d0a"
  amber-soft: "#f5ad4829"
  glass: "#f7e4c8"
  glass-unlit: "#f1efec"
  flame-core: "#fff4c2"
  metal: "#2f2823"
  glow: "#f5ad4873"
  good: "#186f4b"
  good-soft: "#1f7d551f"
  danger: "#b3331f"
  danger-soft: "#b3331f1a"
  dark-canvas: "#151210"
  dark-rail: "#1b1613"
  dark-plate: "#201b18"
  dark-plate-2: "#2a241f"
  dark-hover: "#2f2924"
  dark-edge: "#ffffff14"
  dark-edge-2: "#ffffff26"
  dark-text: "#ebe6df"
  dark-text-2: "#c4bcb3"
  dark-muted: "#9b928a"
  dark-faint: "#6b625b"
  dark-amber: "#f6b34d"
  dark-glass: "#46351d"
  dark-glass-unlit: "#2a241f"
  dark-amber-text: "#f4bd63"
  dark-metal: "#f3f0eb"
  dark-good: "#78c496"
  dark-danger: "#e3745d"
typography:
  word:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "46px"
    fontWeight: 500
    lineHeight: 1.0
    letterSpacing: "-0.03em"
  word-phone:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "38px"
    fontWeight: 500
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  hero:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  meaning:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1.35
  lede:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "15.5px"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "14.5px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.45
  caption:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
  kbd:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "18px"
  xl: "22px"
  2xl: "30px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.amber-ink}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.amber-hover}"
  button-secondary:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.text}"
    borderColor: "{colors.edge}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
  button-secondary-hover:
    backgroundColor: "{colors.hover}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-2}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 16px"
  button-danger:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    rounded: "{rounded.md}"
    height: "40px"
  button-grade:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.text-2}"
    borderColor: "{colors.edge}"
    rounded: "{rounded.lg}"
    height: "72px"
  input:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.text}"
    borderColor: "{colors.edge}"
    rounded: "{rounded.md}"
    height: "40px"
    padding: "0 14px"
  input-focus:
    borderColor: "{colors.amber}"
  chip:
    backgroundColor: "{colors.plate-2}"
    textColor: "{colors.text-2}"
    rounded: "{rounded.pill}"
    height: "26px"
    padding: "0 10px"
  chip-new:
    backgroundColor: "{colors.amber-soft}"
    textColor: "{colors.amber-text}"
    rounded: "{rounded.pill}"
    height: "26px"
  chip-known:
    backgroundColor: "{colors.good-soft}"
    textColor: "{colors.good}"
    rounded: "{rounded.pill}"
    height: "26px"
  card:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.text}"
    borderColor: "{colors.edge}"
    rounded: "{rounded.xl}"
  deck-row:
    backgroundColor: "{colors.plate}"
    borderColor: "{colors.edge}"
    rounded: "{rounded.lg}"
  toast:
    backgroundColor: "{colors.text}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.md}"
---

# Lymi design system

The live version of this document is the `/design` route in local development. It renders every token, component and screen below with the real code. This file is the same system for tools that read files.

## The idea

Lymi is cut from *lyhty*, the Finnish word for lantern. The symbol is a storm lantern, the kind you carry. It is lit while you review, brighter when you finish, and dark when nothing is due. The interface is two rooms: a dark one lit by that lantern, and a light one at noon. The app follows the OS theme unless the user picks one in Settings.

Three words: warm, calm, quick.

## Surfaces are flat

Depth comes from one hairline edge, never from gradients or shadows. Every surface is one of four tones: `canvas` (the room), `rail` (the navigation, one step off the room), `plate` (a thing in the room), `plate-2` (a well inside a plate). The rail is recessive by day and a step up at night, and it carries the hairline on its inner edge, so the app never reads as one wash with chrome floating in it. Hover strengthens the edge to `edge-2`; focus adds the neutral 2 px outline every control gets. Nothing lifts, and amber never marks state.

The only glow in the interface belongs to the lantern, and inside the lantern only the light wears it. In CSS it is the `glow` utility, which puts the drop shadow on the `.lantern-light` group rather than the whole drawing: metal does not glow, and a filter on the drawing halos the frame and traces the glass. Nothing else may use it.

## Colour

Warm neutrals, nearly grey. Amber is the only saturated colour: the flame, the one thing to press on the page, and the capture button, which is the app's standing action rather than the page's. A due count in `amber-text` is the fourth allowed use. The fifth is a day the learner reviewed, in the seven lights, the thirty-day strip and the month bars — the same lit glass at three sizes, which makes it the flame rather than a sixth thing.

Status is never colour alone. New, Learning, Known carry a dot and a word. Errors carry an icon.

The twice-per-screen count is about chrome and actions. A status chip in a list repeats once per row, as `StateChip` already does down a deck table and as the due and new counts do down Library. That is one decision shown many times, not many uses of amber.

Text on canvas meets 4.5:1 in both rooms, including `muted`. `faint` is decorative and never carries words. Dark is not inverted light: the plate is lighter than the canvas in both rooms.

## The lantern

A storm lantern, the kind you carry, drawn in a 120 unit box. Top to bottom: a bail tall enough to read as a handle rather than a keyring, turning on two visible pivots; a hood that flares wide over the glass; two rods down the sides; the glass itself; a fount on a foot. The flare, the rods and the pivots are what make it a lantern — without them the silhouette is a battery.

The metal is `metal`, which is the text colour of the room: ink by day, white at night. Never grey.

The glass is one **opaque** colour, `glass`, not a tint over a hole. A translucent glass needs a backer in the room's colour, and then the mark drags a pale slab onto any surface that is not the page background — a plate, the amber button, a dark tile, a transparent export. Every metal part overlaps the glass edges, so nothing can spill outside the frame. Unlit, the glass is `glass-unlit` and the flame becomes an ember in `edge-2`.

There is no second cut for small sizes. The rods and the flame are exactly what keep the drawing legible when it is tiny — a simplified version that drops them collapses into a mushroom by 24 px. One drawing, every size. The browser tab uses the same drawing with the viewBox squared around its own bounds, so the mark fills the icon instead of floating in a 120 box.

The streak's `Flame` crops to the flame's exact bounds, so its tip sits on the top edge of its box and the flicker grows past it. That drawing overflows its box rather than being cropped: a clipped tip is the one thing that makes the mark look broken.

The geometry lives in `components/lantern-geometry.tsx` and nowhere else. `Lantern`, `Lockup` and `scripts/brand.mjs` all draw from it, so the mark cannot drift between the app and its assets.

States: lit (flame, optional flicker), lit and glowing (something is due), lit up (session done: bigger flame, wider glow, stays), flare (one-shot after Good or Easy), catch (the wick taking, for unlit to lit), carried (the body swings from the bail), unlit (no flame, no glow).

## Letting an app in

Three screens carry the connection between Lymi and an MCP client: the door (`/login`), the decision (`/consent`), and the ending (the same route, after the decision).

Who is asking is answered by the **host of the `client_id`**, and by nothing else the client sent. A recognised host is named ("Claude"); every other app is titled by its address, and its own `client_name` appears only as a claim, in the form "it calls itself X". Putting an unverified name in the headline of a permission screen is the same mistake as rendering an unverified logo. A client identifies itself with a Client ID Metadata Document that has to be served from that HTTPS host, so the host is the one claim in the request that cannot be forged. It is shown in mono, in a pill under the app's name, with a check when it is a host we ship a mark for. An app we do not recognise says so in words and shows the address to check.

Marks for known clients are bundled and drawn in their own brand colour, which is what makes one recognisable at a glance. A vendor's colour is a quotation, not a token: it lives inside the mark and nowhere else, the tile around it stays a plain plate, and amber remains Lymi's only accent. A brand that is monochrome takes the room's ink. `logo_uri` from the client's metadata is never rendered: an attacker-controlled image on a permission screen, shown with the confidence of a verified one, is how consent phishing works. An unrecognised client gets a monogram, so it can never borrow a known app's appearance.

Read access is stated, not offered, because a connector cannot work without it. Write is the only decision on the screen, so it is the only control: a switch, with a grant dot that mirrors the read row so what the app ends up with reads at a glance. Under both, a plain list of what it can never do, whatever is chosen.

The ending is not optional. An MCP client's redirect is usually a custom scheme, so the browser hands off to the app and leaves the tab where it was; without this screen that tab sits on a blank form. It says what happened, what the app got, and that the tab is finished with.

A grant lasts until it is taken back, so Settings has Connected apps beside API keys, with the same row shape: name, what it may do, the host, and an inline confirm to cut it off.

## Wordmark and lockups

`lymi`, lowercase, Onest 600, tracked −0.025em, drawn as paths (`components/wordmark-paths.ts`, generated with fontTools). The lit wordmark replaces the dot of the i with a flame; use it on the login screen and the app store, the plain one everywhere else. In the rail the mark is the app tile at 28 px with the plain wordmark beside it, not the row lockup: the tile gives the mark its own surface, which is what stops it floating on the rail, and it is the same picture the learner taps on their home screen. Row lockup: the lantern is 1.30em tall, its foot on the baseline and its bail just above the l, 0.17em before the word. There is no stacked lockup. Clear space: half a lantern on every side.

The app icon is always the dark room: ivory lantern, lit and glowing, on the dark canvas. Assets are in `apps/web/public/brand/` and regenerate with `node scripts/brand.mjs && sh scripts/icons.sh`.

## Type

One family, Onest (variable 300–800, Latin extended and Cyrillic). The word on the card is the largest thing on any screen and is set at 500, not bold. Everything else is 400 or 500; 600 is for the wordmark, counts and kbd. Fixed pixel scale, ratio about 1.17. Headings track −0.02em, the word −0.03em, body never. Tabular figures on anything that changes. Curly quotes and the ellipsis character in copy. Uppercase only at 12 px, tracked +0.06em.

One exception to the single family. `font-mono` is a system monospace stack, nothing downloaded, and it has two jobs: code on the docs site, and the strings in the app that are proofread character by character rather than read — an API key, a client's hostname, a header name in copy. Onest draws 0/O and 1/l too alike for a secret where a mistyped character is a silent 401. Nothing else uses it: not numbers, not code-ish labels, not UI text.

## Motion

Motion conveys state. Press: scale 0.97, 150 ms. Hover: 150 ms, pointer devices only. A card arrives with a 6 px rise over 200 ms. A menu grows out of the corner nearest the button that opened it — scale 0.94 to 1 over 140 ms — because a menu belongs to its trigger, and a list that slides in from somewhere else reads as a panel that happened to land there. Reveal fades the meaning in under the rule, followed by the four equal grade controls. Flare is 320 ms. Toasts enter in 240 ms and leave in 140 ms, both ease-out. Keyboard-initiated actions do not animate. The theme switch suspends transitions for one frame so the room swaps at once.

A sheet arrives the way its shape does: the drawer on vaul's curve from the bottom edge, the desktop modal with the card's 6 px rise over 200 ms. Both leave in 140 ms, faster than they came.

The auth screens have one moving part: the connection. The app that asked and the lantern sit in matching tiles joined by a rail, dotted while the decision is open. When the grant lands the rail draws across in amber over 420 ms and the wick catches 300 ms in, so the two read as one movement rather than two. A refusal leaves the rail dotted and the lantern unlit. Under reduced motion the rail is simply filled. Nothing else on those screens animates.

The flame flickers on a 2.6 s loop because a flame does, and three things move on that one loop: the flame scales, the bright core beats slightly out of phase inside it, and the halo breathes with both. A flame that changes size under a halo that holds still is the thing that reads as fake. The wick catches over 620 ms when the lantern goes from unlit to lit, rather than swapping. Carried, the body rocks ±5° from the bail's pivot while the bail counters at ∓3.5°.

Under `prefers-reduced-motion` the flame holds still, reveal, completion, card and toast crossfade with no travel, and the skeleton stops shimmering. The glow stays, because a glow is a state, not a movement.

## Layout

Two destinations, Today and Library. Review is the primary button on both, never a place you navigate to. Settings, Activity and Archived sit behind **You**, one profile screen reached from the avatar on the phone and the sidebar's profile row on desktop. Insights holds its slot before it has content. See [ADR 0005](docs/adr/0005-review-is-a-button-not-a-destination.md).

On the phone the navigation is a floating pill, two items wide, opaque over the content and clear of the home indicator. It is a `plate-2` track with a `plate` item selected inside it, the same shape as the segmented control, because a frosted pill is a material the rest of the app does not use.

On desktop it is the 240 px rail, and the rail is a surface: it runs the full height of the window flush to the left edge, in `rail` with a hairline down its inner side. In it, top to bottom: the app tile beside the wordmark, search and the capture button on that same line, the four destinations, the decks, and the learner at the bottom under a rule — a 34 px avatar, the name, and what the screen behind it holds.

The rail's first line and the page title beside it sit on the same line, 32 px down. That shared line is what makes the two columns read as one app rather than a menu next to a document.

The column of content is capped at `--column` (880 px) and centres in whatever the rail leaves. It never stretches: a vocabulary app is one column, and a wider one is a worse read. On a 2560 px screen the rail fills the left edge and the column sits in the middle of the rest, so a big window gets the same read as a laptop instead of a stripe of content in a field of empty room. Reading screens narrow further to 672.

Capture is one plus for both things a learner adds, a word or a deck. It is round and amber, because it is the app's standing action and the only control on every screen; the menu under it names the two things with an icon each. It sits in the rail beside the mark on desktop and in every page header on the phone, and `N` opens it from anywhere.

## Insights

The one screen where charts belong, and the only place they are allowed. Every figure draws in **ink at graded opacity** over a `plate-2` well, never in amber: a chart wants a series colour, and if the series takes amber then this is the one screen where the accent means "data" instead of "act". The two exceptions are the lights, which are the streak, and the single bar the sentence above the chart is pointing at.

Four plates in a 2x2 grid — Recall, Consistency, Collection, Ahead — each carrying a number and one line of plain words. The line is not a caption. 91% says nothing until the plate says the schedule aims for 90, and a grid of numbers without those lines is the dashboard the product does without. Under them the month bars run full width, then the cards that keep coming back.

Consistency and the months answer different questions and neither replaces the other. The thirty-day strip is texture: which days, and how long the runs were. The month bars are trend: whether the habit is holding across seasons. Both draw a day as lit or unlit and never grade it by how many cards it held, because grading turns a habit picture into a scoreboard and makes a heavy Tuesday look better than a steady one.

`RunStrip` joins consecutive lit days into one capsule. That is the whole idea: a row of separate marks has to be counted, where an unbroken capsule is a run whose length you can see.

## The streak

The flame counts days in a row and the seven lights say which days. On Today they sit together under the review button: the flame and the run on one line, the week under it at the size worth looking at. It is never a panel of its own — a plate beside the hero turns a warm cue into a stat block, and a home screen of statistics is the thing [`PRODUCT.md`](PRODUCT.md) names as an anti-reference.

A day's light carries three steps of amber, from the lantern's glass to its flame, by how full that day was. The reference is the week's own busiest day with a floor under it, so a quiet week is not flattered and one heavy Tuesday does not wash the rest out. The steps mix toward `--glass` rather than fading to transparency: a translucent amber lands on whatever is behind it, and in the dark room that is the same lightness as an unlit day, which would make "a little" and "nothing" one picture.

Seven days grade; the thirty-day `RunStrip` on Insights deliberately does not. Over a month, shading by volume makes a habit picture into a scoreboard and rewards one heavy day over a steady stretch. Over a week it is the difference between turning up and doing the lot, which the learner already knows and likes seeing. The long views — thirty days as runs, twelve months as bars — live on Insights, where looking at them is a choice.

Today is still open until it ends, so an unreviewed morning shows yesterday's streak rather than zero. `streakLength` in `packages/core/src/streak.ts` is the rule.

The seven lights sit with it. They say which days, where the streak says how many.

## Components

`components/`: Button (primary, secondary, ghost, danger; sm, md, lg; kbd hint; loading), IconButton, Field with Input, Textarea, Select, Segmented, Switch, Checkbox, Chip with StateChip and SourceChip, Kbd, Progress, Toast, Skeleton, EmptyState, SettingsGroup, SevenLights, Table, Menu, Dialog, Sheet with SheetPanel, AddCardSheet, NewDeckSheet, AddMenu, Combobox, LanguageField, DirectionField, DirectionCompact, Avatar, CopyField, DeckCard, NewCardsRow, NavLink, PillNav, Flame, AppMark, Connection, Lantern, Wordmark, Lockup, StatPlate, RunStrip, MonthBars.

`views/`: the screens as prop-driven components, so the design page renders them with sample data. They lay out by their container (`@3xl` = 768 px), not the viewport.

Deck actions live behind one menu: Deck settings opens a screen, Rename is inline on the title, Export writes a CSV, Archive leaves the deck list with an Undo toast. Cards archive the same way, from the row.

A deck is a name and two settings, so making one is a sheet and not a wizard. The name is the one field that matters and takes the large input; language and direction already have an answer, so they sit under it as a select and three segments. Creating it lands the learner in the empty deck, which is where the words go next. Everything chosen there is changeable afterwards.

Changing it is a screen, `/library/$deckId/settings`, because on the phone it should push in and the back gesture should work, and because the direction choice needs room to say what it does: three rows, each spelling out what will be shown, using a real card from the deck. Selection is carried by the edge and a filled dot — amber stays on the flame and the one primary action. Nothing on the screen has a Save button. A choice is made when it is made, a name commits on blur and on the way out, and one quiet "Saved" in the header says so. What changing the direction does to the cards already in the deck is [ADR 0007](docs/adr/0007-a-decks-direction-is-a-filter-not-a-migration.md).

A deck in Library is a card, not a row: it carries four numbers, and one line makes them a run of digits nobody reads. The name is on the first line, the counts on the second. A row of new cards names its actor, because a card an integration wrote must never look like one the learner typed.

A sheet takes the shape of the machine it is on. On the phone it is a drawer that rises from the bottom edge and can be swiped away, because that is where the thumb is. On a desktop a panel pinned to the bottom of a 1400 px window is a phone pattern nobody finished, so the same sheet becomes a centred modal. One `Sheet` decides, one `SheetPanel` is the inside of both, and the forms know nothing about either. The rule is `(min-width: 768px) and (hover: hover) and (pointer: fine)`: the pointer counts as well as the width, so a tablet held in two hands still gets the drawer at 900 px. The shape is frozen while the sheet is open, because crossing the breakpoint mid-edit would otherwise remount the form and take the half-typed word with it.

The desktop shape is the platform's own `<dialog>`, opened with `showModal()`, so focus trapping, Escape and the top layer are the browser's job rather than ours. It enters with the card's 6 px rise over 200 ms and leaves in 140, which needs `overlay` and `display` to transition `allow-discrete` — without those the browser takes it out of the top layer on the first frame and there is no exit at all. The `.sheet-modal` class carries all of it, and `Dialog` uses the same one.

Every control in a form is the same box: 44 px tall on the phone, 40 on the desktop, 16 px text so iOS does not zoom on focus. Input, Select, Combobox and the segmented control all take it from `controlSize`, so a form reads as one row repeated rather than a pile of different objects. There is no larger cut for "the one field that matters" — a form with three type sizes in it looks unfinished, and the field that matters is already first. Controls size by the **viewport**, not the container: a phone is a phone whatever it is nested in, and a sheet renders in a portal where a container query has nothing to measure and would silently never fire.

A list of forty is a list you search. `Combobox` is the control for that: closed it is the same box as every other, and open, the box becomes the search field and the list unrolls under it in the normal flow. In the flow rather than floating, because a floating layer has to escape the sheet's scroll and inside the phone's drawer it cannot — vaul translates the drawer to drag it, which makes it the containing block for anything fixed. Each row carries the value beside the name, because `pt-BR` is what tells Brazilian Portuguese from Portuguese and it is what gets stored. A value the list has never heard of is typed into the search and becomes the last row.

**A button is never taken away for being unable to run yet.** `disabled` drops it out of the tab order and tells a screen reader nothing about what is missing, so a greyed-out submit leaves the learner with no way to ask. Forms stay pressable and validate on submit: the same Zod schema the route parses with, the message under the field with its icon, and the caret moved to the first thing that is wrong. The messages live on the schema in `packages/core`, so what the API says on a 400 is what the field says under the control. `aria-disabled` is for the cases where pressing genuinely cannot do anything — mid-request, or a handler that does not exist — and it keeps the button focusable and announced while swallowing the press.

Rules: one primary per view. Every control has default, hover, focus, active, disabled and, where it applies, loading. A modal that asks a question is a last resort; Undo replaces confirmation. A sheet is not that modal: it is a form the learner asked for.

## Voice

Plain and friendly. Counts cards, not points. Never nags, never celebrates for you. "That's the lot", not "Congratulations!". Errors say how to fix it. Anything the AI wrote is labelled where it appears.

## Documentation

The docs site at `/docs` is the same two rooms. Code is set in `font-mono`, the one exception to Onest described under Type.

Code is set in ink and weight, never in colour, so amber stays on the flame and the one primary action. Three tones carry the syntax: a JSON key is `text` at 500 because it is what you scan for, a value is `text-2`, and comments and punctuation are `muted`. Nothing in a snippet is `faint`; every character there carries meaning.

The two colours the reference does use are the ones that already mean something. A response code is `good` when it is a 2xx and `danger` otherwise. An HTTP method is a neutral chip, except DELETE, which is `danger`.

Prose is `text-2` at 15.5 px on a 44 rem column; headings and bold are `text`. The API reference gets 52 rem, because it carries field tables. Pages are plain on the canvas, not in cards: a card in the docs means a code block, a callout, or one operation.

## Don't

- No gradients on any surface; the app icon is the one exception. No drop shadows. No glow on anything but the lantern.
- No amber outside the flame, the primary action and a due count. The streak's flame is that same flame, so it counts as one.
- No grey metal. No second illustration. No outline, rotation or bevel on the mark.
- No simplified small cut. No amber beyond the flame and the primary action.
- No two flames in one mark. If the lantern is on the screen, the wordmark is plain. The streak's flame is a component, not a second mark, and may sit on a screen the lantern is already on.
- No translucent glass, and no room colour painted inside the mark. The lantern must survive being put on a surface it did not expect.
- No display serif, no sparkle icon, no confetti.

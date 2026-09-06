---
name: Lymi
description: A vocabulary app with a storm lantern. Two rooms, one flame. Warm, calm, quick.
colors:
  canvas: "#f8f7f5"
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
  flame-core: "#fff4c2"
  metal: "#2f2823"
  glow: "#f5ad4873"
  good: "#186f4b"
  good-soft: "#1f7d551f"
  danger: "#b3331f"
  danger-soft: "#b3331f1a"
  dark-canvas: "#151210"
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
    height: "60px"
  button-grade-good:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.amber-ink}"
    rounded: "{rounded.lg}"
    height: "60px"
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

The live version of this document is the `/design` route in local development. It renders every
token, component and screen below with the real code. This file is the same system for tools that
read files.

## The idea

Lymi is cut from *lyhty*, the Finnish word for lantern. The symbol is a storm lantern, the kind you
carry. It is lit while you review, brighter when you finish, and dark when nothing is due. The
interface is two rooms: a dark one lit by that lantern, and a light one at noon. The app follows the
OS theme unless the user picks one in Settings.

Three words: warm, calm, quick.

## Surfaces are flat

Depth comes from one hairline edge, never from gradients or shadows. Every surface is one of three
tones: `canvas` (the room), `plate` (a thing in the room), `plate-2` (a well inside a plate). Hover
strengthens the edge to `edge-2`; focus adds the neutral 2 px outline every control gets. Nothing
lifts, and amber never marks state.

The only glow in the interface belongs to the lantern. In CSS it is the `glow` utility
(`filter: drop-shadow(0 0 14px var(--glow))`) and nothing else may use it.

## Colour

Warm neutrals, nearly grey. Amber is the only saturated colour and appears at most twice on a screen:
the flame, and the one thing to press. A due count in `amber-text` is the third allowed use.

Status is never colour alone. New, Learning, Known carry a dot and a word. Errors carry an icon.

The twice-per-screen count is about chrome and actions. A status chip in a list repeats once per
row, as `StateChip` already does down a deck table and as the due and new counts do down Library.
That is one decision shown many times, not many uses of amber.

Text on canvas meets 4.5:1 in both rooms, including `muted`. `faint` is decorative and never
carries words. Dark is not inverted light: the plate is lighter than the canvas in both rooms.

## The lantern

Handle, cap, glass, flame, base, all at one stroke weight. The metal is `metal`, which is the text
colour of the room: ink by day, white at night. Never grey. The glass is `amber-soft`. Below 24 px the drawing simplifies to a glyph
(handle, cap, solid amber glass, base). The full lantern starts at 28 px.

States: lit (flame, optional flicker), lit and glowing (something is due), lit up (session done:
bigger flame, wider glow, stays), flare (one-shot after Good or Easy), unlit (no flame, no glow).

## Wordmark and lockups

`lymi`, lowercase, Onest 600, tracked −0.025em, drawn as paths (`components/wordmark-paths.ts`,
generated with fontTools). The lit wordmark replaces the dot of the i with a flame; use it on the
login screen and the app store, the plain one everywhere else. Row lockup: the lantern is 1.38em tall, its
base on the baseline, 0.17em before the word. There is no stacked lockup. Clear space: half a lantern
on every side.

The app icon is always the dark room: ivory lantern, lit and glowing, on the dark canvas. Assets
are in `apps/web/public/brand/` and regenerate with `node scripts/brand.mjs && sh scripts/icons.sh`.

## Type

One family, Onest (variable 300–800, Latin extended and Cyrillic). The word on the card is the
largest thing on any screen and is set at 500, not bold. Everything else is 400 or 500; 600 is for
the wordmark, counts and kbd. Fixed pixel scale, ratio about 1.17. Headings track −0.02em, the word
−0.03em, body never. Tabular figures on anything that changes. Curly quotes and the ellipsis
character in copy. Uppercase only at 12 px, tracked +0.06em.

## Motion

Motion conveys state. Press: scale 0.97, 150 ms. Hover: 150 ms, pointer devices only. A card
arrives with a 6 px rise over 200 ms. Reveal fades the meaning in under the rule. Flare is 320 ms.
Toasts enter in 240 ms and leave in 140 ms, both ease-out. Keyboard-initiated actions do not animate. The theme
switch suspends transitions for one frame so the room swaps at once.

The flame flickers on a 2.6 s loop because a flame does. Under `prefers-reduced-motion` it holds
still, the card and toast crossfade with no travel, and the skeleton stops shimmering. The glow
stays, because a glow is a state, not a movement.

## Layout

Two destinations, Today and Library. Review is the primary button on both, never a place you
navigate to. Settings, Activity and Archived sit behind **You**, one profile screen reached from
the avatar on the phone and the sidebar's profile row on desktop. Insights holds its slot before it
has content. See [ADR 0005](docs/adr/0005-review-is-a-button-not-a-destination.md).

On the phone the navigation is a floating pill, two items wide, frosted over the content and clear
of the home indicator. On desktop it is the 240 px sidebar: wordmark and add menu, search, the four
destinations, the decks, and the learner at the bottom.

The desktop shell is capped at `--shell` (1120 px) and centred. It never stretches: a vocabulary app
is one column of content, and a wider one is a worse read. Reading screens narrow further to 672.

Capture is one plus for both things a learner adds, a word or a deck. It sits next to the wordmark
on desktop and in every page header on the phone, and `N` opens it from anywhere.

## The streak

The flame, on its own, counts days in a row. It is drawn twice, because the two screens have
different room for the same fact. On the phone it is a pill in the Today header: flame and a
number. On desktop it is a plate beside the hero: the count, the best run, the seven lights and one
line saying how many of the last seven days had a review.

Today is still open until it ends, so an unreviewed morning shows yesterday's streak rather than
zero. `streakLength` in `packages/core/src/streak.ts` is the rule.

The seven lights sit with it. They say which days, where the streak says how many.

## Components

`components/`: Button (primary, secondary, ghost, danger; sm, md, lg; kbd hint; loading),
IconButton, Field with Input, Textarea, Select, Segmented, Switch, Checkbox, Chip with StateChip and
SourceChip, Kbd, Progress, Toast, Skeleton, EmptyState, SevenLights, Table, Menu, Dialog,
AddCardSheet, AddMenu, Avatar, DeckCard, NewCardsRow, NavLink, PillNav, Flame, StreakPill,
StreakPlate, Lantern, Wordmark, Lockup.

`views/`: the screens as prop-driven components, so the design page renders them with sample data.
They lay out by their container (`@3xl` = 768 px), not the viewport.

Deck actions live behind one menu: Rename is inline on the title, Export writes a CSV, Archive
leaves the deck list with an Undo toast. Cards archive the same way, from the row.

A deck in Library is a card, not a row: it carries four numbers, and one line makes them a run of
digits nobody reads. The name is on the first line, the counts on the second. A row of new cards
names its actor, because a card an integration wrote must never look like one the learner typed.

Rules: one primary per view. Every control has default, hover, focus, active, disabled and, where it
applies, loading. Hit areas are 44 px on the phone, 40 on desktop. Inputs are 16 px on the phone.
Modals are a last resort; Undo replaces confirmation.

## Voice

Plain and friendly. Counts cards, not points. Never nags, never celebrates for you. "That's the lot",
not "Congratulations!". Errors say how to fix it. Anything the AI wrote is labelled where it appears.

## Documentation

The docs site at `/docs` is the same two rooms with one addition: `--font-mono`, a system
monospace stack, for code only. No web font, because the reader's own mono is faster and
already familiar.

Code is set in ink and weight, never in colour, so amber stays on the flame and the one
primary action. Three tones carry the syntax: a JSON key is `text` at 500 because it is what
you scan for, a value is `text-2`, and comments and punctuation are `muted`. Nothing in a
snippet is `faint`; every character there carries meaning.

The two colours the reference does use are the ones that already mean something. A response
code is `good` when it is a 2xx and `danger` otherwise. An HTTP method is a neutral chip,
except DELETE, which is `danger`.

Prose is `text-2` at 15.5 px on a 44 rem column; headings and bold are `text`. The API
reference gets 52 rem, because it carries field tables. Pages are plain on the canvas, not
in cards: a card in the docs means a code block, a callout, or one operation.

## Don't

- No gradients on any surface; the app icon is the one exception. No drop shadows. No glow on anything but the lantern.
- No amber outside the flame, the primary action and a due count. The streak's flame is that same flame, so it counts as one.
- No grey metal. No second illustration. No outline, rotation or bevel on the mark.
- No full lantern below 28 px. No amber beyond the flame and the primary action.
- No display serif, no sparkle icon, no confetti.

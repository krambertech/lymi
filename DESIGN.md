---
name: Lymi
description: A vocabulary app with a storm lantern. Two rooms, one flame. Warm, calm, quick.
colors:
  canvas: "#f8f6f4"
  rail: "#f2f0ec"
  plate: "#ffffff"
  plate-2: "#f2f0ec"
  hover: "#eeebe6"
  edge: "#2013081a"
  edge-2: "#20130833"
  text: "#1c140f"
  text-2: "#49403a"
  muted: "#72665f"
  faint: "#a59d96"
  amber: "#f8ac3d"
  amber-hover: "#ef9d32"
  amber-ink: "#331b06"
  amber-text: "#9f4500"
  amber-soft: "#f8ac3d29"
  amber-tint: "#f8ac3d42"
  amber-tint-ink: "#331b06"
  flame-core: "#fff4b7"
  glass: "#fae5c9"
  glass-unlit: "#f0ede9"
  metal: "#1c140f"
  glow: "#f8ac3d73"
  good: "#006e42"
  good-soft: "#006e421f"
  state-new: "#867f79"
  state-learning: "#4284c5"
  state-learning-soft: "#4284c524"
  state-learning-text: "#23588a"
  state-known: "#249057"
  danger: "#be241f"
  danger-soft: "#be241f1a"
  ring: "#20130899"
  scrim: "#1e130e59"
  shimmer: "#ffffff66"
  toast-action: "#fdb443"
  grade-forgot: "#be241f"
  grade-hard: "#72665f"
  grade-good: "#006e42"
  grade-easy: "#1c140f"
  dark-canvas: "#130d09"
  dark-rail: "#1a120e"
  dark-plate: "#201713"
  dark-plate-2: "#29211b"
  dark-hover: "#302720"
  dark-edge: "#ffffff14"
  dark-edge-2: "#ffffff26"
  dark-text: "#f1eee7"
  dark-text-2: "#c5bcb1"
  dark-muted: "#a89c90"
  dark-faint: "#665c52"
  dark-amber: "#fdb443"
  dark-amber-hover: "#ffc250"
  dark-amber-ink: "#2b1401"
  dark-amber-text: "#f9bf60"
  dark-amber-soft: "#fdb44324"
  dark-amber-tint: "#fdb44329"
  dark-amber-tint-ink: "#f9bf60"
  dark-flame-core: "#fff4b7"
  dark-glass: "#432c17"
  dark-glass-unlit: "#271f19"
  dark-metal: "#f1eee7"
  dark-glow: "#f6ad3b80"
  dark-good: "#7bc495"
  dark-good-soft: "#7bc49524"
  dark-state-new: "#83786e"
  dark-state-learning: "#85b6e9"
  dark-state-learning-soft: "#85b6e924"
  dark-state-learning-text: "#a2c8f0"
  dark-state-known: "#7bc495"
  dark-danger: "#fb8274"
  dark-danger-soft: "#fb827424"
  dark-ring: "#f1eee7b3"
  dark-scrim: "#0000008c"
  dark-shimmer: "#ffffff0f"
  dark-toast-action: "#9f4500"
  dark-grade-forgot: "#fb8274"
  dark-grade-hard: "#a89c90"
  dark-grade-good: "#7bc495"
  dark-grade-easy: "#f1eee7"
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
    lineHeight: 1.3
  subhead:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 500
    lineHeight: 1.4
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
  chip:
    backgroundColor: "{colors.plate-2}"
    textColor: "{colors.text-2}"
    rounded: "{rounded.pill}"
    height: "26px"
    padding: "0 10px"
  chip-state:
    backgroundColor: "{colors.plate-2}"
    textColor: "{colors.text-2}"
    rounded: "{rounded.pill}"
    height: "26px"
  due-count:
    backgroundColor: "{colors.amber-tint}"
    textColor: "{colors.amber-tint-ink}"
    rounded: "{rounded.pill}"
    height: "22px"
    padding: "0 8px"
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

The live version of this document is the `/design` route in local development. It renders every token, component and screen below with the real code, and every part in `components/ui` in each state it has: hover and focus held still, an overlay open in a desktop frame beside a touch frame, and reduced motion behind a button on each canvas, beside its theme. This file is the same system for tools that read files.

## The idea

Lymi is cut from *lyhty*, the Finnish word for lantern. The symbol is a storm lantern, the kind you carry. Its flame is the continuity of remembering: small at the start of a day, a little taller with every review, full when the daily goal is reached, and out only when the streak breaks. The interface is two rooms: a dark one lit by that lantern, and a light one at noon. The app follows the OS theme unless the user picks one in Settings.

Three words: warm, calm, quick.

## Surfaces are flat

Depth comes from one hairline edge, never from gradients or shadows. Every surface is one of four tones: `canvas` (the room), `rail` (the navigation, one step off the room), `plate` (a thing in the room), `plate-2` (a well inside a plate). The rail is recessive by day and a step up at night, and it carries the hairline on its inner edge, so the app never reads as one wash with chrome floating in it. Hover strengthens the edge to `edge-2`; focus adds the neutral 2 px outline every control gets. Under forced colours, which drop shadows, the edge becomes a 1 px outline in the system colour. Nothing lifts, and amber never marks state.

The only glow in the interface belongs to the lantern, and inside the lantern only the light wears it. In CSS it is the `glow` utility, which puts the drop shadow on the `.lantern-light` group rather than the whole drawing: metal does not glow, and a filter on the drawing halos the frame and traces the glass. Nothing else may use it. At the end of a review the same light spills into the room around the lantern, under Motion.

## Colour

Warm neutrals, nearly grey. Amber is the only saturated accent, the colour that means act; the three card-state colours below describe and never ask. Amber is: the flame, the one thing to press on the page, and the capture button, which is the app's standing action rather than the page's. A due count is the fourth allowed use, as `DueCount`: the number in ink on `amber-tint`, never amber text, which by day has to darken to brown to be readable. The fifth is a day the learner reviewed, in the seven lights, the streak modal's month and its goal track, the thirty-day strip and the month bars — the same lit glass at every size, which makes it the flame rather than a sixth thing.

Card states have one colour and one icon each, the same everywhere a state shows: a grey dashed circle for New, a blue half circle for Learning, a green check circle for Known (`state-new`, `state-learning`, `state-known`; `stateMarks` and `StateIcon` in `components/state-mark.tsx`). The icon, in that colour, marks the counts on the deck's split plate, the deck's filter menu, each word in a deck's list, every state chip, the chips under Insights' Cards bar and the New cards tile on Today. That bar is the one place the colour stands alone, because a segment cannot hold an icon and the chips under it name each state. A deck carries no stripe: its split is the counts on its plate. They are not accents and they are not amber: each holds 3:1 against `plate-2`, the lightest ground a mark sits on, in both rooms. By day the marks are lighter than their text colours would be: Known is a brighter green than `good`, which also colours words and has to hold 4.5:1; in the dark room Known is `good`. Learning is blue because it is the hue furthest from amber, `danger` and `good`, so a state never reads as something to press or as an error, and blue and green stay apart for red-green colour blindness; it was mustard once, which sat beside amber and read as dirty orange. New was amber once and is grey now for the same reason. Text stays ink: a state chip is a plain `plate-2` chip, and the colour lives on its icon. `state-learning-soft` and `state-learning-text` exist for the site's scheduling figures only.

Forgot is a grade, not a state, and its mark is the red turn-back arrow wherever it shows: the Forgot grade, the Forgot today tile, Review forgotten at the end of a review, and the chip on a relearning card under review, which says **Forgot recently** rather than the schedule's name for it. Everywhere else relearning is Learning, because a lapse on a word's schedule table may be months old. The state words live on `stateMarks` beside the icons, so New, Learning and Known are written once.

Status is never colour alone. New, Learning, Known carry an icon and a word. Errors carry an icon.

The twice-per-screen count is about chrome and actions. A status chip in a list repeats once per row, as `StateChip` already does down a deck table and as the due counts do down Library. That is one decision shown many times, not many uses of amber.

Text on canvas meets 4.5:1 in both rooms, including `muted`. `faint` is decorative and never carries words. Dark is not inverted light: the plate is lighter than the canvas in both rooms.

## The lantern

A storm lantern, the kind you carry, drawn in a 120 unit box. Top to bottom: a bail tall enough to read as a handle rather than a keyring, turning on two visible pivots; a hood that flares wide over the glass; two rods down the sides; the glass itself; a fount on a foot. The flare, the rods and the pivots are what make it a lantern — without them the silhouette is a battery.

The metal is `metal`, which is the text colour of the room: ink by day, white at night. Never grey.

The glass is one **opaque** colour, `glass`, not a tint over a hole. A translucent glass needs a backer in the room's colour, and then the mark drags a pale slab onto any surface that is not the page background — a plate, the amber button, a dark tile, a transparent export. Every metal part overlaps the glass edges, so nothing can spill outside the frame. When the flame is out, the glass is `glass-unlit` and an ember in `edge-2` sits where the flame was.

There is no second cut for small sizes. The rods and the flame are exactly what keep the drawing legible when it is tiny — a simplified version that drops them collapses into a mushroom by 24 px. One drawing, every size. The browser tab uses the same drawing with the viewBox squared around its own bounds, so the mark fills the icon instead of floating in a 120 box.

The geometry lives in `components/lantern-geometry.tsx` and nowhere else. `Lantern`, `Lockup` and `scripts/brand.mjs` all draw from it, so the mark cannot drift between the app and its assets.

The lantern's flame shows the learner's day. It is out exactly when there is no streak, for a new learner or after a day that ended short of its goal; nothing due, an ended session and an unfinished morning never put it out. Reviews still count toward the goal while it is out, but they do not feed it, and the flame catches when today's goal is met.

While it is lit the flame is one continuous size, not a set of states. `Lantern` takes facts and moves itself: `progress` is today's accepted reviews over the daily goal, `out` is no streak, and `fed` goes up by one for every accepted review. `lanternFor` in `lib/flame.ts` turns the streak summary into those props. A screen never asks the lantern to celebrate. The live version, with a day to play through, is the Lantern page of `/design`.

The flame starts each day at 0.72× the brand flame and grows with progress to 1.02× just before the goal. Height carries the growth and width follows at half the rate. Growth stops short of full so that reaching the goal is a rise of its own, to 1.16×, where the flame stays for the rest of the day. The halo's width follows the flame, from 0.7× the brand halo at the start of a day to 1.7× at the goal. A confirmed nothing-due day holds the start-of-day flame: alive, not grown.

Every accepted review feeds the flame, and Forgot feeds it exactly as Easy does. A feed is a breath: the flame draws up and thin and the halo swells, then both settle at the new size. Reviews close together flow into one long breath, because each breath starts from wherever the last one is rather than from rest.

The brand lantern, on login, the app icon and public pages, omits `progress` and shows the one canonical flame. It never shows a learner's state. Empty screens use it too, because an empty screen says nothing about the streak. An error never does: a calm lit lantern cannot say that something failed.

Carried, the body swings from the bail. App launch and pull to refresh.

## The flame

`Flame` is the flame on its own, beside the streak number in the streak pill and the streak modal, at 16 to 44 px. It says one thing: whether the learner's streak is alive. It is not a gauge, a progress ring or a celebration, and it is never a brand mark. The live version is the Flame page of `/design`.

It has three states and nothing between them, because growth between reviews would be unreadable at 16 px and restless on a mark that is on every screen:

- **Out** when there is no streak, for a new learner or after a day that ended short of its goal. Nothing due, an ended session and an unfinished morning never put it out. It shows the lantern's ember scaled to the flame's height, because the ember as drawn is a speck at this size.
- **Lit** while a streak is alive and today's goal is still open, or nothing is due: the brand flame, held still.
- **Full** once today's goal is met or every available review is done: 1.16× the brand flame, and flickering.

`streakFlameFor` in `lib/flame.ts` reads the state from the streak summary. Every grade counts toward the goal the same, so no grade changes the flame more than another.

It moves on the lantern's springs from `FLAME_MOTION`: out to full is the catch, lit to full the rise, full to lit a settle, and lit to out the slow going out. Under reduced motion it jumps to the new state without flickering, and the three states still read apart: an ember, the brand flame, a taller flame.

`Flame` crops to the flame's exact bounds in `components/lantern-geometry.tsx`, so its tip sits on the top edge of its box and a full or flickering flame grows past it. The drawing overflows its box rather than being cropped: a clipped tip is the one thing that makes the mark look broken.

## Feature design

- [The streak](docs/design/streak.md)
- [Letting an app in](docs/design/connected-apps.md)
- [Insights](docs/design/insights.md)
- [Library, decks and cards](docs/design/library-decks-and-cards.md)
- [Review completion](docs/design/review-completion.md)
- [Imports](docs/design/imports.md)

## Wordmark and lockups

`lymi`, lowercase, Onest 600, tracked −0.025em, drawn as paths (`components/wordmark-paths.ts`, generated with fontTools). The lit wordmark replaces the dot of the i with a flame; use it on the login screen and the app store, the plain one everywhere else. In the rail the mark is the app tile at 28 px with the plain wordmark beside it, not the row lockup: the tile gives the mark its own surface, which is what stops it floating on the rail, and it is the same picture the learner taps on their home screen. Row lockup: the lantern is 1.30em tall, its foot on the baseline and its bail just above the l, 0.17em before the word. There is no stacked lockup. Clear space: half a lantern on every side.

The app icon is always the dark room: ivory lantern, lit and glowing, on the dark canvas. Assets are in `apps/web/public/brand/` and regenerate with `node scripts/brand.mjs && sh scripts/icons.sh`.

The link preview for the public site, `apps/site/public/share.png`, is the app icon's room widened to 1200 × 630: the lit row lockup over “Keep what you learn.” in the same warm centre. Everything sits in the middle 630 px, so an app that crops the preview to a square keeps the whole picture.

## Type

One family, Onest, self-hosted as a variable font declared for weights 400–600, with Latin, Latin extended and Cyrillic files. The word on the card is the largest thing on any screen and is set at 500, not bold; a cue or target too long for its card steps down the scale at most twice before the card scrolls. Everything else is 400 or 500; 600 is for the wordmark, counts and kbd. The scale is hand-tuned rather than a ratio: text sizes climb by 1 to 1.5 px from 11 to 17, display sizes by about 1.2 to 1.27 from 20 to 46. It is set in rem so it follows the reader's default font size; the sizes in the frontmatter and in this document are px at the 16 px default. Headings track −0.02em, the word −0.03em, body never. Tabular figures on anything that changes. Curly quotes and the ellipsis character in copy. Uppercase only at 12 px, tracked +0.06em.

One exception to the single family. `font-mono` is a system monospace stack, nothing downloaded, and it has two jobs: code on the docs site, and the strings in the app that are proofread character by character rather than read — an API key, a client's hostname, a header name in copy. Onest draws 0/O and 1/l too alike for a secret where a mistyped character is a silent 401. Nothing else uses it: not numbers, not code-ish labels, not UI text. The design system page sets its state annotations in it for the same reason as docs, so a note about a component never reads as part of the component.

## Motion

Motion conveys state. Press scales over 150 ms: 0.97 on buttons, segments, the pill nav, back and new-card rows, 0.98 on deck cards and New deck, 0.96 on the grade buttons, 0.99 on the direction rows; menu rows and rail rows do not scale. Hover: 150 ms, pointer devices only. In a menu or a list of options the hover is one fill that slides to the nearest enabled row over those 150 ms, so it never blinks off in the gap between rows and never crosses a separator; the moment the keyboard takes over it goes, because focus carries its own fill and two fills would be two cursors. A card arrives with a 6 px rise over 200 ms. On a desktop a menu grows out of the corner nearest the button that opened it — scale 0.94 to 1 over 140 ms, leaving in 100 — because a menu belongs to its trigger, and a list that slides in from somewhere else reads as a panel that happened to land there. On a touch device it rises as a drawer instead. Reveal is the one choreographed moment, built with Motion: the word glides up to make room over 340 ms, the rule draws across from the start edge over 360 ms, the meaning, example and sources rise 10 px out of a 4 px blur over 260 ms, 50 ms apart, and the four grade controls rise 10 px over 220 ms, 35 ms apart, starting 80 ms after the strip begins to open. Until then there is no grade strip and the card takes the room; on reveal the strip opens over the same 340 ms and the card shrinks to make space, so the word's glide and the card's shrink read as one movement. A grade plays it backwards: the strip closes over 300 ms, its grades fading in the first 120, and the card grows back into the room while the next card's words fade in over 160 ms. The card is not replaced, because the place on the screen is the same; only what it asks changes. The next card never waits for the server: the grade is kept on the device and sent behind it. An unrevealed card is the word alone. A hint at its foot, a pointing hand that taps three times and rests with a line under it saying how to reveal, appears in two cases only: after a second on each of a learner's first three cards, and after a minute on any card with no press, key or scroll. The session count rolls up as each card lands. A pronunciation that fails to play turns its button red, shakes it once over 400 ms, and says why in a tip over the button that leaves after four seconds or at the next tap; nothing is added under the card, so the layout never moves for an error. A review feeds the flame, described under The flame and timed below. The chosen plate of a segmented control and of the pill nav springs to the new option in about 340 ms with a trace of overshoot, so the choice reads as one thing moving rather than two things blinking; chosen from the keyboard, it jumps. A choice control answers the press it was given: a checkbox gives a little as the fill lands and the tick draws across, a radio's dot swells past its size and settles, and a held switch thumb stretches toward the end it is leaving for, then springs across when let go. Those four share one set of springs in `lib/choice-motion.ts`, and each leaves faster than it arrives. A control's own mark still moves when a key changes it, because the mark is the answer to the key; the segmented plate travels across the interface, so for a key it jumps. Toasts keep shadcn's default motion: they rise from below the edge and restack over 500 ms on an ease-out-expo curve. Keyboard-initiated actions do not animate the interface they change: a card graded from the keyboard arrives at once, with no closing strip and no fade. The flame is the exception, because it is not the interface responding to a key but the fire being fed, and it never delays the next card. The theme switch suspends transitions for one frame so the room swaps at once.

An icon control names itself in a tooltip, never in a native `title`, whose delay, look and touch behaviour belong to the browser. The tooltip waits 500 ms under a still pointer, grows from the side nearest the control over 120 ms and leaves in 80. Moving along a row of controls opens the next one at once, with no fade, because the reader is already reading them. Keyboard focus shows it without the wait; touch never does; pressing the control, Escape and blur all close it, and a menu button stays quiet while its menu is open. It repeats the accessible name, so it is hidden from assistive technology and never stands in for the control's `aria-label`. `Tooltip` in `components/ui` holds the parts, and one `TooltipProvider` at the client root shares the delay so adjacent tooltips hand off.

A toast says what just happened, and quotes at most 60 characters of a learner's text, cut at a word, so a long term never turns a toast into a page. It is shadcn's Base UI toast with Lymi's colours: the text colour, a title, at most one action (usually Undo, which stands in for a confirmation dialog), a close button, and an icon for an error. On a phone it sits above the pill nav; from 640 px it sits in the bottom-end corner. During a review, which has no pill nav, it sits above the grade strip instead, so an error never covers the grades it is about. Toasts collapse into a stack of up to three, the newest in front and each older one 12 px higher and 10% smaller, so a second archive never takes the first one's Undo away. Toasts share one colour, so each carries an inset hairline in the room's colour at 25% to show where it ends and the next begins; it is the toast's only edge, because surfaces have no shadows. A toast enters and leaves past the bottom of the screen, clearing the pill's gap on a phone, rather than stopping at the gap and vanishing. Pointing at the stack or moving focus into it spreads the toasts into a column 12 px apart. Each leaves after five seconds, but every timer holds while the stack is open or the window is in the background. A swipe down or to the side dismisses one, and so does Escape once focus is inside. An error is announced to assistive technology at once; every other toast waits for a pause.

An overlay moves the way its shape does. The drawer rises from the bottom edge over 450 ms on the drawer curve, follows the finger while it is dragged, and leaves in up to 320 ms, shorter the harder it was flicked. The centred dialog arrives with the card's 6 px rise over 200 ms and leaves in 140 ms, faster than it came.

The auth screens have one moving part: the connection. The app that asked and the lantern sit in matching tiles joined by a rail, dotted while the decision is open. When the grant lands the rail draws across in amber over 420 ms and the flame rises 300 ms in, so the two read as one movement rather than two. A refusal leaves the rail dotted and the flame goes out. Under reduced motion the rail is simply filled. Nothing else on those screens animates.

The end of a review is the other choreographed moment, and the one place the interface celebrates, because it is where the day lands. It plays as one sequence over about two seconds. The last card steps back 8 px, to 0.98, over 200 ms while the lantern leaves the header for the middle of the screen on a 600 ms spring and rises to full on the way. At 280 ms the lantern lights the room: a pool of its own glow blooms behind it over 1.6 s and then breathes on the flicker's loop, and a handful of embers lift off the flame once. The heading rises out of a blur at 640 ms, the count at 820 ms and rolls up from where this stretch of the review began, the seven lights switch on 70 ms apart from 1.18 s, and at 1.78 s today's light fills with a brief flare of the glow and the run ticks. The ways on arrive last, 90 ms apart from 2 s. The first tap or key finishes the sequence at once, so it is never a wait. Choosing Review forgotten or another round carries the lantern back to the header. Under reduced motion the lantern does not travel, there are no embers or breathing, and the screen crossfades with its final numbers in place.

The flame flickers on a 2.6 s loop because a flame does, and three things move on that one loop: the flame scales, the bright core beats slightly out of phase inside it, and the halo breathes with both. A flame that changes size under a halo that holds still is the thing that reads as fake. The flicker multiplies whatever size the flame has, so a small flame flickers small.

The flame's own changes are springs from Motion, so a movement that is interrupted keeps its speed instead of starting over. A settle after a review takes 900 ms. A breath goes in over 280 ms and out over 900 ms. The rise at the goal takes 1.4 s with a breath 1.6 times as deep. Catching from out takes 700 ms and is the one movement with a trace of overshoot, bounce 0.12. Going out takes 1.6 s, so it reads as a fire dying down rather than a switch. The values live in `FLAME_MOTION` in `lib/flame.ts`, and the design system reads them from there. Carried, the body rocks ±5° from the bail's pivot while the bail counters at ∓3.5°.

Under `prefers-reduced-motion` the flame holds still and takes each new size and halo at once, with no breath; reveal, completion, card, toast, spinner and the phone drawer crossfade with no travel, the grade strip closes at once, the pointing hand appears without tapping, the list hover fades in on the row under the pointer instead of sliding, a segmented plate fades in at its new option, a switch thumb takes its new place at once, a radio dot and a tick fade in where they are, and the skeleton stops shimmering. The glow stays, because a glow is a state, not a movement.

## Layout

Two destinations, Today and Library. Review is the primary button on both, never a place you navigate to. Settings, Activity and Archived sit behind **You**, one profile screen reached from the avatar on the phone and the sidebar's profile row on desktop. Insights holds its slot before it has content. See [ADR 0005](docs/adr/0005-review-is-a-button-not-a-destination.md).

On the phone the navigation is a floating pill, two items wide, opaque over the content and clear of the home indicator. It is a `plate-2` track with a `plate` item selected inside it, the same shape as the segmented control, because a frosted pill is a material the rest of the app does not use.

On desktop it is the 240 px rail, and the rail is a surface: it runs the full height of the window flush to the left edge, in `rail` with a hairline down its inner side. In it, top to bottom: the app tile beside the wordmark, search and the capture button on that same line, the four destinations, the decks, and the learner at the bottom under a rule — a 34 px avatar, the name, and what the screen behind it holds.

Today is a page of cards, not a single stage. The due card leads: the lantern beside how many cards are due, then one full-width Review button 64 px tall. With a single deck it names the deck. The streak card sits beside it on desktop, in the narrower column, and under it on the phone. Under both, **More to review** shows the rounds as three tiles, always in the same order: **Forgot today**, which is freshest, **New cards**, then **Keeps slipping**. Forgot today leads its name with the Forgot mark and New cards with New's; Keeps slipping is not a state and has no mark. A tile with cards opens its review. An empty tile keeps its place with a muted zero and a plain line, and an empty New cards tile offers Add cards, so no tile is ever left on its own. On desktop the three sit in a row with the action along the foot; on the phone they stack as rows with an arrow. Last, **Decks to review** lists only decks with cards due, each row leading with its due count, with a small Library link at the end of its heading, and appears only when the learner has more than one deck; it comes after the rounds because the Review button already covers the same cards. A series with cards due is one row that reviews the whole series, and its decks get no rows of their own. Deck rows and round tiles are whole links that end in a label and an arrow in a circle, never a button inside a row. Today never shows a term, because seeing the answers before a review asks for them spoils the recall.

Until the first review, Today is the getting started guide, described under Empty states.

A review holds the screen: the page never scrolls, and the grade strip always sits under the card. A card too long for its room first steps its cue and target down the type scale; example and notes never shrink or hide, so whatever still does not fit scrolls inside the plate, softened at its top and bottom edges.

The rail's first line and the page title beside it sit on the same line, 32 px down. That shared line is what makes the two columns read as one app rather than a menu next to a document.

The column of content is capped at `--column` (880 px) and centres in whatever the rail leaves. It never stretches: a vocabulary app is one column, and a wider one is a worse read. On a 2560 px screen the rail fills the left edge and the column sits in the middle of the rest, so a big window gets the same read as a laptop instead of a stripe of content in a field of empty room. Reading screens narrow further to 672.

Capture is one plus for what a learner adds by hand: a word or a deck. Imports are occasional, so they start from the Import group at the end of Settings. It is round and amber, because it is the app's standing action and the only control on every screen; the menu under it names each with an icon. It sits in the rail beside the mark on desktop and in the top bar on the phone, and `N` opens it from anywhere.

On the phone every screen starts with the same top bar, `TopBar` in `views/shell.tsx`: 56 px, back on the start side, the screen's own controls on the end, and the title under it in the same place on every screen. A tab has nowhere to go back to, so Today and Library put `TileLockup` there instead: the app tile at 40 px, the height of every control in the bar, with a hairline edge so it holds its shape on the dark canvas, and the wordmark beside it, as they top the rail. The end of a tab's bar reads streak, capture, avatar: the status leads, the two round buttons stay a pair, and the account keeps the outer corner. Back is `BackButton`, a 44 px target with a 22 px chevron and the name of the screen it returns to, so a card says which deck. The controls are square ghost icon buttons at 40 px. Capture keeps its round amber shape and goes first among the buttons, so it never sits between two squares; the avatar, also round, follows it. On desktop the rail does this job and the bar goes, except on a screen nested under another one, such as deck settings, which keeps it for its way back.

## Empty states

An empty state shows the learner how to fill what is empty, and it looks temporary, so it is never mistaken for content. The shape follows what is empty. The live versions are the Empty states page of `/design`.

- **Today before the first review is the getting started guide.** `StartGuide` in `components/start-guide.tsx` is one plate headed **Getting started**, with a count ("1 of 3 done") and a three-part track, then three steps in order: **Make a deck**, **Add cards from your last lesson**, **Review them**. Each step is done by the learner's own data, never by a dismissal. A done step shows a green check and a struck-through title, the current step holds its action, and a later step stays muted. After the first review the usual Today takes over.
- **A screen with nothing in it yet has a start panel.** `StartPanel` in `components/start-panel.tsx` serves Library with no decks, a deck with no cards, and Insights with no history. It is a 1.5 px dashed `edge-2` outline on the bare canvas, never a plate, because dashed is New's own mark for "not here yet". Inside sit a `text-lg` title, one sentence in `text-2`, one primary button at its normal size, and optionally a `StartPanelSection` under a dashed rule holding `NextSteps` rows for the other ways in.
- **A screen whose layout is worth previewing shows its real components at zero.** Insights draws its four `StatPlate`s with `ghost`, dashed and muted with their figures drawn empty, under its start panel. The preview uses the real component, so it moves when the layout does; a second drawing of the same shape is not allowed.
- **An empty group inside a screen is an empty section.** `EmptySection`, such as API keys or Connected apps in Settings: an icon in a `plate-2` circle, a short title, one line of why, and the action that fills it.
- **A search or filter with no match is one line.** `NoResults` sits under the controls that caused it, names the query or the filter, and offers Clear search or Show all.
- **A whole screen with nothing to outline uses `EmptyState`**, centred with the still brand lantern: Coming soon.
- **A screen that failed to load uses `ErrorState`**, centred with the alert icon on `danger-soft`, never the lantern. The title says what failed, the line says the fix, and Try again retries.

Every empty state is quieter than the page: its title sits below the page title, `text-xl` for the getting started guide, which is the whole of Today, and `text-lg` or smaller everywhere else. Its button is a normal button, never the 64 px Review button.

A start panel has one primary action. The other ways in are `NextSteps` rows: an outlined icon, a title, one line of detail and the arrow, separated by a gap rather than rules so the hover fill never meets a line. Each row opens where the work happens, such as a Settings group by its anchor or the public docs. Connecting Claude or ChatGPT is offered only while no app is connected.

An empty state holds no examples or sample content. They crowd the action and can be mistaken for the learner's own data.

The copy names what is missing and how to fill it: "No cards in Estonian A2 yet", not "Nothing here". It never promises what the product does not do yet, such as AI filling in meanings, and never ties the lantern to anything but the streak.

Loading is a `Skeleton` at the loaded size, never an empty state.

## Components

`components/ui/`: shadcn components on Base UI, one file per primitive, added with `pnpm dlx shadcn@latest add <name>` from `apps/web`. The file is ours once added: keep its export names, parts, data attributes and `render` composition, and rewrite its classes to the tokens on this page; shadcn's own colour variables are never added. The state variants generated classes use, such as `data-open:` and `data-horizontal:`, are copied from `shadcn/tailwind.css` into `styles.css`, because without them those classes match nothing and fail silently. Each matches Base UI's presence attributes, such as an empty `data-selected`, as well as Radix-style values. `pnpm dlx shadcn@latest add <name> --diff` shows what changed upstream, and an update is merged by hand. A primitive that changes shape by device keeps both shapes in its own file, behind shadcn's part names, and tests every part in both. [ADR 0017](docs/adr/0017-interface-primitives-are-shadcn-components-on-base-ui.md).

`components/`: Button (primary, secondary, ghost, danger; sm, md, lg; kbd hint; loading), IconButton, Segmented, RadioCard, Chip with StateChip and SourceChip, Kbd, Progress, Skeleton, EmptyState with ErrorState, EmptySection and NoResults, StartGuide, StartPanel with StartPanelSection, NextSteps with NextStep and Go, SettingsGroup, SevenLights, StreakButton with StreakPanel, StreakCalendar and StreakWeek, GoalPicker, Table, Dialog, CardForm with AddCardSheet and EditCardSheet, CardPictureField, FieldChip, TagsInput, ReviewModesField, NewDeckSheet, AddMenu, LanguageField, DirectionField, DirectionCompact, Avatar, CopyField, DeckCard, NewCardsRow, NavLink, PillNav, TopBar and BackButton (in `views/shell.tsx`), StateIcon, DueCount, LibraryBoard, SeriesSheet, ArchiveSeriesDialog, ArchivedSeriesDialog, MoveToSeriesDialog, Flame, AppMark, CardPicture, Connection, Lantern, Wordmark, Lockup, StatPlate (and its ghost), RunStrip, MonthBars.

`views/`: the screens as prop-driven components, so the design page renders them with sample data. They lay out by their container (`@3xl` = 768 px), not the viewport. Chrome that follows the rail — page padding, top bars, back rows — queries the whole window's `@3xl/shell`, because the rail appears at a 768 px window while the column beside it is still narrower. The toast renders outside the shell, so its clearance for the pill uses the matching `md` media query.

A question takes the shape of the machine as well. On a desktop it is a centred dialog with its actions in a row, the primary last; on a touch device it is a drawer with the actions stacked full width and the primary on top, in reach of the thumb. `Dialog` in `components/ui` holds both shapes behind its usual parts — header, title, description, footer — and focus lands on the safe action when the first control is not it.

A menu takes the shape of the machine too. On a desktop it is anchored to its trigger; on a touch device the same rows rise in a drawer from the bottom edge, where the thumb is, and swipe away. The rows keep their menu roles and arrow keys in both shapes, and a keyboard hint is left out of the drawer because there is no keyboard to hint at. `DropdownMenu` in `components/ui` holds both shapes, so a call site uses shadcn's parts and never asks which machine it is on; the rule is `(min-width: 768px) and (hover: hover) and (pointer: fine)`, read as the menu opens and held until it closes ([ADR 0017](docs/adr/0017-interface-primitives-are-shadcn-components-on-base-ui.md)).

A sheet — a form the learner asked for — takes the shape of the machine it is on. On a touch device it is a drawer that rises from the bottom edge and can be swiped away, because that is where the thumb is, and it keeps the focused field above the software keyboard. On a desktop a panel pinned to the bottom of a 1400 px window is a phone pattern nobody finished, so the same sheet is a centred dialog. Both are `Dialog`, and the forms inside know nothing about either shape. The pointer counts as well as the width, so a tablet held in two hands still gets the drawer at 900 px. The shape is frozen while the sheet is open, because crossing the breakpoint mid-edit would otherwise remount the form and take the half-typed word with it.

Every control in a form is the same box: 44 px tall on the phone, 40 on the desktop, and 16 px text on any touch screen, a tablet included, so iOS does not zoom on focus. Input, Select and Combobox take it from `controlSize` in `components/ui/input.tsx`, and Textarea takes only its text size from `controlText` so its height follows its content, so a form reads as one row repeated rather than a pile of different objects. There is no larger cut for "the one field that matters" — a form with three type sizes in it looks unfinished, and the field that matters is already first. Controls size by the **viewport**, not the container: a phone is a phone whatever it is nested in, and a sheet renders in a portal where a container query has nothing to measure and would silently never fire.

A form row is shadcn's Field, from `components/ui/field.tsx`: `FieldLabel` above the control, then `FieldDescription` and `FieldError` under it. The parts wire themselves, so no id is written by hand. The label points at the control, and the control is described by whichever description and error are on screen, the error first. The Field owns validity: a `FieldError` with a message marks the field `data-invalid` and its control `aria-invalid` together, `invalid` does the same when the message sits elsewhere, and a control inside a Field cannot set its own. `disabled` on the Field reaches the control. `FieldDescription` steps aside while its field shows an error, so the error takes its place rather than stacking under it, and `FieldLabel`'s `aside` puts a note such as "Optional" at the end of the label row. `FieldSet` and `FieldLegend` name fields that belong together, or a row whose control is not a box, such as the button that makes the first deck. There is no shorthand component: every form is written with the parts, so there is one way to build a row. Input and Textarea are plain elements rather than Base UI's `Input`, which validates natively on Enter and would overrule the Field. Every part takes native props and a ref, so a form library could drive them later without a rewrite.

A short list is picked from and a list of forty is searched. `Select` and `Combobox` are the same box as every other control when closed. `Select`, in `components/ui`, takes the shape of the machine the way a menu does: on a desktop a panel unfolds under the box, 4 px and scale 0.98 over 140 ms, the arrows walk the rows and typing a letter jumps to a name; on a touch device the same rows rise in a drawer, under the thumb, and swipe away, and inside a form sheet that drawer stacks over the form's. The rows are the control's own height and the chosen one leads with a check in a slot every row keeps. The hover is the one sliding fill from Motion, so the keyboard's row, not the pointer's, is the row Enter picks. `Combobox`, also in `components/ui`, is a Select you search, and takes the machine's shape the same way: a panel under the box on a desktop, or above it when there is more room, and a drawer titled with the field's name on a touch device. Either way the search field leads and takes focus, and the list keeps one height in the drawer while it filters, so the drawer does not jump with each letter. The names filter as you type, the first match is highlighted so Enter takes it, and a letter typed on the closed box opens it with that letter already searched. Anything a list accepts beyond its rows, such as a language tag it has never heard of, belongs to the product field that holds it, not to the primitive. Neither control is the platform `<select>`, whose list would be the one thing in a form the palette does not reach.

A choice that is not typed is one of four controls in `components/ui`, each a Base UI part that submits with a native form under its `name`. `Checkbox` is for a second choice that rides along with an action, `Switch` for a setting that applies the moment it changes, and `RadioGroup` for one of a few choices that each need a sentence. `ToggleGroup` holds two to four short views of the same thing, and Segmented is its look in the product: the track, the plate and the heights. A checkbox or switch sits in a horizontal Field with its label, so the label names it and presses it; a radio group is named by its legend or `aria-label`, and each item takes its name from its own Field or, in a RadioCard, from the row's title. A radio group and a toggle group are each one Tab stop, and the arrows walk inside them: in a radio group they move the choice, as on any platform, and in a toggle group they move focus and Space or Enter chooses. The arrows skip a disabled option, which is still read out with the rest. The hit area reaches 44 px through a pseudo-element, so a 20 px box never moves the row around it. Checked is amber on a checkbox and a switch, and ink on a radio, where selection is the ring and the dot.

**A button is never taken away for being unable to run yet.** `disabled` drops it out of the tab order and tells a screen reader nothing about what is missing, so a greyed-out submit leaves the learner with no way to ask. Forms stay pressable and validate on submit: the same Zod schema the route parses with, the message under the field with its icon, and the caret moved to the first thing that is wrong. The messages live on the schema in `packages/core`, so what the API says on a 400 is what the field says under the control. `aria-disabled` is for the cases where pressing genuinely cannot do anything — mid-request, or a handler that does not exist — and it keeps the button focusable and announced while swallowing the press.

Rules: one primary per view. Every control has default, hover, focus, active, disabled and, where it applies, loading. A modal that asks a question is a last resort; Undo replaces confirmation. A sheet is not that modal: it is a form the learner asked for.

## Voice

Plain and friendly. Counts cards, not points. Never nags, never celebrates for you. "Nothing left today", not "Congratulations!". Anything the AI wrote is labelled where it appears.

- A field error says how to fix it: "Keep the term under 500 characters."
- Any other error says "Couldn't [verb] [thing]." and then the fix, never a status code: "Couldn't save the reminder. Check your connection and try again."
- "New deck" opens the form; "Create deck" submits it.
- Confirmation stays only where there is nothing to undo. The destructive button names the consequence ("Revoke key") and the safe button names what stays ("Keep key").
- Screen names (Library, Settings, Activity) and grade names (Forgot, Hard, Good, Easy) keep their capitals inside a sentence.
- Reminders and other notifications carry no guilt and no urgency.

## Documentation

The docs site at `/docs` is the same two rooms. Code is set in `font-mono`, the one exception to Onest described under Type.

Code is set in ink and weight, never in colour. Three tones carry the syntax: a JSON key is `text` at 500 because it is what you scan for, a value is `text-2`, and comments and punctuation are `muted`. Nothing in a snippet is `faint`; every character there carries meaning.

The two colours the reference does use are the ones that already mean something. A response code is `good` when it is a 2xx and `danger` otherwise. An HTTP method is a neutral chip, except DELETE, which is `danger`.

Prose is `text-2` at 15.5 px on a 44 rem column; headings and bold are `text`. The API reference gets 52 rem, because it carries field tables. Pages are plain on the canvas, not in cards: a card in the docs means a code block, a callout, or one operation.

## Don't

- No gradients on any surface; the app icon, the link preview, which shares its warm centre, and the lantern's pool of light at the end of a review are the exceptions. No drop shadows. No glow on anything but the lantern, its embers and today's light as it fills.
- No amber outside the flame, the primary action and a due count. The streak's flame is that same flame, so it counts as one.
- No grey metal. No second illustration. No outline, rotation or bevel on the mark.
- No simplified small cut. No amber beyond the flame and the primary action.
- No two flames in one mark. If the lantern is on the screen, the wordmark is plain. The streak's flame is a component, not a second mark, and may sit on a screen the lantern is already on.
- No translucent glass, and no room colour painted inside the mark. The lantern must survive being put on a surface it did not expect.
- No display serif, no sparkle icon, no confetti.

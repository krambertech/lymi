# Surfaces

By day every surface is flat: depth comes from one hairline edge and nothing lifts. At night plates sit a little off the room on a soft shadow, with no lit lip along the top, which read as a ridge. Texture goes only where something is lit or holds a level, never across a whole screen.

## Which background

Every surface is one of these tones.

```text
What is it?
 ├── The page itself → bg-canvas (the room)
 ├── The desktop navigation → bg-rail (one step off the room)
 ├── A sheet that rises over the room, on the phone → bg-sheet
 ├── A thing in the room: a card, a panel, a row group, a control → bg-plate with the edge utility
 ├── A well inside a plate: a chip, a track, a nested group → bg-plate-2
 ├── The chosen option riding in a plate-2 track (Segmented, the pill nav) → bg-chosen
 ├── The current row in the rail → bg-rail-chosen with edge-inset (see The rail's rows)
 ├── Something empty that will fill later → no fill, a dashed border-edge-2 outline (see empty-states.md)
 └── A published deck on Explore → a deck tray (see The deck tray), and nowhere else
```

```tsx
// Correct: a plate is a fill and the edge utility
<section className="edge rounded-xl bg-plate p-5">…</section>

// Incorrect: a drop shadow by hand; the night lift belongs to edge
<section className="rounded-xl bg-plate p-5 shadow-md">…</section>
```

The rail is recessive by day and a step up at night, and it carries the hairline on its inner edge, so the app never reads as one wash with chrome floating in it.

## Elevation

The light room is noon: nothing casts a shadow, so depth is tone and one hairline. The dark room sits each plate a little off the room on a soft shadow under it. Every level comes from a utility; a hand-written `shadow-*` is never right.

| Level | What | By day | At night |
| --- | --- | --- | --- |
| Room | `bg-canvas` | the page | the page |
| Sheet | Liquid Glass on iOS 26; `bg-sheet` before it | the room, set apart by the scrim behind it | a step lighter than the room, since a scrim cannot darken the dark |
| Plate | `edge bg-plate` | white with a hairline | lifted: `--lift`, a soft shadow under the hairline |
| Well | `well`, a track or an unlit pane | set into its plate | set into its plate, a step lighter so it still reads |
| Chosen | `bg-chosen`, in a `plate-2` track | white | a lifted warm grey, above its track |
| Current rail row | `bg-rail-chosen edge-inset` | white with a hairline | flat: a step above the rail with a hairline inside, never lifted |

Never lifted: a form field, which sets `--lift` to nothing because a field is set into the page and a lifted one reads as a button; anything with no fill at rest, such as a ghost button, a navigation row or a menu row; a chip; a well. Overlays keep their own edge and scrim ([overlays.md](overlays.md)).

### Hover

Hover follows what the thing is at rest. Something with a fill and a hairline, such as a plate you can press, a secondary button or a grade, strengthens to `edge-2` and lays `veil` over its own fill. Because the veil darkens whatever fill is under it, it answers the same way in both rooms. A row on a white surface, such as a list inside a plate, a dialog's list or the card rows in an Activity entry, is part of that white surface and hovers with `veil` too. Something with no fill at rest, such as a ghost button or a menu row, and a chip or well on `plate-2`, fills with `bg-hover`, never `plate-2`: in the light room `plate-2` is the rail's tone, so the fill vanishes there. A row in the rail has its own pair (see The rail's rows).

### The rail's rows

The rail shows where the learner is, so its current row is the strongest row in it and hover always sits below it. The current row is `bg-rail-chosen` with `edge-inset`; a row under the pointer fills with `bg-rail-hover`. By day these match a plate and `bg-hover`. At night the current row is flat, a step above the rail with a hairline drawn inside it, and hover is a faint white wash.

Never `edge` or `bg-plate` on the current row: at night `edge` lifts it into a dark button, and `plate` sits below `hover`, so the row under the pointer outranked the one the learner is on. Anything else in the rail that hovers, such as the learner row and the streak pill, uses `rail-hover` too. Both rails draw their rows with `RailRow` ([rail.md](rail.md)).

### The chosen option

A chosen option in a `plate-2` track sits on `bg-chosen`, never `bg-plate`. By day the two are the same white; at night `plate` is darker than `plate-2`, so a plate thumb reads as a hole and the choice is unclear.

## On glass

On the phone, sheets, their corner buttons and the tab bar are iOS's Liquid Glass with no room tint: the glass is the platform's, and a tint only turns it into a slab. The two exceptions are the amber of the one standing action and the frost a peek sheet needs ([phone.md](phone.md#sheets)). What sits on glass lets it through and takes its colour, as iOS's own grouped rows do. A plate, a field, a sheet's row group or a chip is `bg-glass-plate`; a chosen option is `bg-glass-chosen`; neither lifts, because the glass already floats. `OnGlass` in `apps/mobile/src/ui/surface.tsx` switches `Plate`, `Segmented`, `Input` and the field chips to these fills, and every `Sheet` wraps its content in it. An opaque warm plate on glass reads as a brown box on a grey sheet.

On the web, `glass` is a slight version for what floats without a scrim: menus, popovers, select and combobox lists, and the pill nav. It is the plate nearly opaque over a 12 px blur, with a sheen along the top, the `edge-2` hairline and a soft shadow, the one shadow a day surface carries, because these float over the page. Dialogs, drawers and side sheets stay solid, since glass over a scrim only turns grey. Under reduced transparency, or where the browser has no `backdrop-filter`, it falls back to the plate.

`frost` is for what floats inside a plate over text that scrolls under it, such as the hook offer at a card's foot: `plate-2` at 65% over a 4 px blur, so the words under it show as a soft hint, with no edge, sheen or shadow, because the plate already holds it. The scroller under it drops its foot fade, which turned the panel into a grey gradient, and cuts the text off at the panel's foot instead, so nothing shows in the inset below it. Under reduced transparency, or with no `backdrop-filter`, it falls back to solid `plate-2`.

## Edges

`edge` is the hairline every plate and control carries: a 1 px ring drawn as a box-shadow, so it never changes the box's size. Hover strengthens it to `edge-2`; `edge-inset` draws it inside the box, for a plate whose content runs to its edge. Use `border-edge` only for a rule between rows. Focus adds the neutral 2 px outline every control gets, in `ring`. Under forced colours, which drop shadows, the edge becomes a 1 px outline in the system colour.

At night `edge` and `edge-2` also carry `--lift` (see Elevation). By day `--lift` is nothing.

A photo gets `image-edge` instead: a 1 px outline drawn inside its bounds, untinted black by day and white at night, because a warm line reads as grime on a picture. A card picture wears it only when it is opaque, so a drawing on transparency never sits in a box.

An inset `box-shadow` is allowed only as a stroke that a border cannot draw: the invalid ring on a control (`shadow-[0_0_0_1px_var(--danger)]`), a ring on a calendar day, or the hairline on an overlay's edge. Never a blurred shadow.

## Sets

A set read together, such as Today's rounds, a series in Library or a day on Activity, is a heading above its plates or a list of rows in one plate. It never sits in a tray: a well with tiles in it read as a box around things the heading already groups, so the trays tried in #430 were taken out.

## Lit and set in

A track or an unlit pane is `well`: its hairline drawn inside, and a slight shade along its top, so it reads as set into its plate. What fills it is `lit`: light caught along its top and, at night, the faint glow of the flame. They go on the review progress, today's goal, the seven lights and the thirty-day strip. The progress fill is ink, so it turns its glow off with `[--lit-glow:0_0_#0000]`.

The primary button carries `key-light`, a soft fall of light with no lip and no shadow.

## Radius

The radius tokens are `rounded-xs` 6 px, `sm` 10, `md` 14, `lg` 18, `xl` 22, `2xl` 30 and `full`. Controls are `md` (a small button is `sm`), plates and cards are `xl`, rows inside a list are `md` or `lg`, chips and round buttons are `full`. An arbitrary radius is for a drawn illustration only, never a control or a plate. A control inset in a plate takes the plate's radius less the gap, so the corners run parallel: Today's Review button sits 8 px inside a 22 px plate, so it is `rounded-md`, 14 px.

## The glow

The only glow in the interface belongs to the lantern, and inside the lantern only the light wears it. In CSS it is the `glow` utility, which puts the drop shadow on the `.lantern-light` group rather than the whole drawing: metal does not glow, and a filter on the drawing halos the frame and traces the glass. Nothing else may use it. A lit fill's faint night glow is the flame's too, and it comes from `lit`, never from `glow`.

The light spills into the room in four places: as `lamplit` on the lantern's plate on Today, a pool from the lantern's side; around the lantern at the end of a review and at Welcome's first screen, under Motion, both drawn by `LanternLight`; and as a still pool behind Explore's search. A shelf's own page has the same still pool behind its name, in the shelf's colour rather than the lantern's. On the public site, the hero scene of a page for one way of learning (tutor lessons, notes) stands in a still pool of the lantern's light, so the material and its cards read as one moment. All of them go under `prefers-reduced-transparency`. The embers and today's light as it fills in the day grid carry the same glow, because they are the flame.

Never a gradient on a surface. The exceptions are the app icon, the link preview, which shares its warm centre, the lantern's pool of light at the end of a review, at Welcome and on Today, the light in `lit` and `key-light`, and the flame's own light (brand.md). No surface carries grain or noise.

## The deck tray

On Explore a published deck shows as one of its own cards sitting in a deck tray: a rounded panel the card is cut against, with the deck's name below it on the open canvas rather than inside a box. The deck tray is why the cut reads as tucked into the shelf; the same card cut in mid-air reads as clipped. It shows two thirds of the card, which is the most that can be taken before the meaning goes with it, and the deck's name is the largest thing in the group.

The card in a deck tray sits on paper: one blank sheet per further card the deck holds, at most two, so the stack is the deck's own depth rather than a decoration. Pointing at a deck lifts the card and spreads the sheets either side of it over 260 ms; under reduced motion they rest where they are.

A deck tray is the one surface that carries a hue. Eight of them share one lightness and one chroma, chosen from the slug and nothing else, so a deck keeps its colour as the catalogue grows, a search that hides its neighbours does not repaint it, and its own page arrives at the same colour without being told. Two of the eight landing side by side is the price of that. **The amber band is left out**: amber means act, and a deck tray is not a thing to press. At night the deck tray is lifted well off the room, at lightness 0.30 and chroma 0.065, so its hue still reads, and the card in it is lifted to 0.33, so the card still sits proud of it. The code is `trayHue` in `packages/core` and `.deck-tray` in `packages/design/tray.css`, which the site and the product both import; `DeckTray` draws it in the product.

A deck keeps that colour on its own page, as the ground its card spread lies on: click a lilac deck tray and land on a lilac page. The colour is a pure function of the slug, so nothing is stored and the two pages cannot disagree. The ground runs to both edges, because the spread's outer cards reach past the text column, and it holds **less chroma than a deck tray**: the same colour over a page reads far louder than over 216 px.

Every preview of a published deck's card, in its deck tray, the page's spread, the try-it hand and the in-app fan, shows the card in one of the review modes a learner is asked it in, so a visitor sees what learning the deck is like. A picture mode goes first, while the card has a public picture; otherwise the preview steps through the card's modes by its place, so a deck asked both ways shows both. The cue sits above the rule, a picture at its own shape on the start edge, and what the learner recalls sits under it, as a turned card in review. The try-it card shows only the cue until it is turned, and the card list keeps the term readable beside the picture. Pronunciation has a named play control and never starts on its own.

Explore inside the product departs from this twice, each with its reason in [the feature's design](../explore.md#in-the-product): a tile there is a card rather than a group on the open canvas, because the Add button on it has to belong to something, and a deck's own page lays its colour under the whole header, with a hand of its cards in place of the tray and a white Add rather than amber.

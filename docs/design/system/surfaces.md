# Surfaces

By day every surface is flat: depth comes from one hairline edge and nothing lifts. At night the lamp is lit, so plates catch it on their top edge and lift a little off the room. Texture goes only where something is lit or holds a level, never across a whole screen.

## Which background

Every surface is one of four tones.

```text
What is it?
 ├── The page itself → bg-canvas (the room)
 ├── The desktop navigation → bg-rail (one step off the room)
 ├── A thing in the room: a card, a panel, a row group, a control → bg-plate with the edge utility
 ├── A well inside a plate: a chip, a track, a nested group → bg-plate-2
 ├── A set read together, with its title inside it → a tray (below)
 ├── The chosen option riding in a plate-2 track (Segmented, the pill nav) → bg-chosen
 ├── Something empty that will fill later → no fill, a dashed border-edge-2 outline (see empty-states.md)
 └── A published deck's shelf → a tray (below), and nowhere else
```

Hover fills with `bg-hover`, never `plate-2`: in the light room `plate-2` is the rail's tone, so the fill vanishes there.

A chosen option in a `plate-2` track sits on `bg-chosen`, never `bg-plate`. By day the two are the same white; at night `plate` is darker than `plate-2`, so a plate thumb reads as a hole and the choice is unclear.

```tsx
// Correct: a plate is a fill and the edge utility
<section className="edge rounded-xl bg-plate p-5">…</section>

// Incorrect: a drop shadow by hand; the night lift belongs to edge
<section className="rounded-xl bg-plate p-5 shadow-md">…</section>
```

The rail is recessive by day and a step up at night, and it carries the hairline on its inner edge, so the app never reads as one wash with chrome floating in it.

## Edges

`edge` is the hairline every plate and control carries: a 1 px ring drawn as a box-shadow, so it never changes the box's size. Hover strengthens it to `edge-2`; `edge-inset` draws it inside the box, for a plate whose content runs to its edge. Use `border-edge` only for a rule between rows. Focus adds the neutral 2 px outline every control gets, in `ring`. Under forced colours, which drop shadows, the edge becomes a 1 px outline in the system colour.

At night `edge` and `edge-2` also carry `--lift`: a warm line where the lamp catches the top edge and a soft shadow under the plate. By day `--lift` is nothing. A form field sets `--lift` to nothing in both rooms, because a field is set into the page and a lifted one reads as a button.

A photo gets `image-edge` instead: a 1 px outline drawn inside its bounds, untinted black by day and white at night, because a warm line reads as grime on a picture. A card picture wears it only when it is opaque, so a drawing on transparency never sits in a box.

An inset `box-shadow` is allowed only as a stroke that a border cannot draw: the invalid ring on a control (`shadow-[0_0_0_1px_var(--danger)]`), a ring on a calendar day, or the hairline on an overlay's edge. Never a blurred shadow.

## Trays

A tray holds a set the learner reads together: its title sits inside it and its items are tiles on it. It is `tray` with `rounded-xl p-2`, and each item is `edge tile rounded-md`, so the corners run parallel. By day a tray is a `plate-2` well with white tiles; at night it is a plate with a rim and its tiles a step lighter, because a tray darker than the room disappears into it.

Use one only for a real set: Today's rounds and its decks to review, the streak's goal and figures, Insights' cards by state, Library's archived decks. A single row, a screen's main list or the grades are never in a tray.

## Lit and set in

A track or an unlit pane is `well`: its hairline drawn inside, and a slight shade along its top, so it reads as set into its plate. What fills it is `lit`: light caught along its top and, at night, the faint glow of the flame. They go on the review progress, today's goal, the seven lights and the thirty-day strip. The progress fill is ink, so it turns its glow off with `[--lit-glow:0_0_#0000]`.

The primary button carries `key-light`, a soft fall of light with no lip and no shadow.

## Radius

The radius tokens are `rounded-xs` 6 px, `sm` 10, `md` 14, `lg` 18, `xl` 22, `2xl` 30 and `full`. Controls are `md` (a small button is `sm`), plates and cards are `xl`, rows inside a list are `md` or `lg`, chips and round buttons are `full`. An arbitrary radius is for a drawn illustration only, never a control or a plate. A control inset in a plate takes the plate's radius less the gap, so the corners run parallel: Today's Review button sits 8 px inside a 22 px plate, so it is `rounded-md`, 14 px.

## The glow

The only glow in the interface belongs to the lantern, and inside the lantern only the light wears it. In CSS it is the `glow` utility, which puts the drop shadow on the `.lantern-light` group rather than the whole drawing: metal does not glow, and a filter on the drawing halos the frame and traces the glass. Nothing else may use it.

The light spills into the room in three places: as `lamplit` on the lantern's plate on Today, a pool from the lantern's side with a fine grain to hold it; around the lantern at the end of a review, under Motion; and as a still pool behind Explore's search. A shelf's own page has the same still pool behind its name, in the shelf's colour rather than the lantern's. All of them go under `prefers-reduced-transparency`. The embers and today's light as it fills in the day grid carry the same glow, because they are the flame.

Never a gradient on a surface. The exceptions are the app icon, the link preview, which shares its warm centre, the lantern's pool of light at the end of a review and on Today, and the light in `lit` and `key-light`. Grain goes only where the light pools, never on a plain plate.

## The tray

On Explore a published deck shows as one of its own cards sitting in a tray: a rounded panel the card is cut against, with the deck's name below it on the open canvas rather than inside a box. The tray is why the cut reads as tucked into the shelf; the same card cut in mid-air reads as clipped. It shows two thirds of the card, which is the most that can be taken before the meaning goes with it, and the deck's name is the largest thing in the group.

The card in a tray sits on paper: one blank sheet per further card the deck holds, at most two, so the stack is the deck's own depth rather than a decoration. Pointing at a deck lifts the card and spreads the sheets either side of it over 260 ms; under reduced motion they rest where they are.

A tray is the one surface that carries a hue. Eight of them share one lightness and one chroma, chosen from the slug and nothing else, so a deck keeps its colour as the catalogue grows, a search that hides its neighbours does not repaint it, and its own page arrives at the same colour without being told. Two of the eight landing side by side is the price of that. **The amber band is left out**: amber means act, and a tray is not a thing to press. At night the tray is lifted well off the room, at lightness 0.30 and chroma 0.065, so its hue still reads, and the card in it is lifted to 0.33, so the card still sits proud of it. The code is `trayHue` in the site's `lib/tray.ts` and `.deck-tray` in its `styles.css`; `DeckTray` draws it in the product.

A deck keeps that colour on its own page, as the ground its card spread lies on: click a lilac tray and land on a lilac page. The colour is a pure function of the slug, so nothing is stored and the two pages cannot disagree. The ground runs to both edges, because the spread's outer cards reach past the text column, and it holds **less chroma than a tray**: the same colour over a page reads far louder than over 216 px.

Every preview of a published deck's card, in its tray, the page's spread, the try-it hand and the in-app fan, shows the card in one of the review modes a learner is asked it in, so a visitor sees what learning the deck is like. A picture mode goes first, while the card has a public picture; otherwise the preview steps through the card's modes by its place, so a deck asked both ways shows both. The cue sits above the rule, a picture at its own shape on the start edge, and what the learner recalls sits under it, as a turned card in review. The try-it card shows only the cue until it is turned, and the card list keeps the term readable beside the picture. Pronunciation has a named play control and never starts on its own.

Explore inside the product departs from this twice, each with its reason in [the feature's design](../explore.md#in-the-product): a tile there is a card rather than a group on the open canvas, because the Add button on it has to belong to something, and a deck's own page lays its colour under the whole header, with a hand of its cards in place of the tray and a white Add rather than amber.

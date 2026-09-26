# Surfaces

Every surface is flat. Depth comes from one hairline edge, never from a gradient or a shadow, so nothing lifts.

## Which background

Every surface is one of four tones.

```text
What is it?
 ├── The page itself → bg-canvas (the room)
 ├── The desktop navigation → bg-rail (one step off the room)
 ├── A thing in the room: a card, a panel, a row group, a control → bg-plate with the edge utility
 ├── A well inside a plate: a chip, a track, a nested group → bg-plate-2
 ├── Something empty that will fill later → no fill, a dashed border-edge-2 outline (see empty-states.md)
 └── A published deck's shelf → a tray (below), and nowhere else
```

Hover fills with `bg-hover`, never `plate-2`: in the light room `plate-2` is the rail's tone, so the fill vanishes there.

```tsx
// Correct: a plate is a fill and the edge utility
<section className="edge rounded-xl bg-plate p-5">…</section>

// Incorrect: a shadow is depth this system does not have
<section className="rounded-xl bg-plate p-5 shadow-md">…</section>
```

The rail is recessive by day and a step up at night, and it carries the hairline on its inner edge, so the app never reads as one wash with chrome floating in it.

## Edges

`edge` is the hairline every plate and control carries: a 1 px ring drawn as a box-shadow, so it never changes the box's size. Hover strengthens it to `edge-2`; `edge-inset` draws it inside the box, for a plate whose content runs to its edge. Use `border-edge` only for a rule between rows. Focus adds the neutral 2 px outline every control gets, in `ring`. Under forced colours, which drop shadows, the edge becomes a 1 px outline in the system colour.

A photo gets `image-edge` instead: a 1 px outline drawn inside its bounds, untinted black by day and white at night, because a warm line reads as grime on a picture. A card picture wears it only when it is opaque, so a drawing on transparency never sits in a box.

An inset `box-shadow` is allowed only as a stroke that a border cannot draw: the invalid ring on a control (`shadow-[0_0_0_1px_var(--danger)]`), a ring on a calendar day, or the hairline on an overlay's edge. Never a blurred shadow.

## Radius

The radius tokens are `rounded-xs` 6 px, `sm` 10, `md` 14, `lg` 18, `xl` 22, `2xl` 30 and `full`. Controls are `md` (a small button is `sm`), plates and cards are `xl`, rows inside a list are `md` or `lg`, chips and round buttons are `full`. An arbitrary radius is for a drawn illustration only, never a control or a plate. A control inset in a plate takes the plate's radius less the gap, so the corners run parallel: Today's Review button sits 8 px inside a 22 px plate, so it is `rounded-md`, 14 px.

## The glow

The only glow in the interface belongs to the lantern, and inside the lantern only the light wears it. In CSS it is the `glow` utility, which puts the drop shadow on the `.lantern-light` group rather than the whole drawing: metal does not glow, and a filter on the drawing halos the frame and traces the glass. Nothing else may use it.

The light spills into the room in two places: around the lantern at the end of a review, under Motion, and as a still pool behind Explore's search, the only background on a public page. Both go under `prefers-reduced-transparency`. The embers and today's light as it fills in the day grid carry the same glow, because they are the flame.

Never a gradient on a surface. The exceptions are the app icon, the link preview, which shares its warm centre, and the lantern's pool of light at the end of a review.

## The tray

On Explore a published deck shows as one of its own cards sitting in a tray: a rounded panel the card is cut against, with the deck's name below it on the open canvas rather than inside a box. The tray is why the cut reads as tucked into the shelf; the same card cut in mid-air reads as clipped. It shows two thirds of the card, which is the most that can be taken before the meaning goes with it, and the deck's name is the largest thing in the group.

The card in a tray sits on paper: one blank sheet per further card the deck holds, at most two, so the stack is the deck's own depth rather than a decoration. Pointing at a deck lifts the card and spreads the sheets either side of it over 260 ms; under reduced motion they rest where they are.

A tray is the one surface that carries a hue. Eight of them share one lightness and one chroma, chosen from the slug and nothing else, so a deck keeps its colour as the catalogue grows, a search that hides its neighbours does not repaint it, and its own page arrives at the same colour without being told. Two of the eight landing side by side is the price of that. **The amber band is left out**: amber means act, and a tray is not a thing to press. At night the tray is darker than the card rather than lighter, so the card still sits proud of it. The code is `trayHue` in the site's `lib/tray.ts` and `.deck-tray` in its `styles.css`; `DeckTray` draws it in the product.

A deck keeps that colour on its own page, as the ground its card spread lies on: click a lilac tray and land on a lilac page. The colour is a pure function of the slug, so nothing is stored and the two pages cannot disagree. The ground runs to both edges, because the spread's outer cards reach past the text column, and it holds **less chroma than a tray**: the same colour over a page reads far louder than over 216 px.

Every preview of a published deck's card, in its tray, the page's spread, the try-it hand and the in-app fan, shows the card in one of the review modes a learner is asked it in, so a visitor sees what learning the deck is like. A picture mode goes first, while the card has a public picture; otherwise the preview steps through the card's modes by its place, so a deck asked both ways shows both. The cue sits above the rule, a picture at its own shape on the start edge, and what the learner recalls sits under it, as a turned card in review. The try-it card shows only the cue until it is turned, and the card list keeps the term readable beside the picture. Pronunciation has a named play control and never starts on its own.

Explore inside the product departs from this twice, each with its reason in [the feature's design](../explore.md#in-the-product): a tile there is a card rather than a group on the open canvas, because the Add button on it has to belong to something, and a deck's own page lays its colour under the whole header, with a hand of its cards in place of the tray and a white Add rather than amber.

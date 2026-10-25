# Surfaces

Light-theme surfaces use colour and thin borders for separation. Dark-theme panels add subtle shadows through shared utilities. Use texture only in the documented progress treatments below.

## Which background

| Element | Treatment |
| --- | --- |
| Page | `bg-canvas` |
| Desktop navigation | `bg-rail` |
| Native phone sheet | Platform glass, or `bg-sheet` on older iOS |
| Panel, card, grouped rows or filled control | `edge bg-plate` |
| Nested group, chip or track | `bg-plate-2` |
| Selected option inside a `plate-2` track | `bg-chosen` |
| Current rail row | `bg-rail-chosen edge-inset` |
| Empty content placeholder | No fill, dashed `border-edge-2` ([empty-states.md](empty-states.md)) |
| Published-deck preview on Explore | Deck tray, defined below |

```tsx
// Shared edge treatment adapts to both themes.
<section className="edge rounded-xl bg-plate p-5">…</section>
```

The rail has a thin border on its inner edge. Its tone differs from the canvas in each theme.

## Elevation

Use shared utilities rather than handwritten shadows.

| Surface | Light theme | Dark theme |
| --- | --- | --- |
| Page | `bg-canvas` | `bg-canvas` |
| Sheet fallback | Canvas tone, separated by a scrim | Lighter than canvas |
| Panel (`edge bg-plate`) | White with a thin border | Thin border and `--lift` shadow |
| Inset (`well`) | Inset border and top shading | Same treatment on a lighter fill |
| Selected option (`bg-chosen`) | White | Lighter warm grey than its track |
| Current rail row | Thin inset border | Thin inset border, without shadow |

Form fields clear `--lift` so they remain visually distinct from buttons. Unfilled controls, navigation and menu rows, chips and inset groups also have no elevation. Overlays own their borders and scrims ([overlays.md](overlays.md)).

### Hover

Filled interactive panels, secondary buttons and grades strengthen to `edge-2` and apply `veil` over their existing fill. List rows inside a panel also hover with `veil`.

Unfilled controls and items on `plate-2` use `bg-hover`. Do not use `plate-2` as their hover fill; it is indistinguishable from the light-theme rail. Rail rows use the separate states below.

### The rail’s rows

The current row uses `bg-rail-chosen edge-inset`; hover uses `bg-rail-hover`. Selection must remain stronger than hover. See [rail.md](rail.md#states) for both themes.

### The chosen option

Use `bg-chosen` for a selected option inside a `plate-2` track. `bg-plate` is darker than that track in dark theme and makes selection unclear.

## On glass

Native iOS 26 sheets, corner buttons and the tab bar use Liquid Glass without a background tint. The standing capture action keeps its amber tint, and peek sheets use frost ([phone.md](phone.md#sheets)). Content on glass uses `bg-glass-plate` and `bg-glass-chosen` without elevation. `OnGlass` in `apps/mobile/src/ui/surface.tsx` supplies these fills to `Plate`, `Segmented`, `Input` and field chips; every `Sheet` wraps its content in it.

Web `glass` is for menus, popovers, select and combobox lists, and pill navigation. It combines a nearly opaque panel, 12 px blur, top highlight, `edge-2` and shadow. Dialogs, drawers and side sheets remain opaque. Under reduced transparency or without `backdrop-filter`, use the opaque panel fallback.

Use `frost` for controls floating over scrolling text inside a panel, such as a hint offer: `plate-2` at 65%, 4 px blur, and no border, highlight or shadow. Clip the underlying scroller at the control’s bottom and omit its bottom fade so text cannot show in the inset below it. The reduced-transparency fallback is solid `plate-2`.

## Edges

`edge` draws a 1 px ring using box-shadow without changing dimensions. `edge-2` strengthens it on hover, and `edge-inset` draws inside the bounds when content reaches the edge. Use `border-edge` for dividers between rows. Focus adds the neutral 2 px `ring` outline. Forced-colour mode replaces the shadow with a system-colour outline.

In dark theme `edge` and `edge-2` include `--lift`; in light theme they do not. Form fields clear that elevation.

Pictures use `image-edge`, a neutral 1 px inset outline, black in light theme and white in dark theme. Apply it only to opaque pictures; transparent artwork keeps its shape without a rectangular frame.

An inset box-shadow may draw a stroke that a border cannot, such as a validation ring (`shadow-[0_0_0_1px_var(--danger)]`), calendar-day ring or overlay border. Use the shared utilities for blurred shadows.

## Sets

Group related panels with a heading and spacing, or place related rows in one panel. Today’s rounds, Library series and Activity days do not need an additional background container.

## Lit and set in

`well` draws an inset border and top shading for a track or unfilled progress area. `lit` adds a top highlight and subtle dark-theme glow to the fill. Use them for review progress, daily goals, seven-day indicators and the thirty-day strip. Review progress uses an ink fill and disables glow with `[--lit-glow:0_0_#0000]`.

Primary buttons use `key-light`, a subtle highlight without a border ridge or shadow.

## Radius

| Token | Radius |
| --- | --- |
| `rounded-xs` | 6 px |
| `rounded-sm` | 10 px |
| `rounded-md` | 14 px |
| `rounded-lg` | 18 px |
| `rounded-xl` | 22 px |
| `rounded-2xl` | 30 px |
| `rounded-full` | Fully rounded |

Controls use `md`, small buttons `sm`, panels and cards `xl`, grouped rows `md` or `lg`, and chips and round buttons `full`. Arbitrary radii are limited to illustrations. A control inset within a panel uses the panel radius minus the gap: an 8 px inset in a 22 px panel gives a 14 px `rounded-md` control.

## The glow

Apply `glow` only to `.lantern-light`, never the whole drawing. `lit` supplies the separate subtle glow on progress fills. [brand.md](brand.md) defines the mark and its state.

Background light is allowed on Today’s due panel (`lamplit`), review completion and Welcome (`LanternLight`), Explore’s search, shelf-page headings in their shelf colour, and public use-case hero scenes. These treatments respect reduced transparency. Review particles and the day-grid animation use the same glow.

Use gradients only for these background lights, app icons and link previews, and the shared `lit` and `key-light` utilities. Other surfaces have no decorative gradient, grain or noise.

## The deck tray

Explore previews a deck with a real card inside a rounded, coloured tray and the deck’s name below it. Show roughly two thirds of the card while keeping its meaning visible. Add one background sheet per additional card, up to two. Hover raises the card and spreads the sheets over 260 ms; reduced motion keeps them still.

`trayHue` in `packages/core` selects one of eight hues from the slug. All use the same lightness and chroma and exclude amber. This makes colour stable across filtering and catalogue growth, though adjacent decks can share a hue. `.deck-tray` in `packages/design/tray.css` is shared by site and product; the product uses `DeckTray`. In dark theme trays use lightness 0.30 and chroma 0.065, with cards at lightness 0.33.

The deck page reuses this hue behind its preview, across the full width, at lower chroma than the tile. The colour is computed from the slug rather than stored.

Published-card previews use the card’s review modes. Prefer a picture mode when a public picture exists; otherwise cycle through modes by card position. Show the cue above the divider and target below, with pictures at their natural aspect ratio aligned to the start edge. Trial reviews hide the target until reveal. Card lists retain the term beside the picture. Audio has a named control and starts only on request.

In the product, a tile wraps its preview, name and Add action in one panel. A deck page uses its colour across the header, preview cards and a white Add button ([explore.md](../explore.md#in-the-product)).

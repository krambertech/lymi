# @lymi/design

Tokens, motion and drawings that the web, the site and the phone all read. [DESIGN.md](../../DESIGN.md) owns how they look; this page records the decisions inside the code that the code itself cannot state.

## Generated files

`scripts/generate.mjs` reads `tokens.css` and `tray.css` and writes three files for consumers that cannot read CSS: `src/tokens.gen.ts` for the phone's SVG paint, native views and widgets, `uniwind.gen.css` for the phone's class names, and `apps/desktop/src/colours.gen.ts` for the Mac app's window colours. `scripts/check-design-docs.mjs` fails when any of them is stale; run the generator, or that script with `--write`, after changing a token.

- The colour parser reads only the forms `tokens.css` uses: `oklch()`, `var()`, a relative `oklch()` that lowers lightness, and `color-mix()` in oklab. It returns undefined for anything else.
- `color-mix()` mixes premultiplied colours, as the CSS spec does for translucent ones.
- A Tailwind alias in `@theme inline`, such as `grade-easy`, gets its own palette entry after the tokens, which keep declaration order.
- Shadows carry hex colours, because React Native's `boxShadow` cannot read `oklch()`.
- Script faces come from the `--face-<code>` tokens on `:root`, keyed by their ISO 15924 code in title case, such as `Jpan`.
- The deck hues hold `tray.css`'s eight hues per surface, by day and at night: a tile's tray (`.deck-tray`), a deck page's cover (`.deck-cover`), a shelf page's pool (`.shelf-hero::before`), and the night card inside a tray.

## The lantern

`src/lantern.ts` is the lantern as data in a 120 unit box, and the web, the site and the phone all draw it from there. The glass is opaque and the metal overlaps its edges, so the mark sits on any surface. There is no second cut for small sizes: without the rods and the flame it collapses into a mushroom by 24 px, so one drawing serves every size.

- `LANTERN_BOUNDS` is the drawing's real extent inside the box; the logo lockup measures from it.
- The streak's Flame crops the same drawing to `FLAME_BOUNDS`, so the mark and the streak flame cannot drift apart. `EMBER_AT_FLAME_SIZE` scales the ember about its base to the flame's height there, where the lantern's ember would be a speck.
- The flame's core flickers about `FLAME_CORE_BASE`; the outer flame grows from the bottom of `FLAME_BOUNDS`.
- The bail draws behind the hood so the two never merge into one blob. `Shape.round` rounds a filled path's outline, which gives the hood its corners.
- Embers leave from `VENT` at the top of the hood, where a real lantern vents.

## The flame

`src/flame.ts` sizes the flame from a day's progress. Size 0 is out and 1 is the brand flame.

- The flame is out only with no streak and no review yet today, so the first review lights it. Today's attempts then grow it to full at the goal.
- Growth before the goal stops short of full, so reaching the goal is a rise of its own. Growth is eased (`progress ** 0.75`), so the first reviews of a day show more than the last ones before the goal.
- A day that met its goal or ran out of cards counts as full.
- `LanternDay` is the smallest day shape the flame reads, so the phone can build it from its own store.
- The streak pill and modal take their flame from `lanternFor`, so it is out, lit or full exactly when the lantern is; only the growth between reviews is left out. The streak flame is the brand flame while lit and the lantern's full size once the goal is met.
- `FLAME_BREATH.feed` is the breath for one review and `rise` the breath for reaching the goal. Each grade throws one `FLAME_SPARKS` set from the hood, with drift in the 120 unit box, delay in ms and a size in px that holds at any lantern size. Grades take the sets in turn, so a run never repeats one picture.

## The seven lights

`src/lights.ts` draws the last seven days as small lantern glasses, each at level 0 to 3 in `--lit-low`, `--lit-high` and `--amber`; [streak.md](../../docs/design/streak.md) owns the behaviour.

- A day that counted toward a streak is full.
- A day with a goal reaches level 2 at half its own goal, so lowering today's goal never rewrites how an earlier day looks.
- A day without a goal is measured against the week's busiest day with a floor of 10, so a quiet week does not look heavy and one big day does not wash out the rest.

## The end of a review

`src/ending.ts` holds one sequence that the web and the phone play from the same numbers; [motion.md](../../docs/design/system/motion.md#the-end-of-a-review) describes it. Times are in ms after the last grade, distances in px.

- When the day has just turned, a spark leaves the flame (`END_OF_REVIEW.spark`), lands and fills today's light (`land`), then a smaller one hops to the run's flame (`hop`), which catches as the run ticks (`tick`). The spark starts slow, is quick through the middle and settles into the light; its trail is `SPARK_TRAIL.dots` dots, each `SPARK_TRAIL.step` ms behind the last.
- `sparkAt` takes an already eased `t` from 0 to 1 and follows a curve leaning `bend` px toward the end edge: positive swings out and drops into the light, negative arcs up over the gap.
- An end throws about 3 embers for one review, 14 for a goal's worth and 20 at most, interpolated linearly by the share of the goal added. The last ember leaves within 1400 ms however many there are. An ember drifts fast off the flame and slows as it fades.
- As the spark lands, today's light throws flecks fanned upward: small tumbling rectangles that glow for `FLECK_HOT_MS` and then go flat. Tone 1 and 2 are the light's middle steps, 3 the flame's white. They fall at `FLECK_GRAVITY` px/s² and slow at `FLECK_DRAG` a second.
- The pool of light blooms over `POOL_BLOOM_MS`, then breathes on the flicker's loop. The count rolls quickly at first and settles on the day's number.

## Motion presets

`src/motion.ts` keeps the presets in Motion's shape. The web passes them straight through and the phone converts them for Reanimated; [motion.md](../../docs/design/system/motion.md) says where each is used.

- A spring gives `visualDuration`, when it looks settled, or `duration`, when it stops. Reanimated has only a perceptual duration, so the phone reads either as that.
- Every flame movement lives in `FLAME_MOTION`, so the app and the design system pages read the same numbers.

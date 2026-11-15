# Brand

Lymi’s name is associated with illuminating what you learn. The storm lantern is the brand symbol. In the signed-in app its flame also shows today’s review progress. Public pages, sign-in and app icons use a fixed brand flame without learner state. Keep the name’s origin and the symbol’s rationale here; describe features elsewhere in ordinary product terms.

## Choose the mark

| Location | Mark |
| --- | --- |
| Sign-in, app icon, public pages, empty states | Brand lantern without progress |
| Welcome’s first screen | Brand lantern with a single lighting animation |
| Today’s due panel, review header, review completion | `Lantern` with `lanternFor(streak)` |
| Beside a streak number | `Flame` with `streakFlameFor(streak)` |
| Desktop rail | `AppTile` at 28 px and plain `Wordmark` |
| Phone tab header | `AppTile` at 40 px with an edge, without wordmark |
| Sign-in and app-store artwork | Lit `Wordmark` |
| Errors | `ErrorState`, without a brand mark |

Use the plain wordmark whenever the lantern is also visible. The standalone streak flame is a status component and can appear beside the lantern.

## Lantern drawing

`packages/design/src/lantern.ts` owns the geometry used by web, site and phone. It uses a 120-unit viewBox with a handle, pivots, hood, side rods, glass and base. Keep the complete drawing at every size; the rods and flame preserve recognition at small sizes. The favicon uses the same drawing with a square viewBox around its bounds.

- Metal uses `lantern-metal`: dark in light theme and ivory in dark theme.
- Glass uses the opaque `lantern-glass` token. Metal overlaps its edges to contain the fill.
- An unlit lantern uses `lantern-glass-unlit` and an ember in `edge-strong`.
- Preserve the shared geometry and flat treatment. Do not add an outline, bevel, translucent glass, extra flame or background fill inside the mark. Rotation is limited to the shared launch and pull-to-refresh animation below.

## Review progress

`lanternFor` in `@lymi/design` maps a streak summary to `Lantern` props. `progress` is today’s accepted reviews divided by the daily goal; `fed` increases with every accepted review.

The flame is out only when there is no current streak and no accepted review today. A live streak starts the day lit. The first accepted review lights an unlit flame, and subsequent reviews increase its size. Forgot and Easy contribute equally. A confirmed nothing-due day keeps the start-of-day flame lit without increasing progress. Ending a review or leaving the day unfinished does not extinguish it.

The flame starts at 0.72× brand size and grows to 1.02× just below the goal. Reaching the goal increases it to 1.16× for the rest of the day. Height carries the full scale change; width changes at half that rate. Halo width grows from 0.7× to 1.7× brand width.

Each accepted review animates the flame and halo, then settles at the new size. Consecutive animations continue from their current position. Two or three amber particles also rise from the hood, with a fixed 2.5–3.5 px size independent of lantern size. Grades cycle through three particle sets, with at most three visible sets at once. These animations never delay the next card.

The brand lantern omits `progress` and uses the fixed brand flame. The Lantern page of `/design` demonstrates both versions.

## Flame

`Flame` in `components/flame.tsx` appears beside the streak number at 16–44 px. `streakFlameFor` selects three states:

- **Out:** no streak and no reviews today; show an ember scaled to remain visible.
- **Lit:** a live streak or at least one review today, before the goal is satisfied; hold the brand flame still.
- **Full:** the goal is met or all available reviews are complete; use 1.16× brand size with flicker.

The component crops its viewBox to the flame’s bounds and allows visual overflow so growth does not clip the tip. It has no intermediate progress sizes. Particles belong to the lantern, except in the completion sequence that first satisfies the day ([motion.md](motion.md#the-end-of-a-review)).

## How the flame moves

Shared values live in `FLAME_MOTION` in `@lymi/design`. Flicker uses a 2.6 s loop for the flame, core and halo, scaled relative to the current progress size. Pause continuous animation while off screen. Springs preserve velocity when interrupted.

| Change | Timing |
| --- | --- |
| Settle after a review | 900 ms |
| Review pulse | 280 ms in, 900 ms out |
| Goal reached | 1.4 s, pulse at 1.6× depth |
| Unlit to lit | 700 ms, bounce 0.12 |
| Lit to unlit | 1.6 s |
| Particles | 620 ms spring and fade, with the second and third delayed 50–120 ms |

`Flame` uses the same state-transition springs. Under reduced motion, apply the new size and halo immediately, without flicker or particles. Keep the background light’s size and colour fixed within each theme; only the flame changes with progress.

At app launch and on pull to refresh, the lantern body rotates ±5° around the handle pivot while the handle counters at ∓3.5°. Use the shared animation rather than adding rotations at call sites.

## Wordmark

`Wordmark` in `components/logo.tsx` renders lowercase `lymi` from `components/wordmark-paths.ts`: Onest 600 with −0.025em tracking, generated with fontTools. The lit version replaces the i’s dot with a flame. Use it for sign-in and app-store artwork; use the plain version elsewhere.

`Lockup` places a 1.30em lantern 0.17em before the word, with its base on the baseline and handle just above the l. There is no stacked version. Clear space is half a lantern on every side. The rail uses `AppTile` and the wordmark rather than this lockup.

## App icon and link preview

The app icon uses the dark canvas, ivory metal and a lit brand flame. Regenerate `apps/web/public/brand/` with `node scripts/brand.mjs && sh scripts/icons.sh`.

`apps/site/public/share.png` is 1200 × 630, with the lit row lockup and “Keep what you learn.” centred within the middle 630 px so square crops retain the artwork.

Use the standard typeface and brand assets. Reserve the sparkle icon for the AI badge and omit confetti.

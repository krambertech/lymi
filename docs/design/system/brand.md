# Brand: the lantern, the flame and the wordmark

Lymi is cut from *lyhty*, the Finnish word for lantern. The symbol is a storm lantern, the kind you carry. Its flame is the continuity of remembering: small at the start of a day, a little taller with every review, full when the daily goal is reached, and out only when the streak breaks.

## Which mark

```text
Where does it go?
 ├── Login, the app icon, public pages, an empty screen → Lantern with no progress (the brand lantern)
 ├── Today's due card, the review header, the end of a review → Lantern with lanternFor(streak)
 ├── Beside the streak number (the streak pill, the streak modal) → Flame with streakFlameFor(streak)
 ├── The rail's top line → AppTile at 28 px beside the plain Wordmark
 ├── A phone tab's top bar → AppTile at 40 px with an edge, no wordmark
 ├── The login screen, the app store → the lit Wordmark
 └── An error → no mark at all; ErrorState
```

## The lantern

Drawn in a 120 unit box. Top to bottom: a bail tall enough to read as a handle rather than a keyring, turning on two visible pivots; a hood that flares wide over the glass; two rods down the sides; the glass itself; a fount on a foot. The flare, the rods and the pivots are what make it a lantern. Without them the silhouette is a battery.

- The metal is `metal`, which is the text colour of the room: ink by day, white at night. Never grey.
- The glass is one **opaque** colour, `glass`, not a tint over a hole. A translucent glass needs a backer in the room's colour, and then the mark drags a pale slab onto any surface that is not the page background. Every metal part overlaps the glass edges, so nothing can spill outside the frame.
- When the flame is out, the glass is `glass-unlit` and an ember in `edge-2` sits where the flame was.
- There is one drawing for every size. The rods and the flame are what keep the drawing legible when it is tiny; a simplified cut that drops them collapses into a mushroom by 24 px. The browser tab uses the same drawing with the viewBox squared around its own bounds.

The geometry lives in `components/lantern-geometry.tsx` and nowhere else. `Lantern`, `Lockup` and `scripts/brand.mjs` all draw from it, so the mark cannot drift between the app and its assets.

Never: grey metal, translucent glass, a room colour painted inside the mark, an outline, a rotation, a bevel, a second illustration, or two flames in one mark. If the lantern is on the screen, the wordmark is plain.

## What the lantern's flame shows

The flame shows how far today has come. **Whether the streak is alive is the number's job, never the flame's.**

- It is out only when there is no streak and no review yet today: a new learner, or the morning after a day that ended short of its goal.
- The first accepted review lights it small, it grows through the day, and it is full at the goal. A live streak keeps its flame lit from the start of the day.
- Nothing due, an ended session and an unfinished morning never put it out. A confirmed nothing-due day holds the start-of-day flame: alive, not grown.

`Lantern` takes facts and moves itself: `progress` is today's accepted reviews over the daily goal, `out` is no streak and no review yet today, and `fed` goes up by one for every accepted review. `lanternFor` in `lib/flame.ts` turns the streak summary into those props. A screen never asks the lantern to celebrate.

While lit, the flame is one continuous size. It starts each day at 0.72× the brand flame and grows with progress to 1.02× just before the goal; height carries the growth and width follows at half the rate. Growth stops short of full so that reaching the goal is a rise of its own, to 1.16×, where the flame stays for the rest of the day. The halo's width follows, from 0.7× the brand halo to 1.7× at the goal.

Every accepted review feeds the flame, and Forgot feeds it exactly as Easy does. A feed is a breath: the flame draws up and thin and the halo swells, then both settle at the new size. Reviews close together flow into one long breath, because each breath starts from wherever the last one is.

A breath alone is too quiet to see at 44 px while the eye is on the card, so every feed also throws a spark: two or three amber embers leave the top of the hood and drift up past the bail as they fade. They are drawn over the metal and hold their pixel size, 2.5 to 3.5 px, at any lantern size. Grades take three sets of embers in turn, and at most three sets are in the air at once. The spark never delays the next card.

The brand lantern omits `progress` and shows the one canonical flame. It never shows a learner's state. The live version, with a day to play through, is the Lantern page of `/design`.

## Flame

`Flame` in `components/flame.tsx` is the flame on its own, beside the streak number, at 16 to 44 px. It says out, lit or full, in the lantern's words; it is not a gauge, a progress ring, a celebration or a brand mark. It has three states and nothing between them, because growth between reviews would be unreadable at 16 px and restless on a mark that is on every screen:

- **Out** under the same conditions as the lantern. It shows the lantern's ember scaled to the flame's height, because the ember as drawn is a speck at this size.
- **Lit** from the first review of the day until the goal, or all day on a live streak, including a day with nothing due: the brand flame, held still.
- **Full** once today's goal is met or every available review is done: 1.16× the brand flame, and flickering.

`streakFlameFor` in `lib/flame.ts` reads the state from the streak summary. `Flame` crops to the flame's exact bounds, so its tip sits on the top edge of its box and a full or flickering flame grows past it. The drawing overflows its box rather than being cropped, because a clipped tip is the one thing that makes the mark look broken. It never sparks; the spark belongs to the lantern. The streak's flame is a component, not a second mark, and may sit on a screen the lantern is already on.

## How the flame moves

The flame flickers on a 2.6 s loop, and three things move on that loop: the flame scales, the bright core beats slightly out of phase inside it, and the halo breathes with both. A flame that changes size under a still halo reads as fake. The flicker multiplies whatever size the flame has, so a small flame flickers small.

Its changes are springs from Motion, so an interrupted movement keeps its speed instead of starting over. The values live in `FLAME_MOTION` in `lib/flame.ts`, and the design system reads them from there.

| Change | Timing |
| --- | --- |
| Settle after a review | 900 ms |
| Breath | 280 ms in, 900 ms out |
| Rise at the goal | 1.4 s, a breath 1.6 times as deep |
| Catch from out | 700 ms, bounce 0.12, the one overshoot |
| Going out | 1.6 s, so it reads as a fire dying down |
| Spark | embers on a 620 ms spring, fading over 620 ms, the second and third 50–120 ms after the first |

`Flame` uses the same springs: out to lit is the catch, lit to full the rise, full to lit a settle, lit to out the going out. Under reduced motion it jumps to the new state without flickering, and the three states still read apart.

Carried, the lantern swings from the bail at app launch and on pull to refresh: the body rocks ±5° from the bail's pivot while the bail counters at ∓3.5°.

## Wordmark and lockups

`lymi`, lowercase, Onest 600, tracked −0.025em, drawn as paths (`components/wordmark-paths.ts`, generated with fontTools) and rendered by `Wordmark` in `components/logo.tsx`. The lit wordmark replaces the dot of the i with a flame: use it on the login screen and the app store, and the plain one everywhere else.

- In the rail the mark is `AppTile` at 28 px with the plain wordmark beside it, not the row lockup: the tile gives the mark its own surface, and it is the same picture the learner taps on their home screen.
- The row lockup (`Lockup`): the lantern is 1.30em tall, its foot on the baseline and its bail just above the l, 0.17em before the word. There is no stacked lockup.
- Clear space is half a lantern on every side.

## App icon and link preview

The app icon is always the dark room: ivory lantern, lit and glowing, on the dark canvas. Assets are in `apps/web/public/brand/` and regenerate with `node scripts/brand.mjs && sh scripts/icons.sh`.

The link preview, `apps/site/public/share.png`, is the app icon's room widened to 1200 × 630: the lit row lockup over “Keep what you learn.” in the same warm centre. Everything sits in the middle 630 px, so an app that crops the preview to a square keeps the whole picture.

No display serif, no sparkle icon outside the AI badge, no confetti.

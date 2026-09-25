# Colour

Warm neutrals, nearly grey, with amber as the only saturated accent. Amber is the colour that means act; every other hue describes and never asks.

## Use a token, never a value

**Components use the semantic tokens through Tailwind (`bg-plate`, `text-text-2`, `border-edge`), never a raw hex, an `oklch()` value or a stock Tailwind colour.** Dark mode is a separate warm palette rather than an inversion, so a raw value is right in one room and wrong in the other. The values live in `apps/web/src/client/styles.css`, mirrored in `apps/site/src/styles.css`; DESIGN.md's frontmatter is generated from them, and `pnpm check:design` fails when either copy drifts.

```tsx
// Correct
<p className="text-sm text-muted">{t`Due tomorrow`}</p>

// Incorrect: right by day, unreadable at night
<p className="text-sm text-[#72665f]">{t`Due tomorrow`}</p>
<p className="text-sm text-stone-500">{t`Due tomorrow`}</p>
```

The one exception is a third party's own mark, which keeps its brand colours: `GoogleMark` and the brand colour of each connected app in `AppMark`.

Dark is not inverted light: the plate is lighter than the canvas in both rooms. Surfaces and their tokens are in [surfaces.md](surfaces.md).

## Which text colour

Text on canvas meets 4.5:1 in both rooms, `muted` included.

```text
Is it text on a coloured fill?
 ├── On amber → text-amber-ink
 ├── On a due count's tint → the DueCount component, never by hand
 ├── On the toast, which is the text colour → text-canvas; its action is text-toast-action
 └── No
      ├── An error → text-danger
      ├── A success → text-good
      ├── The term, a title, anything the screen is about → text-text
      ├── Supporting prose, a secondary label, a ghost button → text-text-2
      ├── Metadata, a hint, a unit, a timestamp → text-muted
      └── Decoration that is not a word (a chevron, a separator dot) → text-faint
```

`faint` is decorative and never carries words, because it fails 4.5:1.

## Amber means act

Amber has exactly these uses. Anything not on the list stays neutral.

1. The flame, in the lantern and in `Flame`.
2. The one thing to press on the page: `Button variant="primary"`.
3. The capture button, which is the app's standing action rather than the page's.
4. A due count, as `DueCount`: the number in ink on `amber-tint`, never amber text, which by day has to darken to brown to be readable.
5. A day the learner reviewed: the seven lights, the streak modal's month and goal track, the thirty-day strip and the Insights day grid. It is the same lit glass at every size, which makes it the flame rather than a sixth thing.
6. The Easy grade's icon, `text-grade-easy`, which is `amber-text`.

A checkbox or switch is amber when checked; that is the control confirming a press, not a new accent. A status chip repeated down a list, as `StateChip` down a deck table or due counts down Library, is one decision shown many times, not many uses of amber.

Never amber for: a selected state (a chosen chip is ink, see [chips-and-marks.md](chips-and-marks.md)), a tray, a heading, a link, or decoration.

## Card states

Each card state has one colour and one icon, the same everywhere a state shows:

| State | Token | Icon |
| --- | --- | --- |
| New | `state-new` | grey dashed circle |
| Learning | `state-learning` | blue half circle |
| Known | `state-known` | green check circle |

They come from `stateMarks` and `StateIcon` in `components/state-mark.tsx`, which also hold the state words, so New, Learning and Known are written once. Never draw a state mark by hand.

The icon, in its colour, marks the counts on a deck's split plate, the deck's filter menu, each word in a deck's list, every state chip, the chips under Insights' Cards bar and the New cards tile on Today. That bar is the one place the colour stands alone, because a segment cannot hold an icon and the chips under it name each state. A deck carries no stripe: its split is the counts on its plate.

Text stays ink: a state chip is a plain `plate-2` chip, and the colour lives on its icon. Each mark holds 3:1 against `plate-2`, the lightest ground a mark sits on, in both rooms. By day the marks are lighter than their text colours would be: Known is a brighter green than `good`, which also colours words and has to hold 4.5:1; in the dark room Known is `good`.

Learning is blue because blue is furthest from amber, `danger` and `good`, so a state never reads as something to press or as an error, and blue and green stay apart for red-green colour blindness. Never make a state amber or mustard: beside amber it reads as dirty orange. `state-learning-soft` and `state-learning-text` are for the site's scheduling figures only.

## Grades

Forgot is a grade, not a state. Its mark is the red turn-back arrow wherever it shows: the Forgot grade, the Forgot today tile, Review forgotten at the end of a review, and the chip on a relearning card under review, which says **Forgotten recently** rather than the schedule's name for it. Everywhere else relearning is Learning, because a lapse on a word's schedule table may be months old.

The grade icons use `grade-forgot` (`danger`), `grade-hard` (`muted`), `grade-good` (`good`) and `grade-easy` (`amber-text`), from `GRADES` in `components/grade.tsx`.

## What the AI wrote

What the AI wrote is the fourth mark, and the one hue outside the states. A meaning, example or pronunciation it filled carries `ai`, a violet badge of the sparkle and the word AI, beside the field's label rather than at the far edge of the panel. It is `SourceChip compact` in `components/chip.tsx`.

**The badge marks the AI and nothing else.** The learner's own words and the lesson's carry no badge, and that silence is what makes the violet one carry. Violet is the last hue that is not amber, a card state or `danger`, so the badge reads as "not from you or the lesson" without reading as act, progress or error. The colour lives on the badge alone: enriched text is ordinary text, because the learner is meant to read the meaning, not the label.

## Status is never colour alone

New, Learning and Known carry an icon and a word. Errors carry an icon. The AI badge carries its mark and its word too, and the whole sentence as its accessible name, because two letters are not a sentence.

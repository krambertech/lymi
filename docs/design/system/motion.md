# Motion

Motion conveys state. Every movement answers something the learner did or shows something that changed; nothing moves for decoration. Overlay motion is in [overlays.md](overlays.md#how-overlays-move), and the flame's in [brand.md](brand.md#how-the-flame-moves).

## Timing

| Movement | Duration | Curve |
| --- | --- | --- |
| Press, hover | 150 ms | `ease-out` |
| A card or plate arriving | 6 px rise, 200 ms | `ease-out` |
| Tooltip | 120 ms in, 80 out | `ease-out` |
| Menu on a desktop | 140 ms in, 100 out | `ease-out` |
| Dialog | 200 ms in, 140 out | `ease-out` |
| Drawer | 450 ms in, up to 320 out | `ease-drawer` |
| Segmented and pill plate | about 340 ms | spring, a trace of overshoot |
| Toast | 500 ms | shadcn's ease-out-expo |

Use `ease-out` (`--ease-out`) for anything that enters or answers an input, `ease-drawer` for a drawer, and `ease-in-out` only for a loop such as the flicker or the skeleton's shimmer. **Anything that leaves is faster than it arrived.**

```tsx
// Correct
className="transition-[background-color,scale] duration-150 ease-out active:scale-[0.97]"

// Incorrect: animates every property, including layout, with a curve that starts slow
className="transition-all duration-300 ease-in"
```

Name the properties a transition animates; never `transition-all`. Prefer `transform`, `opacity`, colours and `filter`. Animate height only with Motion's `height: "auto"`, for something that opens in place and pushes the content under it: the grade strip, a card form's extra fields, an Activity entry. A bar that fills, such as section progress, may animate its width.

## Press

Press scales over 150 ms. Nothing lifts.

| Control | Scale |
| --- | --- |
| Buttons, segments, the pill nav, back, new-card rows | 0.97 |
| Deck cards, New deck | 0.98 |
| Grade buttons | 0.96 |
| Direction rows | 0.99 |
| Menu rows, rail rows | none |

## Hover

Hover lasts 150 ms and applies to pointer devices only, through the `hoverable:` variant.

In a menu or a list of options the hover is one fill that slides to the nearest enabled row over those 150 ms, so it never blinks off in the gap between rows and never crosses a separator. The moment the keyboard takes over it goes, because focus carries its own fill and two fills would be two cursors.

## Choices

The chosen plate of a segmented control and of the pill nav springs to the new option in about 340 ms with a trace of overshoot, so the choice reads as one thing moving rather than two things blinking. Chosen from the keyboard, it jumps.

A choice control answers the press it was given:

- a checkbox gives a little as the fill lands and the tick draws across;
- a radio's dot swells past its size and settles;
- a held switch thumb stretches toward the end it is leaving for, then springs across when let go.

Those share one set of springs in `lib/choice-motion.ts`, and each leaves faster than it arrives. A control's own mark still moves when a key changes it, because the mark is the answer to the key; the segmented plate travels across the interface, so for a key it jumps.

## The keyboard does not animate

Keyboard-initiated actions do not animate the interface they change: a card graded from the keyboard arrives at once, with no closing strip and no fade. The flame is the exception, because it is not the interface responding to a key but the fire being fed, and it never delays the next card. The theme switch suspends transitions for one frame so the room swaps at once.

## Review

Reveal is the one choreographed moment of a card, built with Motion.

1. Before reveal there is no grade strip and the card takes the room. An unrevealed card is the word alone.
2. On reveal the word glides up to make room over 340 ms, and the strip opens over the same 340 ms while the card shrinks, so the glide and the shrink read as one movement.
3. The rule draws across from the start edge over 360 ms.
4. The meaning, example and sources rise 10 px out of a 4 px blur over 260 ms, 50 ms apart.
5. The four grade controls rise 10 px over 220 ms, 35 ms apart, starting 80 ms after the strip begins to open.

A grade plays it backwards: the strip closes over 300 ms, its grades fading in the first 120, and the card grows back into the room while the next card's words fade in over 160 ms. The card is not replaced, because its place on the screen is the same; only what it asks changes. The next card never waits for the server: the grade is kept on the device and sent behind it. The session count rolls up as each card lands.

A hint at the card's foot, a pointing hand that taps three times and rests with a line under it saying how to reveal, appears in two cases only: after a second on each of a learner's first three cards, and after a minute on any card with no press, key or scroll.

A pronunciation that fails to play turns its button red, shakes it once over 400 ms, and says why in a tip over the button that leaves after four seconds or at the next tap. Nothing is added under the card, so the layout never moves for an error.

## The end of a review

The end of a review is the other choreographed moment, and the one place the interface celebrates, because it is where the day lands. It plays as one sequence over about two seconds:

| At | What happens |
| --- | --- |
| 0 | The last card steps back 8 px, to 0.98, over 200 ms, while the lantern leaves the header for the middle of the screen on a 600 ms spring and rises to full on the way. |
| 280 ms | The lantern lights the room: a pool of its glow blooms behind it over 1.6 s, then breathes on the flicker's loop. Embers lift off the flame once, as many as the review earned: 3 for one review, 14 for a goal's worth, 20 at most. |
| 640 ms | The heading rises out of a blur. |
| 820 ms | The count rises and rolls up from where the last end left the day. |
| 1.18 s | The seven lights switch on, 70 ms apart. |
| 1.78 s | When the day has just turned, today's light fills with a brief flare of the glow, and the run ticks. |
| 2 s | The ways on arrive, 90 ms apart. |

The first tap or key finishes the sequence at once, so it is never a wait. Choosing Continue or Review forgotten carries the lantern back to the header.

## The auth connection

The auth screens have one moving part, `Connection`. The app that asked and the lantern sit in matching tiles joined by a rail, dotted while the decision is open. When the grant lands the rail draws across in amber over 420 ms and the flame rises 300 ms in, so the two read as one movement. A refusal leaves the rail dotted and the flame goes out. Nothing else on those screens animates.

## Reduced motion

Every animation ships a reduced version. Under `prefers-reduced-motion`:

- reveal, completion, a card, a toast, the spinner and the phone drawer crossfade with no travel, and the grade strip closes at once;
- the lantern does not travel at the end of a review, there are no embers or breathing, and the screen crossfades with its final numbers in place;
- the flame holds still and takes each new size at once, with no breath and no spark;
- the pointing hand appears without tapping;
- the list hover fades in on the row under the pointer instead of sliding;
- a segmented plate fades in at its new option, a switch thumb takes its new place at once, and a radio dot and a tick fade in where they are;
- the skeleton stops shimmering;
- the auth rail is simply filled.

The glow stays, because a glow is a state, not a movement.

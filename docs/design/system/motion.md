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
| Chips under a sheet that opens over them | 160 ms out together; back one after another, 220 ms each, 30 ms apart, rising 8 px | `ease-out` |
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

On the phone, a sheet that changes height while it is open glides to the new height on iOS's own sheet spring, so a ticked tag, an error line under a field or the streak rising to full height before its goal's sheet never makes it jump. It opens at its height without a glide, and a row sheet follows a moving keyboard frame by frame instead. The patches that do this are described in [phone.md](phone.md#sheets).

## Press

Press scales over 150 ms. Nothing moves up on press.

| Control | Scale |
| --- | --- |
| Buttons, segments, the pill nav, back, new-card rows | 0.97 |
| Deck cards, New deck | 0.98 |
| Grade buttons | 0.96 |
| Direction rows | 0.99 |
| Menu rows, rail rows | none: they answer with the hover fill |

## Hover

Hover lasts 150 ms and applies to pointer devices only, through the `hoverable:` variant.

In a menu, a list of options and the rail the hover is one fill that slides to the nearest enabled row over those 150 ms, so it never blinks off in the gap between rows. It never slides across a separator or a heading: past one, it fades in at the new row instead, because a fill passing over a heading reads as a flash. The moment the keyboard takes over it goes, because focus carries its own fill and two fills would be two cursors. In the rail the fill passes under the current row, whose own fill is opaque, so hover never outranks where the learner is ([rail.md](rail.md#hover)).

## Choices

The chosen plate of a segmented control and of the pill nav springs to the new option in about 340 ms with a trace of overshoot, so the choice reads as one thing moving rather than two things blinking. Chosen from the keyboard, it jumps.

A choice control answers the press it was given:

- a checkbox gives a little as the fill lands and the tick draws across;
- a radio's dot swells past its size and settles;
- a held switch thumb stretches toward the end it is leaving for, then springs across when let go.

Those share one set of springs, the `CHOICE_` presets in `@lymi/design`, and each leaves faster than it arrives. A control's own mark still moves when a key changes it, because the mark is the answer to the key; the segmented plate travels across the interface, so for a key it jumps.

## The keyboard does not animate

Keyboard-initiated actions do not animate the interface they change: a card graded from the keyboard arrives at once, with no closing strip and no fade. The flame is the exception, because it is not the interface responding to a key but the fire being fed, and it never delays the next card. The theme switch suspends transitions for one frame so the room swaps at once.

## Review

Reveal is the one choreographed moment of a card, built with Motion.

1. Before reveal there is no grade strip and the card takes the room. An unrevealed card is the word alone.
2. On reveal the word glides up to make room over 340 ms, and the strip opens over the same 340 ms while the card shrinks, so the glide and the shrink read as one movement.
3. The rule draws across from the start edge over 360 ms as a line of the lantern's light, in `amber` with its glow, then cools to `edge-2` over the next 700 ms. This is the wick. On the phone it draws in `edge-2` from the start, with no amber. Under reduced motion the rule appears as a hairline.
4. The meaning, example and sources rise 10 px out of a 4 px blur over 260 ms, 50 ms apart.
5. The four grade controls rise 10 px over 220 ms, 35 ms apart, starting 80 ms after the strip begins to open.

A grade plays it backwards: the strip closes over 300 ms, its grades fading in the first 120, and the card grows back into the room while the next card's words fade in over 160 ms. The card is not replaced, because its place on the screen is the same; only what it asks changes. The next card never waits for the server: the grade is kept on the device and sent behind it. The session count rolls up as each card lands.

The hook offer at the card's foot arrives half a second after the answer settles, with a card's 6 px rise over 200 ms and its icon scaling in from 0.85; under reduced motion it only fades, and after a reveal from the keyboard it appears without moving. It cannot be pressed until it has arrived. Left for later, it fades out over 140 ms, at once under reduced motion, and keeps its room until the grade so the answer never moves.

A peeked hook comes into focus under the cue: it fades in from a 4 px blur with a 4 px rise over 360 ms while the cue glides up to make room. Under reduced motion it only fades; from the keyboard, Enter on the button included, it appears at once. The button that asked for it goes without animating and keeps its room, because the hook is the change to watch. At the reveal the hook never fades or moves apart from the cue: it glides up with it as one block, and the only thing arriving is the answer under it.

After a reveal without a peek, Show hook arrives in the hook's place with the answer's lines, a 10 px rise over 260 ms; under reduced motion it only fades, and after a reveal from the keyboard it is simply there. Pressing it swaps it for the hook with the same focus-in as a peek, and the answer glides if the hook takes more room than the button did. From the keyboard the hook appears at once; under reduced motion it only fades. A hook written after the reveal arrives the same way.

Undo taking a hook away fades its lines where they stood over 140 ms while the cue and the answer glide back; after a key it goes at once. Whether the cue and the answer glide is decided at each change, never once per card, so a reveal from the keyboard on one card never stills the glide on the next.

The pointing hand at the card's foot taps three times and rests with a line under it saying how to reveal. Only an account that has reviewed on fewer than three days sees it, because a learner past that knows the card is the button, and it shows nothing while that history is unknown. Such an account sees it in two cases only: after a second on each of its first three cards on this device (on the phone, only the first card), and after a minute on any card with no press, key or scroll. `revealHintDelayMs` in `packages/client` holds the rule for both apps. On the phone it floats over the card's foot, so the cue never moves when it appears. On a card with a hook it rests higher for the whole card, clear of Peek at your hook, and after a peek its line says to tap the card when you have it.

A pronunciation that fails to play turns its button red, shakes it once over 400 ms, and says why in a tip over the button that leaves after four seconds or at the next tap. Nothing is added under the card, so the layout never moves for an error.

On the phone, while a pronunciation plays, its speaker's two waves light one after the other, outward, on a 900 ms loop, as iOS's own speaker does, and settle back whole over 140 ms when it stops (`SPEAKER_WAVES`). The web's speaker holds still.

Easy locked after a peek does not move, shake or change when pressed. A tap, a click or its key opens the same tip over it with the reason, which leaves after four seconds or at the next tap; hover names the reason in a tooltip, which stands aside while the tip shows.

## The end of a review

The end of a review is the other choreographed moment, and the one place the interface celebrates, because it is where the day lands. It plays as one sequence over about three seconds:

| At | What happens |
| --- | --- |
| 0 | The last card steps back 8 px, to 0.98, over 200 ms, while the lantern leaves the header for the middle of the screen on a 600 ms spring and rises to full on the way. |
| 280 ms | The lantern lights the room: a pool of its glow blooms behind it over 1.6 s and reaches the edges of the screen, or of the window behind the column on a desktop, then breathes on the flicker's loop. Embers lift off the flame once, as many as the review earned: 3 for one review, 14 for a goal's worth, 20 at most. |
| 640 ms | The heading rises out of a blur. |
| 820 ms | The count rises and rolls up from where the last end left the day. |
| 1.18 s | The seven lights switch on, 70 ms apart. |
| 1.5 s | When the day has just turned, a spark leaves the flame with a short trail and drops into today's light over 600 ms. |
| 2 s | The ways on arrive, 90 ms apart. |
| 2.1 s | The spark lands: today's light fills from where the day stood, flares with the lantern's glow, swells to 1.08 and throws ten flecks that tumble and fall away. |
| 2.26 s | A smaller spark hops from today's light on to the run's flame over 440 ms. |
| 2.7 s | The run's flame catches, swelling past its full size and back with three sparks off its tip, and the run rolls up by one, amber for a moment before it cools to its ink. |

The spark is the goal's one celebration: it plays once a day, on the review that turns the day, and joins the lantern, today's light and the run so the moment reads as one cause and effect. Its flecks are lit only for their first 200 ms and flat after, so the glow stays with the lantern. `END_OF_REVIEW`, `sparkAt` and `lightBurst` in `@lymi/design` hold the timings and the shapes both apps draw. The end shows once the last grade has reached the server, and the draw has been checked when the day ran out; until then the header holds where it was, so the wait never draws a loading card and the lantern leaves from its place. The first tap or key finishes the sequence at once, so it is never a wait. Choosing Continue or Review forgotten carries the lantern back to the header.

## Numbers

A count that changes in front of the learner rolls digit by digit, like a departure board, rather than snapping: the due count, the streak, today's reviews, and the count that ends a review. Each digit settles on a spring with a trace of overshoot, and a digit that does not change stays still. Under reduced motion the new number appears at once.

## The welcome

A new account's first screen lights the lantern once: it catches from its ember, its pool blooms and a few embers lift, then the welcome rises in. It is an arrival, not a celebration, so it plays once and never on a return. [onboarding.md](../onboarding.md) has the timings.

## Opening the phone app

A cold start picks up the launch screen's unlit lantern and lights it, in about a second:

| At | What happens |
| --- | --- |
| 40 ms | The flame catches from its ember on its 700 ms spring. |
| 100 ms | Its warm light floods the room from the lantern over 460 ms and stays while the screen underneath mounts. |
| 380 ms | Once that screen is ready, the lantern rises to its spot on the 600 ms flight spring, growing to its size there, and the flood draws back into the screen's own pool. The flame settles to the day's size on the way. |
| 560 ms | The room fades over to the screen underneath, by 940 ms. |
| 980 ms | The lantern underneath takes over in the same spot. |

The clock counts drawn frames rather than time, so a stall while the app mounts pauses the lantern instead of making it jump, and the lantern leaves the middle only once frames come on time. Everything moves inside Skia, in a window of its own over the app, because Reanimated holds back view transforms while React commits and the native stack mounts its screens over their siblings.

## The auth connection

The auth screens have one moving part, `Connection`. The app that asked and the lantern sit in matching tiles joined by a rail, dotted while the decision is open. When the grant lands the rail draws across in amber over 420 ms and the flame rises 300 ms in, so the two read as one movement. A refusal leaves the rail dotted and the flame goes out. Nothing else on those screens animates.

## Reduced motion

Every animation ships a reduced version. Under `prefers-reduced-motion`:

- reveal, completion, a card, a toast, the spinner and the phone drawer crossfade with no travel, and the grade strip closes at once;
- the lantern does not travel at the end of a review, there are no embers, spark, flecks or breathing, and the screen crossfades with its final numbers in place, today's light full and the run at its new number;
- the flame holds still and takes each new size at once, with no breath and no spark;
- the wick's rule appears as a hairline, and a rolling number shows its new value at once;
- the pointing hand appears without tapping;
- the speaker's waves hold still while a pronunciation plays;
- a phone sheet takes its new height at once;
- the list hover fades in on the row under the pointer instead of sliding;
- a segmented plate fades in at its new option, a switch thumb takes its new place at once, and a radio dot and a tick fade in where they are;
- the skeleton stops shimmering;
- the auth rail is simply filled;
- opening the phone app crossfades the launch screen into the first screen over 240 ms.

The glow stays, because a glow is a state, not a movement.

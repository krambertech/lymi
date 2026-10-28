# Motion

Use motion to acknowledge an action or explain a state change. [overlays.md](overlays.md#how-overlays-move) defines overlay behavior; [brand.md](brand.md#how-the-flame-moves) defines flame animation.

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

Menus, option lists and the rail use a single hover fill that slides to the nearest enabled row over 150 ms. Fade into a new row when crossing a heading or separator. Hide the pointer fill when keyboard focus takes over, preventing two highlighted rows. In the rail, the fill passes beneath the opaque selected row ([rail.md](rail.md#hover)).

## Choices

The selected background in Segmented and pill navigation springs between options using the Timing preset. Keyboard selection changes it immediately.

A choice control answers the press it was given:

- a checkbox gives a little as the fill lands and the tick draws across;
- a radio's dot swells past its size and settles;
- a held switch thumb stretches toward the end it is leaving for, then springs across when let go.

Those share one set of springs, the `CHOICE_` presets in `@lymi/design`, and each leaves faster than it arrives. A control's own mark still moves when a key changes it, because the mark is the answer to the key; the segmented plate travels across the interface, so for a key it jumps.

## The keyboard does not animate

Keyboard actions update the interface immediately. Keyboard grading skips the closing strip and next-card fade. Choice marks can still animate as specified above, and the flame’s progress animation runs independently without delaying review. Theme changes suspend transitions for one frame so colours change together.

## Review

Reveal is the one choreographed moment of a card, built with Motion.

1. Before reveal there is no grade strip and the card takes the room. An unrevealed card is the cue alone.
2. On reveal the cue glides up to make room over 340 ms, and the strip opens over the same 340 ms while the card shrinks, so the glide and the shrink read as one movement.
3. The rule draws across from the start edge over 360 ms as a line of the lantern's light, in `amber` with its glow, then cools to `edge-strong` over the next 700 ms. This is the reveal-divider animation. On the phone it draws in `edge-strong` from the start, with no amber.
4. The meaning, example and sources rise 10 px out of a 4 px blur over 260 ms, 50 ms apart.
5. The four grade controls rise 10 px over 220 ms, 35 ms apart, starting 80 ms after the strip begins to open.

After grading, close the strip over 300 ms and fade its controls in the first 120 ms. Expand the card as the next content fades in over 160 ms. Reuse the card container. Queue the grade on the device and send it in the background so advancing does not wait for the server. Update the header count with the next card.

The hint offer at the card's foot arrives half a second after the answer settles, with a card's 6 px rise over 200 ms and its icon scaling in from 0.85; under reduced motion it only fades, and after a reveal from the keyboard it appears without moving. It cannot be pressed until it has arrived. Left for later, it fades out over 140 ms, at once under reduced motion, and keeps its room until the grade so the answer never moves.

A peeked hint comes into focus under the cue: it fades in from a 4 px blur with a 4 px rise over 360 ms while the cue glides up to make room. Under reduced motion it only fades; from the keyboard, Enter on the button included, it appears at once. The button that asked for it goes without animating and keeps its room, because the hint is the change to watch. At the reveal the hint never fades or moves apart from the cue: it glides up with it as one block, and the only thing arriving is the answer under it.

After a reveal without a peek, Show hint arrives in the hint's place with the answer's lines, a 10 px rise over 260 ms; under reduced motion it only fades, and after a reveal from the keyboard it is simply there. Pressing it swaps it for the hint with the same focus-in as a peek, and the answer glides if the hint takes more room than the button did. From the keyboard the hint appears at once; under reduced motion it only fades. A hint written after the reveal arrives the same way.

Undo taking a hint away fades its lines where they stood over 140 ms while the cue and the answer glide back; after a key it goes at once. Whether the cue and the answer glide is decided at each change, never once per card, so a reveal from the keyboard on one card never stills the glide on the next.

The pointing hand at the card's foot taps three times and rests with a line under it saying how to reveal. Only an account that has reviewed on fewer than three days sees it, because a learner past that knows the card is the button, and it shows nothing while that history is unknown. Such an account sees it in two cases only: after a second on each of its first three cards on this device (on the phone, only the first card), and after a minute on any card with no press, key or scroll. `revealHintDelayMs` in `packages/client` holds the rule for both apps. On the phone it floats over the card's foot, so the cue never moves when it appears. On a card with a hint it rests higher for the whole card, clear of Peek at your hint, and after a peek its line says to tap the card when you have it.

A pronunciation that fails to play turns its button red, shakes it once over 400 ms, and says why in a tip over the button that leaves after four seconds or at the next tap. Nothing is added under the card, so the layout never moves for an error.

While a term or an example plays, its speaker's two waves light one after the other, outward, on a 900 ms loop, as iOS's own speaker does, and settle back whole over 140 ms when it stops (`SPEAKER_WAVES`), on the web and the phone. Nothing else changes while it plays: the example keeps its colour.

Easy locked after a peek does not move, shake or change when pressed. A tap, a click or its key opens the same tip over it with the reason, which leaves after four seconds or at the next tap; hover names the reason in a tooltip, which stands aside while the tip shows.

## The end of a review

Review completion uses a single sequence lasting about three seconds. It confirms the work completed and, when applicable, the day’s goal and streak change:

| At | What happens |
| --- | --- |
| 0 | The last card steps back 8 px, to 0.98, over 200 ms, while the lantern leaves the header for the middle of the screen on a 600 ms spring and rises to full on the way. |
| 280 ms | Background light expands behind the lantern over 1.6 s to the screen edges, or desktop window edges behind the column, then follows the flicker loop. Emit particles once: 3 for one review, 14 for a goal’s worth and at most 20. |
| 640 ms | The heading rises out of a blur. |
| 820 ms | The count rises and rolls up from where the last end left the day. |
| 1.18 s | The seven lights switch on, 70 ms apart. |
| 1.5 s | When the day has just turned, a spark leaves the flame with a short trail and drops into today's light over 600 ms. |
| 2 s | The action buttons appear, 90 ms apart. |
| 2.1 s | The spark lands: today's light fills from where the day stood, flares with the lantern's glow, swells to 1.08 and throws ten flecks that tumble and fall away. |
| 2.26 s | A smaller spark hops from today's light on to the run's flame over 440 ms. |
| 2.7 s | The run's flame catches, swelling past its full size and back with three sparks off its tip, and the run rolls up by one, amber for a moment before it cools to its ink. |

Play the goal-completion spark once per day, when review first satisfies the day. It connects the lantern, today’s indicator and streak count. Particle glow lasts 200 ms, then the particles use flat fills. Shared `END_OF_REVIEW`, `sparkAt` and `lightBurst` in `@lymi/design` define timing and geometry. Wait for the last grade to reach the server and, on exhaustion, for a successful draw check before showing completion. Keep the header stable during that wait. The first tap or key skips to the final state. Continue and Review forgotten return the lantern to the header.

## Numbers

Animate visible changes to due counts, streaks, today’s reviews and completion totals digit by digit. Use a spring with slight overshoot and leave unchanged digits still.

## The welcome

A new account's first screen lights the lantern once: it catches from its ember, its pool blooms and a few embers lift, then the welcome rises in. It is an arrival, not a celebration, so it plays once and never on a return. [onboarding.md](../onboarding.md) has the timings.

## Opening the phone app

A cold start picks up the launch screen's unlit lantern and lights it, in about a second:

| At | What happens |
| --- | --- |
| 40 ms | The flame catches from its ember on its 700 ms spring. |
| 100 ms | Background light expands from the lantern over 460 ms and stays while the destination mounts. |
| 380 ms | Once that screen is ready, the lantern rises to its spot on the 600 ms flight spring, growing to its size there, and the flood draws back into the screen's own pool. The flame settles to the day's size on the way. |
| 560 ms | Crossfade the launch background into the destination by 940 ms. |
| 980 ms | The lantern underneath takes over in the same spot. |

The clock counts drawn frames rather than time, so a stall while the app mounts pauses the lantern instead of making it jump, and the lantern leaves the middle only once frames come on time. Everything moves inside Skia, in a window of its own over the app, because Reanimated holds back view transforms while React commits and the native stack mounts its screens over their siblings.

## The auth connection

Auth screens use one animated component, `Connection`: the requesting app and lantern in matching tiles, joined by a dotted line while authorization is undecided. On grant, fill the line amber over 420 ms and increase the flame at 300 ms. On refusal, retain the dotted line and extinguish the flame. Other auth content stays still.

## Reduced motion

Every animation ships a reduced version. Under `prefers-reduced-motion`:

- reveal, completion, a card, a toast, the spinner and the phone drawer crossfade with no travel, and the grade strip closes at once;
- the lantern does not travel at the end of a review, there are no embers, spark, flecks or breathing, and the screen crossfades with its final numbers in place, today's light full and the run at its new number;
- the flame holds still and takes each new size at once, with no breath and no spark;
- the reveal divider appears as a thin line, and a rolling number shows its new value at once;
- the pointing hand appears without tapping;
- the speaker's waves hold still while a pronunciation plays;
- a phone sheet takes its new height at once;
- the list hover fades in on the row under the pointer instead of sliding;
- a segmented plate fades in at its new option, a switch thumb takes its new place at once, and a radio dot and a tick fade in where they are;
- the skeleton stops shimmering;
- the auth rail is simply filled;
- opening the phone app crossfades the launch screen into the first screen over 240 ms.

Reduced motion retains static background light and glow.

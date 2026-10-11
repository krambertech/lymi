---
status: accepted
date: 2026-10-11
decision: Light carries Lymi's character on every surface; the moments are in motion.md and brand.md, the light room's tone is open
---

# Lit design language

Lymi's interface is clean and calm but forgettable. The lantern, its one idea, sits at 44 px, the light room is the warm near-white every new app ships, and a touch never visibly reaches the flame. The apps people remember take one metaphor literally in one place: Flighty's departure board, Things' checkbox, Tide Guide's sky that follows the hour. For Lymi the metaphor is light. What the learner does feeds the flame, and the flame lights the room. This proposal applies to the web app, the phone app and the site together.

## Decided

Moved into the owning documents on 11 October 2026:

- **The wick.** On reveal the rule draws as a line of the lantern's light and cools to a hairline ([motion.md](../design/system/motion.md#review)).
- **Numbers roll.** Digit by digit, wherever a count changes in front of the learner ([motion.md](../design/system/motion.md#numbers)).
- **The end lights the room.** The light reaches the edges of the screen or window ([motion.md](../design/system/motion.md#the-end-of-a-review)).
- **The pool follows the hour.** It changes within the room the theme chose ([brand.md](../design/system/brand.md#how-the-flame-moves)).
- **Haptics and one sound.** On the phone; the sound plays only at the goal and one setting turns it off ([phone.md](../design/system/phone.md)).
- **The tilt highlight.** Today's big lantern, on the phone only.

Declined: an ember that travels from the pressed grade to the lantern, which was too much for something that happens hundreds of times a day; a blue night room, which changes "dark is a warm room"; a cool daylight room, which read as cold.

## Open

- **The light room's tone.** Between a true neutral and today's warm near-white, so the lantern and the Review button are the only warm things by day. One token change in `packages/design` reaches all three surfaces; Kateryna picks the value from side-by-side screens of the web's Today, the phone's Today and the site's home.
- **A faint ember at the thumb.** It would rise from the pressed grade, alongside the spark from the hood.
- **The goal's sound.** The placeholders were synthesized to judge the idea; the real one needs a sound designer or an afternoon with a synth.

## Delivery

1. **Shared moments.** The wick, rolling numbers and the end's light in `packages/design` as values both apps read, then on the web and the phone, and in the site's review demo.
2. **The hour.** The pool on Today and at the end on both apps, and the site's hero.
3. **The light room's tone,** after Kateryna picks the value.
4. **Phone extras.** Haptics through Core Haptics, the goal's sound with its setting, and the tilt highlight.

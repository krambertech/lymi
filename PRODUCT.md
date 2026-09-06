# Product

## Register

product

## Users

One person for now: Kateryna, who takes language lessons and wants to keep the words and phrases from them. She uses the app in two places. On the phone, in short sessions, often in the evening. On the desktop, after a lesson, when she is turning notes or a transcript into cards and wants the keyboard to do the work.

The job to be done is "remember what I learned in this week's lesson without spending my evening making flashcards." Capture has to be fast enough to do while the lesson is still fresh. Review has to be pleasant enough to do every day without being asked.

The first version is private and single-user. The data model and auth should not assume it stays that way, but nothing in the product should be built for an imagined audience.

## Product Purpose

Lymi is a vocabulary app for language learners. It collects words and phrases from lesson material, lets AI do the tedious part of preparing a card, and schedules review with a modern spaced-repetition algorithm (FSRS or equivalent).

It exists because the current tools each fail in one way. Anki is capable and unpleasant. Mochi is pretty and hard to feed from outside. AI card generators are fast and untrustworthy. Lymi should be pleasant, programmable, and honest about what the AI wrote versus what came from the lesson.

Success for the private version looks like this: Kateryna reviews in Lymi most days by choice, adding a lesson's vocabulary takes a few minutes instead of an evening, AI suggestions are useful and easy to correct, and cards and progress are the same on the phone and the laptop.

## Brand Personality

Three words: warm, calm, quick.

The name is cut from lyhty, the Finnish word for lantern. The symbol is a storm lantern, the kind you carry. It is lit while you review, it flickers when a card lands, and it brightens when the session is done. That is the emotional register: a small warm light you bring with you, not a coach, not a game, not a productivity dashboard.

Voice is plain and friendly. It says "That's the lot" at the end of a session, not "Congratulations!" It counts cards, not points. It never nags. Undo is everywhere, because cheap mistakes are most of what "delightful" means in a review app.

Playfulness is allowed in six places, each tied to something the user did: the flame flaring on a good answer, the lantern brightening at the end of a session, the lantern unlit when nothing is due, seven small lights for the last seven days, the flame counting days in a row, and the Undo toast. Everywhere else the interface is quiet. The lantern is the only thing that glows; every other surface is flat with one hairline edge.

## Anti-references

- **Duolingo.** No mascot with a personality, no confetti, no push notifications that guilt.
- **Anki.** No walls of settings, no default-widget grey, no feeling that the tool is fighting you.
- **Generic AI apps.** No sparkle icon on every AI feature, no purple-to-blue gradient, no "magic".
- **Editorial dark mode.** No display serifs, no near-black with a lone neon accent, no landing-page typography inside an app.
- **Skeuomorphic flashcards.** No paper textures, ruled lines, or drop shadows pretending to be a desk.
- **The dashboard.** No hero metrics, no charts on the home screen, no gamified progress rings shouting numbers. Charts belong in Insights, on their own screen, where looking at them is a choice.

## Design Principles

1. **The words are the content.** Every screen is built around the word on the card. Type, spacing and colour serve legibility first. Nothing competes with the word for attention.
2. **Quick before clever.** Capture and review are the two things done every day. They get keyboard shortcuts, one-tap answers, and no confirmation dialogs. Cleverness goes into the AI preparation step, where the user has time.
3. **Show what the AI did.** Anything generated is labelled and reviewable before it is saved. Lesson-sourced content and AI-sourced content look different. The user can always fix or reject a suggestion in one action.
4. **Standard controls, one symbol.** Buttons, inputs, chips and lists look like what they are. The lantern is the single piece of illustration in the app, and it appears at full size only where there is nothing else to look at.
5. **Cheap mistakes.** Every destructive or scheduling action can be undone within a few seconds. Archive instead of delete. Progress is never lost to a wrong tap.
6. **Same app on both screens.** Desktop and phone are the same product with different layouts, not a main app and a companion. Review continuity across devices is a feature, not a sync detail.

## Accessibility & Inclusion

- WCAG 2.2 AA is the floor. Body text meets 4.5:1 in both themes, including muted text and placeholders.
- Light and dark themes are both first-class. The app follows the OS unless the user picks one. Dark is a warm room lit by the lantern, not black.
- All motion respects `prefers-reduced-motion`. The flame flicker, the flare, and the end-of-session glow each have a crossfade or static alternative.
- Everything works from the keyboard on desktop: grading (1 to 4), reveal (Space), add (N), review (R), search (/).
- Tap targets are at least 44 px on the phone. Grade buttons are 56 px tall.
- Inputs are 16 px or larger so iOS does not zoom.
- Status is never colour alone. "New", "Learning" and "Known" chips carry a label and, where colour is used, a dot.
- Audio has a visible control and never autoplays.

# Product

## Register

product

## Users

One person for now: Kateryna, who takes language lessons and wants to keep the words and phrases from them. She uses the app in two places. On the phone, in short sessions, often in the evening. On the desktop, after a lesson, when she is turning notes or a transcript into cards and wants the keyboard to do the work.

The job to be done is "remember what I learned in this week's lesson without spending my evening making flashcards." Capture has to be fast enough to do while the lesson is still fresh. Review has to be pleasant enough to do every day without being asked.

The first version was private and single-user. Shared decks ([ADR 0011](docs/adr/0011-a-shared-deck-is-one-deck-with-many-learners.md)) add a second kind of learner: a member who studies a deck someone else writes, starting with Kateryna's Estonian class. Nothing else in the product is built for an imagined audience.

## Product Purpose

Lymi is a vocabulary app for language learners. It collects words and phrases from lesson material, lets AI fill in the tedious fields of a card, and schedules review with a modern spaced-repetition algorithm (FSRS or equivalent).

It exists because the current tools each fail in one way. Anki is capable and unpleasant. Mochi is pretty and hard to feed from outside. AI card generators are fast and untrustworthy. Lymi should be pleasant, programmable, and honest about what the AI wrote versus what came from the lesson.

Success for the private version looks like this: Kateryna reviews in Lymi most days by choice, adding a lesson's vocabulary takes a few minutes instead of an evening, what the AI enriches is useful and easy to correct, and cards and progress are the same on the phone and the laptop.

Within a review, due cards with the same scheduling priority are mixed before they are shown so capture or edit order does not become a memorisation cue.

## Daily Review Goal

The daily review goal and the streak are one mechanic. The learner chooses how many recall attempts they want to complete per learner-local day. Reaching that number satisfies the day's streak goal; if at least one review is available but fewer than the goal, completing all available reviews also satisfies it without pulling future cards forward.

Before the first review, Lymi asks the learner to choose this goal and suggests 50 attempts. The same control later lives in the streak modal, with quick choices of 10, 25, 50, and 100 plus a custom whole number from 1 to 200. The saved choice applies on later days; Today and Settings do not introduce separate goal editors.

The streak counts consecutive learner-local days whose goal was satisfied. `DESIGN.md` "The streak" covers how the number and the seven lights show it, and "The flame" covers the flame. A day that ends without satisfying the goal resets the current streak to zero, while the learner's review history remains intact. When zero cards are eligible, opening Lymi and letting it confirm that nothing is due protects the current streak without increasing it; not opening still makes the day missed.

The learner-local day initially uses the current device timezone without asking during setup. While the timezone remains automatic, the most recently foregrounded device may update it when its timezone changes during travel; a background device cannot overwrite that choice. A timezone chosen explicitly in Settings becomes a manual override and is not changed automatically until the learner returns it to automatic. Timezone changes affect current and future day boundaries without rewriting completed review history.

Every accepted, non-undone grade counts exactly once toward the daily goal, including Forgot and every later attempt at the same card. The goal counts recall attempts, not distinct cards or correct answers, so forgetting never increases the required work. Reviews already completed that day count toward the total, and Undo removes the undone attempt.

An active review is durable. Its current card, order, progress, unseen-card buffer, and timed retries survive reloads, backgrounding, reconnecting, and movement between phone and laptop. Lymi keeps up to 20 unseen cards locally and starts a background refill toward 20 when 10 remain, capped by the remaining goal and available work. Foreground and reconnect checks reconcile the buffer. Every fetch merges into the active review and never replaces it or silently restarts progress.

When both ordinary due reviews and new cards are available, Lymi targets approximately one new card after every four ordinary reviews. Learning and relearning cards that are already due retain priority, and if either the ordinary-review or new-card group runs out, the other can fill the remaining daily goal. This proportion is an internal fairness rule, not a separate learner setting or a promised fixed quota.

A forgotten card returns in the same direction when its FSRS learning or relearning step becomes due. Lymi mixes it into the next few unseen cards instead of showing it immediately or holding it until the end. Its sibling direction stays out of that review because the revealed answer would make the second prompt dishonest.

The completion state reports the actual number reviewed and confirms that today's streak goal is complete. It offers **Review forgotten** when cards still need another look, **Review another round** when more eligible cards are available, and **Done**. Another round contains up to 10 additional attempts, ends earlier when no eligible cards remain, and may be chosen again after it finishes. Continuing is optional and cannot make a completed streak goal incomplete. When zero cards are due, the empty state protects but does not increase the streak and offers **Add cards**; adding alone does not count toward the review goal. An empty local buffer while offline or after a failed refresh is not evidence that all useful reviews are finished.

## Brand Personality

Three words: warm, calm, quick.

The name is cut from lyhty, the Finnish word for lantern. The symbol is a storm lantern, the kind you carry. Its flame is the continuity of remembering: repetition keeps it alive, so it goes out only when the streak breaks. What it shows in the signed-in product is in `DESIGN.md`, under "The lantern" and "The flame".

Brand-only appearances do not expose learner state. The app icon, login, and public surfaces use one canonical healthy flame. That is the emotional register: a small warm light you bring with you, not a coach, not a game, not a productivity dashboard.

Voice is plain and friendly. It says "Daily goal reached" when the chosen number is complete and "That's the lot" when no useful reviews remain, not "Congratulations!" It counts cards, not points. It never nags. Undo is everywhere, because cheap mistakes are most of what "delightful" means in a review app.

Playfulness is allowed in four places, each tied to honest product state: the flame growing after a saved review, the stronger rise when the daily goal is complete, seven small lights for the last seven days, and the Undo toast. Forgot feeds the flame just as Easy does because both are repetitions. Everywhere else the interface is quiet. The lantern is the only thing that glows; every other surface is flat with one hairline edge.

## Anti-references

- **Duolingo.** No mascot with a personality, no streak pressure, no confetti, no push notifications that guilt.
- **Anki.** No walls of settings, no default-widget grey, no feeling that the tool is fighting you.
- **Generic AI apps.** No sparkle icon on every AI feature, no purple-to-blue gradient, no "magic".
- **Editorial dark mode.** No display serifs, no near-black with a lone neon accent, no landing-page typography inside an app.
- **Skeuomorphic flashcards.** No paper textures, ruled lines, or drop shadows pretending to be a desk.
- **The dashboard.** No hero metrics, no charts on the home screen, no gamified progress rings shouting numbers. Charts belong in Insights, on their own screen, where looking at them is a choice.

## Design Principles

1. **The words are the content.** Every screen is built around the word on the card. Type, spacing and colour serve legibility first. Nothing competes with the word for attention.
2. **Quick before clever.** Capture and review are the two things done every day. They get keyboard shortcuts, one-tap answers, and no confirmation dialogs. Cleverness goes into enrichment, where the user has time.
3. **Show what the AI did.** Anything the AI wrote carries its field source, so AI text is never mistaken for the lesson. Enrichment fills only empty fields and never overwrites text. A card an integration adds is an ordinary card from the moment it lands, and Activity lists the write so the learner can inspect, edit or archive it.
4. **Standard controls, one symbol.** Buttons, inputs, chips and lists look like what they are. The lantern is the single piece of illustration in the app, and it appears at full size only where there is nothing else to look at.
5. **Cheap mistakes.** Every destructive or scheduling action can be undone within a few seconds. Archive instead of delete. Progress is never lost to a wrong tap.
6. **Same app on both screens.** Desktop and phone are the same product with different layouts, not a main app and a companion. Review continuity across devices is a feature, not a sync detail.

## Accessibility & Inclusion

- WCAG 2.2 AA is the floor. Body text meets 4.5:1 in both themes, including muted text and placeholders.
- Light and dark themes are both first-class. The app follows the OS unless the user picks one. Dark is a warm room lit by the lantern, not black.
- All motion respects `prefers-reduced-motion`. The flame's flicker, its breath after a review, and its rise at the goal each have a still alternative: the flame takes its new size and halo at once.
- Everything works from the keyboard on desktop: grading (1 to 4), reveal (Space), add (N), review (R), search (/).
- Tap targets are at least 44 px on the phone. Grade buttons are 72 px tall.
- Inputs are 16 px or larger so iOS does not zoom.
- Status is never colour alone. "New", "Learning" and "Known" chips carry a label and, where colour is used, a dot.
- Audio has a visible control and never autoplays.

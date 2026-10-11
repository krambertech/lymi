# Welcome

Welcome is how a new account starts: three questions, then the first review. It lives at `/welcome` and is drawn by `WelcomeView` in `views/welcome-view.tsx`. Its job is to get a learner to a first review with the right goal and material, not to teach the product.

## Who sees it

Today sends an account there while the account has no decks, no reviews and no `onboarded_at`. Finishing or skipping stamps `onboarded_at`, so it is shown once. An account that already holds a deck, such as one that joined from an invitation, never sees it.

## The questions

The rail and the pill are gone, as in review, so the way out is **Skip for now**. The bar holds Back or the lantern on the start side, a three-part track with "1 of 3" in the middle, and Skip on the end. The primary sits at the foot of the screen on a phone and under the content on a desktop.

1. **What are you learning?** Four tiles: A language, For a test, A subject, Something else. Tiles carry a plain icon and a tick once chosen, never a radio dot beside a circled icon.
2. **Which language?** Only after A language. The twelve languages with the most published decks are pills. **Another language** opens a panel with a search field and the rest of Explore's languages as smaller pills, narrowed as the learner types; a language Lymi does not list can be typed and is kept as typed. The list is never a search on its own: a search is heavy for a first screen.
3. **How much time a day?** The four goal presets, named as in the streak modal, with rough minutes and the review count. Steady, 25 reviews, is chosen and marked **Good to start**.
4. **How do you want to start?** Ready-made decks and **Bring your own** carry equal weight. Up to four decks match the answers: the chosen language's shelf, the citizenship and driving shelves for a test, or the other subject shelves for a subject. Bring your own is one plate of three rows: import from Anki or Mochi, a lesson from Claude or ChatGPT, or typing cards. When nothing matches, as for Something else or a typed language, Bring your own comes first and one deck from each of the first shelves follows.

Steps 1 and 2 share the count, so the track always reads three questions.

## Where it ends

| Choice | What happens |
| --- | --- |
| A ready-made deck | Adds it to Library, then opens the day's review |
| Import | Settings, at the Import group |
| Claude or ChatGPT | The assistant docs in a new tab, and Today behind it |
| Type my own cards | Today with New deck open |
| Skip for now | Today with the getting started guide and a goal of 25 |

A chosen goal counts as chosen. A skip starts the account on 25 without stamping `daily_goal_chosen_at`, unless the learner had already chosen one. `PUT /api/settings/onboarding` is learner-only and records the answers; there is no MCP tool, because getting set up is the learner's own.

## Motion

A new question slides 28 px in the direction of travel out of a 2 px blur over 260 ms while the last one leaves faster, and its heading, lede and choices rise 8 px in order, 35 ms apart. The track's segments fill over 320 ms, a tick pops in on the choice springs, and Another language's panel opens to its height. A press from the keyboard changes the question at once, and under reduced motion questions only fade.

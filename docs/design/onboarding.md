# Welcome

Welcome is how a new account starts: a lit welcome, three questions, then the first review. It lives at `/welcome` and is drawn by `WelcomeView` in `views/welcome-view.tsx`. Its job is to get a learner to a first review with the right goal and material, not to teach the product.

## Who sees it

Today sends an account there while the account has no decks, no reviews and no `onboarded_at`, judged on this visit's reads rather than the persisted cache; offline, Today shows instead. Finishing or skipping stamps `onboarded_at`, so it is shown once: `/welcome` sends a set-up learner to Today, and a second `PUT /api/settings/onboarding` changes nothing. Migration 0043 stamped every account that had a deck or a membership before Welcome existed, archived ones included.

## The welcome

Every new account opens on the same first screen, because a first visit is the start of something and should feel lit. The brand lantern catches from its ember in the middle of the screen, its pool of glow blooms behind it and a handful of embers lift once; then **Welcome to Lymi** and one line on what comes next. Under them sits one plate to anchor the centred screen: the deck the learner arrived with, or else **How it works**. **Continue** goes to the first question, the bar holds Skip for now, and the progress bar starts at the first question, because the welcome is not one. Its light is `LanternLight` in `components/lantern-light.tsx`, the same pool and embers as the end of a review.

**How it works** is three numbered steps down one line: see a card and recall the answer, say how well you knew it, Lymi brings it back just before you'd forget it. The steps stay stacked at every width, because copy of different lengths side by side never balances. A learner with a deck does not get it: two plates are heavy, and the deck is the more useful thing to see.

## From a shared or published deck

Signing up from a deck's add page or from a join link or invitation already puts that deck in Library, so that deck leads the welcome and Welcome asks only **How much time a day?** before opening its review. The Worker decides it on the return from sign-in (`?continue=1`): an account with no `onboarded_at` and no reviews goes to `/welcome?deck=<id>`, and any other goes to the deck as before.

The welcome says the deck is ready and shows it on a plate in the join page's words: who shared or published it, an **In Library** mark, its name, language and card count. It never shows the deck's cards again, because the join page already did. The time question follows with Back to the welcome and no progress bar, and its primary is **Start review**. Skip for now, on either screen, lands on the deck's page on a goal of 25, not Today's guide, which is about making a deck of one's own. A deck with no cards yet lands on its page after the goal instead of an empty review. The answers record no subject or language, and leaving the review lands on Today. A `deck` that is not in Library gets the full questions.

## The questions

The rail and the pill are gone, as in review, so the way out is **Skip for now**. The bar holds Back on the start side from the first question and Skip on the end. Under it one progress bar runs the width of the column and fills by the learner's own path: three questions, or four once A language adds Which language, which is why it is one bar and not a segment per question. The primary sits at the foot of the screen on a phone and under the content on a desktop.

1. **What are you learning?** Four tiles: A language, For a test, A subject, Something else. Tiles carry a plain icon and a tick once chosen, never a radio dot beside a circled icon.
2. **Which language?** Only after A language. The twelve languages with the most published decks are pills. **Another language** opens a panel with a search field and the rest of Explore's languages as smaller pills, narrowed as the learner types; a language Lymi does not list can be typed and is kept as typed. The list is never a search on its own: a search is heavy for a first screen.
3. **How much time a day?** The four goal presets, named as in the streak modal, with rough minutes and the review count. Steady, 25 reviews, is chosen and marked **Good to start**.
4. **How do you want to start?** Ready-made decks and **Bring your own** carry equal weight. Up to four decks match the answers: the chosen language's shelf, the citizenship and driving shelves for a test, or the other subject shelves for a subject. Bring your own is one plate of three rows: importing decks from Anki, Mochi or Noji, a lesson from Claude or ChatGPT, or typing cards. When nothing matches, as for Something else or a typed language, Bring your own comes first and one deck from each of the first shelves follows.

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

The welcome plays once: the lantern catches on its 700 ms spring, the pool blooms from 180 ms and nine embers lift from 520 ms; the heading rises out of a blur at 420 ms, the line under it at 520 ms, and the plate at 700 ms. On How it works the flame's light then runs down the line, 650 ms a step: each number lights amber as the light reaches it, its step turns from muted to ink, and the light travels on to the next. It rests with all three lit. Under reduced motion the lantern is lit, the pool is still, the plate fades in and every step is already lit.

A new question slides 28 px in the direction of travel out of a 2 px blur over 260 ms while the last one leaves faster, and its heading, lede and choices rise 8 px in order, 35 ms apart. The progress bar fills over 320 ms, a tick pops in on the choice springs, and Another language's panel opens to its height. A press from the keyboard changes the question at once, and under reduced motion questions only fade.

## On the phone

The phone asks the same questions in the same order and saves to the same `PUT /api/settings/onboarding`, so finishing or skipping on either app holds on both. It arrives as a cover over Today, which opens it on the same reads as the web's Today, and leaves only by finishing or Skip for now. The primary is the `xl` button at the foot, Back and Skip for now are glass in the bar, and every answer is a whole plate with a tick. Import and Claude or ChatGPT finish Welcome and then open on the web over Today ([ADR 0030](../adr/0030-the-phone-leads-the-daily-jobs-and-setup-stays-on-the-web.md)); Type my own cards opens New deck over Today. A join link or a published deck's link joins in the app, then a learner who has not got set up or reviewed gets the deck's welcome and the goal instead of the deck's page.

Today's getting started guide on the phone is a path: the lantern heads a line that runs down the three numbered steps, lit amber as far as the step the learner is on, which is the one plate and holds its action. Under it sit the Ready-made decks banner and **Bring what you have**: the offer to connect an AI assistant with the assistants' marks until one is connected, then Import decks as a row that opens the web. `apps/mobile/src/welcome` holds both.


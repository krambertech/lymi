# Getting started

A new account starts on Today, not on a separate set of screens. Today carries a first-run guide until the first review, so the place a learner learns the product is the place they will use every day. Its job is to get them to a first review, not to teach the product or ask questions whose answers change nothing. The end of that review asks the two things that keep it going: the daily goal and a reminder. The web drew Welcome's questions until October 2026; the phone still does (below).

## The guide

`FirstRunGuide` in `components/first-run.tsx` sits on the bare canvas, dashed like every empty state ([empty-states.md](system/empty-states.md)), with the lantern spilling its light at the start: a heading, one line, a count ("1 of 3 done") and three numbered steps.

1. **Create a deck**: done once the learner has any deck, made, joined or added.
2. **Add cards**: done once a deck has cards. While current it holds **Add a card** and, where Smart add is allowed, **Turn your notes into cards**; an empty deck is named in its line.
3. **Finish your first review**: holds **Review**, which opens that deck's review. The guide leaves with the first accepted grade.

A done step is an amber check with its title struck through, the current step's number is dark and its action shows, and a later step waits muted. There are no progress bars. The heading greets the learner by first name and stays put; the line under it says what comes next. While the guide shows, Today's own cards wait, because they have nothing to say yet.

## Under the guide

**Create your first deck** comes first, because most learners bring their own material. Three cards, each with its own button and an icon on it: **From your notes** (camera, file and paste marks; Smart add, which reads a photo, a PDF or pasted text), **Connect your AI assistant** (the Claude, ChatGPT, Gemini and Grok marks, each opening its setup guide; **Connect** opens them all) and **Import a deck** (Anki, Mochi, Noji and Quizlet by name; Settings at Import). **Or start an empty deck** opens New deck. Once a deck exists the heading reads **More ways to add cards** and the empty-deck link goes. The rail's assistant card stays hidden on Today while the guide shows, so the offer is made once.

**Or start with a ready-made deck** follows, with **Explore all decks**. Under it a quiet line, **I'm learning**, ends in the choice as a pill, so it never outweighs the heading: the catalogue's languages, most decks first, then **For a test**, with **Anything** for all of them. A language leads with the decks a beginner starts from, where `BEGINNER_DECKS` in `packages/client/src/welcome.ts` names them: Japanese offers Read Japanese Kana, JLPT N5, JLPT N4 and Japanese Essentials first, and one that is not published leaves its place to the shelf's next deck. It starts on the language the learner most likely came for: the deck they arrived with, else the language they gave Welcome, else everything. The decks sit in one row that scrolls sideways, up to twelve, faded at the end while more follow; a new choice starts the row at its first deck. **Add** puts the deck in Library and opens its first review.

## The end of the first review

`FirstReviewSetUp` in `components/first-review-set-up.tsx` sits between the lights and the ways on, only at the end of the review that held the account's first grade ([review-completion.md](review-completion.md)). **Your daily goal** is the streak's own goal picker, already on the learner's goal, and saves on the tap. **Remind me each evening** turns on this device's reminder at 19:00 with **Turn on**, the same reminder as Settings; it says when notifications are blocked, asks an iPhone to add Lymi to the Home Screen first and links to Settings at the reminder, and is left out where the browser cannot show reminders.

## Getting set up

Today's first visit counts as getting set up: the browser saves `PUT /api/settings/onboarding` with no answers and `from: "today"`, which stamps `onboarded_at`, starts the goal at 25 unless one was chosen, and stops the phone from asking Welcome's questions. `/welcome` redirects to Today. An account made from a published deck's add page, a join link or an invitation comes back from sign-in to Today (`?continue=1` on the door page), where that deck has ticked the first two steps and **Review** is the next press; an account already set up goes to the deck as before.

## Motion

The first visit on a device plays once (`lymi-first-run-lit` in local storage). The lantern catches from its ember, its pool blooms from 120 ms and seven embers lift from 420 ms; the heading rises at 260 ms and the line at 360 ms, then the three steps 140 ms apart from 520 ms. Create your first deck arrives from 820 ms, its cards 80 ms apart, the assistant marks popping in on a spring, then the ready-made decks. Every later visit, and every visit under reduced motion, finds it lit and still.

## On the phone

The phone has not moved to Today yet; a linked phone issue follows this design. It asks Welcome's questions (what the learner is learning, which language, how much time a day, and how to start, whose ready-made decks follow `BEGINNER_DECKS` as on the web) and saves to the same `PUT /api/settings/onboarding`, so finishing or skipping on either app holds on both. The app's root decides it once per sign-in, on the rule the web's Today used before it carried the guide: sign-in stays on screen until the account is read, Welcome then fades in as the only signed-in screen, and Today first appears once finishing or Skip for now saves `onboarded_at`, then opens where Welcome sent the learner, such as the first review. How it works shows its three steps already lit, since lighting them one by one flashed on the phone, and the questions' titles are a step smaller than the web's. The primary is the `xl` button at the foot, Back and Skip for now are glass in the bar, and every answer is a whole plate with a tick. Bring your own leads with **Turn your notes into cards**, which makes the learner's first deck from the answers, named for the language or My notes, and opens Smart add on it. Import finishes Welcome and then opens Import over Today ([ADR 0036](../adr/0036-setup-runs-on-the-phone.md)); Claude or ChatGPT opens its setup guide over Today; Type my own cards opens New deck over Today. A join link or a published deck's link offers Join or Add to Library whether or not the learner is signed in; signed out, it signs up or in first, then joins behind a loading state rather than showing the deck again, and a learner who has not got set up or reviewed gets Welcome with that deck and the goal instead of the deck's page.

Today's getting started guide on the phone is a path: the lantern heads a line that runs down the three numbered steps, lit amber as far as the step the learner is on, which is the one plate and holds its action. Only the learner's own decks and cards finish a step; a learner whose only cards are in a deck someone shared sees that deck ready to review instead of the steps. A day confirmed as nothing due before a deck arrived still keeps the streak, but its line reads as reviews to today's goal once cards are due. Under it sit the Ready-made decks banner and **Bring what you have**: the offer to connect an AI assistant with the assistants' marks until one is connected, then Import decks as a row that opens the web. `apps/mobile/src/welcome` holds both.


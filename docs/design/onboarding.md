# Getting started

New web accounts start on Today with a first-run guide that remains until the first accepted review. The guide helps the learner create or choose a deck, add cards and begin review. The phone uses Welcome before Today ([on the phone](#on-the-phone)).

## The guide

`FirstRunGuide` in `components/first-run.tsx` uses the canvas and dashed empty-state treatment ([empty-states.md](system/empty-states.md)). A lantern and three numbered steps share a vertical line, amber through the current step. Keep the markers in one column and text in another, with gaps around the lantern and numbers. The heading greets the learner by first name and stays stable; supporting text gives the next action. Put the completed-step count, such as “1 of 3 done”, at the end of the heading row.

1. **Create a deck**: done once the learner has a deck of their own, or any deck with cards. An empty deck someone shared does not count, because its member cannot add to it.
2. **Add cards**: done once a deck has cards. While current it holds **Add a card** and, where Smart add is allowed, **Turn your notes into cards**; the learner's own empty deck is named in its line.
3. **Finish your first review**: holds **Review**, which opens that deck's review. The guide leaves with the first accepted grade.

Keep each step’s dimensions stable. Only the current step has a filled panel and action. Completed steps use an amber check and struck-through title; future steps use muted numbers. There is no separate progress bar. Hide the normal Today panels while the guide is active.

## Under the guide

**Create your first deck** comes first, because most learners bring their own material. Three cards, each with its own button and an icon on it: **From your notes** (camera, file and paste marks; Smart add, which reads a photo, a PDF or pasted text), **Connect your AI assistant** (the Claude, ChatGPT, Gemini and Grok marks, each opening its setup guide; **Connect** opens them all) and **Import a deck** (Anki, Mochi, Noji and Quizlet by name; Settings at Import). Once an assistant is connected its card says so, **Claude is connected**, with what to ask it and **Connected apps** in place of Connect. **Or start an empty deck** opens New deck. Once the learner has a deck of their own the heading reads **More ways to add cards** and the empty-deck link goes; when their only deck with cards is one someone shared, it reads **Make your own deck**. The rail's assistant card stays hidden on Today while the guide shows, so the offer is made once.

The ready-made decks follow under a heading whose last words are the choice: **Explore ready-made decks about** **anything**, a language, or **tests**, underlined in amber and opening a short list the learner can search by the language's name, with each choice's deck count; **All decks** opens Explore. The list holds the catalogue's languages, most decks first, then **For a test**, with **Anything** for all of them. A language leads with the decks a beginner starts from, where `BEGINNER_DECKS` in `packages/client/src/welcome.ts` names them: Japanese offers Read Japanese Kana, JLPT N5, JLPT N4 and Japanese Essentials first, and one that is not published leaves its place to the shelf's next deck. It starts on the language the learner most likely came for: the deck they arrived with, else the language they gave Welcome, else everything. The decks sit in one row that scrolls sideways, up to twelve, faded at the end while more follow; a new choice slides the row in from its first deck. **Add** puts the deck in Library and opens its first review.

## Getting set up

Today's first visit before any review counts as getting set up: the browser saves `PUT /api/settings/onboarding` with no answers and `from: "today"`, which stamps `onboarded_at`, starts the goal at 25 unless one was chosen, and stops the phone from asking Welcome's questions. An account that has already reviewed is not set up from Today, so it keeps its goal and stays out of `kind: "today"`. `/welcome` redirects to Today. An account made from a published deck's add page, a join link or an invitation comes back from sign-in to Today (`?continue=1` on the door page), where that deck has ticked the first two steps and **Review** is the next press. A deck with no cards yet goes to its own page instead, which says it is waiting for cards, as does an account already set up.

## Motion

Play the entrance once per device, tracked by `lymi-first-run-lit` in local storage. Light the lantern, expand its background light from 120 ms and emit seven particles from 420 ms. Animate the heading at 260 ms, supporting text at 360 ms and steps from 520 ms at 140 ms intervals. Create your first deck appears from 820 ms, with cards 80 ms apart and assistant marks on a spring, followed by published decks. Subsequent visits and reduced motion show the final state without animation.

## On the phone

The phone shows Welcome before Today. It asks what the learner is learning, their language, daily time and preferred starting method. Published-deck choices use `BEGINNER_DECKS`, as on web. Both apps save through `PUT /api/settings/onboarding`, so completion or skipping applies across devices. After sign-in, keep the sign-in screen visible until account state is known, then show Welcome alone when required. Finishing or Skip for now saves `onboarded_at` and opens the selected destination, such as the first review.

Show all three How it works steps lit at once, because lighting them in turn flashes on the phone. Question titles are one size smaller than on web. Use an `lg` primary action at the bottom, glass Back and Skip for now in the header, and full-panel answer choices with checks.

Bring your own leads with **Turn your notes into cards**, which makes the learner's first deck from the answers, named for the language or My notes, and opens Smart add on it. Import finishes Welcome and then opens Import over Today ([ADR 0036](../adr/0036-setup-runs-on-the-phone.md)); Claude or ChatGPT opens its setup guide over Today; Type my own cards opens New deck over Today.

A join link or a published deck's link offers Join or Add to Library whether or not the learner is signed in; signed out, it signs up or in first, then joins behind a loading state rather than showing the deck again, and a learner who has not got set up or reviewed gets Welcome with that deck and the goal instead of the deck's page.

Today's getting started guide on the phone is a path: the lantern heads a line that runs down the three numbered steps, lit amber as far as the step the learner is on, which is the one plate and holds its action. Only the learner's own decks and cards finish a step; a learner whose only cards are in a deck someone shared sees that deck ready to review instead of the steps. A day confirmed as nothing due before a deck arrived still keeps the streak, but its line reads as reviews to today's goal once cards are due. Under it sit the Ready-made decks banner and **Bring what you have**: the offer to connect an AI assistant with the assistants' marks until one is connected, then Import decks as a row that opens the native import screens. `apps/mobile/src/welcome` holds both.

---
status: accepted
date: 2026-11-17
decision: An owner can turn on member progress for a shared deck. Members are told before they join, cannot turn it off, and can leave. Published decks never share progress.
---

# Member progress in shared decks

## Outcome

A teacher shares a deck with a class and sees how each member is doing: when they last studied, how many cards they know, and which cards they often forget. The teacher uses it to plan the next lesson and to notice who has stopped. It is the core of a Lymi offer for teachers and language schools.

Today [ADR 0011](../adr/0011-a-shared-deck-is-one-deck-with-many-learners.md) promises the opposite: the owner sees nothing about a member's reviews, and it rejects showing how many cards each member knows. A new ADR must replace that part before any of this ships. The rest of ADR 0011 stands.

**Not decided:** how the owner's view looks, how long existing members are told before their progress shows, and whether the setting needs a paid or school plan.

## How it works

### The owner turns it on for one deck

Deck settings get one more setting, off by default: members share their progress with the owner. It applies to a deck with a join link, named invitations, or both. Turning it off hides member progress from the owner at once.

### Joining means being visible

With the setting on, the join page and the invitation email say, before the Join button, that the owner will see the member's progress and what that covers. A member cannot turn sharing off for themselves. **Leaving the deck is the way out**, and it already keeps the member's reviews, as ADR 0011 describes.

### Members who joined earlier get an email

When the owner turns the setting on, each current member gets one email in their app language. It names the deck and the owner, lists what the owner will see, gives the date it starts, and links to the deck where they can leave. There is no in-app question. Their progress shows from that date, so anyone who does not want to be seen can leave first.

### Published decks never share progress

A [published deck](../../CONTEXT.md) does not offer the setting. Its learners added it from Explore without an owner they know, and its publisher keeps the anonymous [deck report](../adr/0028-publishers-read-aggregate-reports-on-their-published-decks.md).

### What the owner sees

For each member who shares:

- when they last studied, and on which of the last 14 days
- how many of the deck's cards are New, Learning, and Known for them
- their [often forgotten](../../CONTEXT.md) cards in this deck

The owner never sees a member's grades, answers, review log, review times, hint peeks, or important marks. The member's own Insights stay theirs.

### The group view needs no names

Any shared deck, setting on or off, can show the owner which cards the group forgets most in the last 7 days, with counts and no names. It appears only once at least 5 members have studied, so a small deck cannot reveal one person through a total.

## Evidence

**Usage, from PostHog on 17 November 2026.** `deck_joined` fired 155 times in the last 180 days. 151 of those were Explore adds, because `join` in `apps/web/src/server/services/members.ts` sends `deck_joined` for a published add too. That leaves 4 joins by link or invitation. Changing the promise affects almost nobody today.

**Market, researched on 17 November 2026.** Every product we checked sells a teacher view, mostly in a paid tier. None of them lets a learner opt out: the school or employer consents, and joining the class means being visible.

| Product | What the teacher sees | Built on |
| --- | --- | --- |
| [Quizlet](https://help.quizlet.com/hc/en-us/articles/360030512432-Using-Class-Progress) (Plus for teachers) | Study modes opened and best scores per set; per-term mastery for assignments | Activity and quiz scores |
| [Duolingo for Schools](https://blog.duolingo.com/duolingo-schools-equitable-learning/) | XP, time spent, lessons completed, assignment status | Activity |
| [Brainscape](https://brainscape.zendesk.com/hc/en-us/articles/115002385172-How-do-I-track-students-learning-data-Learners-Tab-) (school licence) | Mastery, days studied, time, cards studied | Self-rated confidence |
| [Vocabulary.com](https://www.vocabulary.com/help/classes-assignments/class-pages-and-leaderboards/) (paid) | Per-student drill-down, trouble and mastery by word | Quiz answers |
| [Babbel for Business](https://babbelforbusiness.com/us/products/control-panel) | Progress, usage, and level per person and team | Activity and tests |

Lymi can show something none of them do: what each member is actually forgetting, from their own schedule and review history, rather than effort or a self-rating.

## Alternatives considered

- **Members can stop sharing.** Rejected on 17 November 2026. A teacher needs the whole class in view, and leaving the deck is already an honest way out.
- **Ask existing members in the app.** Rejected on 17 November 2026 as more machinery than four people need. One email with a start date is enough.
- **Progress always on for every shared deck.** Rejected. Friends sharing a deck to study together did not join to be watched.
- **Only the group view.** Kept as a part, not the whole. It tells a teacher what to re-teach but not who has stopped.

## Open questions

- **The owner's view.** The first prototype had three layouts: a row per member, cards to re-teach first, and a grid of members against sections. None was liked enough to pick. The next round should start fresh.
- **The notice period.** Seven days between the email and progress showing is the current leaning.
- **Plans.** Whether the setting is free, part of [premium](premium-subscription-and-payments.md), or part of a school plan.
- **Schools.** Several teachers, an admin, and seats under one school belong in a separate proposal.

## Instrumentation

The product question: do owners who turn this on open the view, and do their members keep studying? When it is built, add these to [docs/analytics.md](../analytics.md):

- `member_progress_changed`: Worker, when the owner turns the setting on or off, with `on` and a bucketed member count.
- `member_progress_viewed`: browser or phone, when the owner opens the member view of a deck.

Member retention compares `review_session_opened` for members of decks with the setting on and off.

## Delivery

1. Write the ADR that replaces ADR 0011's owner-visibility section.
2. Add the setting, the join page and invitation notice, and the email to existing members. Web and phone together, since both join decks.
3. Design and build the owner's view, web first.
4. Add the group view for every shared deck.
5. Publish a teachers page on lymi.app in English, Ukrainian, and Russian.

# Content safeguards for app review

This is what App Store review (guideline 1.2) and Google Play's user-generated content policy are told about content one learner can show another. The store listing pastes the note below into App Review Information and the Play Console; keep the two in step with this file. How a report is handled is in [operations](operations.md#a-content-report-arrives).

## Review note

> Lymi is a flashcard app for learning any subject. Most of what a learner sees they wrote themselves. Other people's content reaches them in two ways only.
>
> 1. Ready-made decks in Explore. Only Lymi's own publisher account can publish to Explore, and every deck there is written or reviewed by us before it goes up. Learners cannot publish, comment or message each other.
> 2. Shared decks. A learner can share a deck they wrote through a join link or an email invitation. Shared decks are not listed in Explore or searchable there; anyone with an active join link can join. A member can study the deck but cannot change it or contact anyone through it.
>
> Reporting: anyone studying a deck someone else wrote can report the deck or any of its cards, from the deck's menu, the card's menu, About this deck, or during review. They choose a reason (hateful or offensive, sexual, harassment or bullying, spam or a scam, something else) and may add a note. Reports are stored and emailed to our operator inbox. We review them within a day. When content breaks our rules, we can archive the card or deck for everyone and suspend the owner from sharing, which archives every deck they share. Reports that do not break the rules can be dismissed. The owner is never told who reported.
>
> Leaving and removing: a learner can leave any shared deck at any time, after which it no longer appears for them. An owner can remove any member, who can then never rejoin through that deck's link or an invitation.
>
> Contact: hello@lymi.app. Send feedback in the app's menu reaches the same inbox.
>
> To try it: open a deck the review account studies but does not own, then ⋯ › Report deck, or open one of its cards and choose Report card.

Before each submission, verify that the review account studies a deck owned by a second account and can reach both reporting actions. Do not claim this fixture is available until it has been checked in the submitted build.

## What it rests on

- Publishing is limited to `PUBLISHER_EMAILS` ([ADR 0020](adr/0020-a-published-deck-admits-anyone-who-adds-it.md)).
- A shared deck is reached only through its join link or a named invitation, and members never write to it ([ADR 0011](adr/0011-a-shared-deck-is-one-deck-with-many-learners.md)).
- Reports, archiving and suspension are the content report service in `apps/web/src/server/services/content-reports.ts`, settled with `pnpm moderate`.
- There is no separate Block: a shared deck has no messages, comments or profiles to block, and Leave and Remove already end any contact one deck makes.

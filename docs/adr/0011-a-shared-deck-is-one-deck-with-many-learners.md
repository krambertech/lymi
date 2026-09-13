---
status: accepted
date: 2026-09-12
---

# A shared deck is one deck with many learners, and its invitation is the front door

A learner can share a deck with a group. Every card the owner adds reaches every member. Members study. Only the owner writes.

This record makes the four choices that are hard to reverse. [The proposal](../proposals/shared-decks.md) lists the options that lost. [The plan](../plans/2026-09-12-shared-decks.md) orders the work.

## The deck is live, not copied

One deck has one owner and many members. Members see the owner's cards, including cards added after they joined. An edit changes the card for everyone. An archive removes it from every queue.

A copy is a snapshot. A deck that grows after every lesson makes a snapshot stale within a week.

## Each learner owns their learning state

`card_states` becomes unique on `(card_id, user_id, direction)`. Today it is unique on `(card_id, direction)`. The change gives each member their own schedule for each card. `reviews` already has `user_id`.

The owner sees who is a member and when they joined. The owner sees nothing about a member's reviews.

## The deck's invitation admits the account

Sign-in is Google only. The `user.create.before` hook in `apps/web/src/server/auth.ts` refuses any email not in `ALLOWED_EMAILS`. That gate stays. A second gate opens next to it. An email with an unrevoked named invitation may create an account. So may anyone who reaches sign-in from a valid join link.

A deck has one join link. The owner can turn it off. A deck can also have named invitations, one per Google email. Lymi sends no email; the owner passes the link on.

Turning the link off removes nobody. Removing a member takes the deck out of their Library and blocks them: the join link no longer admits them, and only a named invitation from the owner lets them back. Leaving is different. A member who leaves can rejoin through the link. In both cases their states and reviews stay, so a return resumes where they were.

The join page is `my.lymi.app/join/<token>`. The product Worker renders it on the server with Open Graph tags. It shows the deck's name, owner, card count, and language, a few cards drawn at random as examples, and one button. The title and Open Graph tags name the deck, owner, and count but no cards, so a chat's link preview shows none. A link that was turned off gets a page that says so. The exact path `/join` on the product origin keeps redirecting to the public site's beta page.

## Roles are stored now and used later

`deck_members.role` is `owner`, `editor`, `contributor`, or `learner`. The first slice writes only `learner`. The owner is `decks.user_id`. The interface has no way to grant editor or contributor yet.

A learner reads the deck and grades their own states. Every write to the deck's content needs the owner. This holds for the app, the API, and MCP, whatever the key or token's scope. [ADR 0001](0001-integration-cards-are-ordinary-cards.md) stands.

## Considered options

- **Share a copy.** Rejected. New cards would not arrive.
- **Named invitations only.** Rejected. The group lives in a chat, and the owner does not know every Google address. The link can be turned off, Google sign-in names each joiner, and the member list shows who came.
- **Open sign-up.** Rejected. It admits people no deck invited.
- **Keep `ALLOWED_EMAILS` and add classmates by hand.** Rejected. Every invitation would edit a production secret.
- **Render the join page on `lymi.app`.** Rejected. Sign-in and sessions live only on `my.lymi.app` under [ADR 0008](0008-public-website-and-product-use-separate-origins.md).
- **A `shared_decks` table next to `decks`.** Rejected. One table lets Library, the queue, and the API treat a shared deck as a deck.
- **Show no cards before joining.** Rejected 13 September 2026. Anyone with the link can join and see every card, so hiding them protected only the chat preview, which stays card-free, and left the page with nothing to show a classmate what they would study.
- **Show the owner how many cards each member knows.** Rejected. That is a classroom product with consent questions this decision does not take on.

## Consequences

- Reads go through membership instead of `decks.user_id` or `cards.user_id`: `listDecks`, `getDeck`, `listDeckCards`, `getCard`, `searchCards`, `reviewQueue`, `reviewHistory`, the stats queries, and the reminder query in `push-delivery.ts`. Writes keep the owner filter.
- Joining creates states for every active card and asked direction, due now, as [ADR 0007](0007-a-decks-direction-is-a-filter-not-a-migration.md) does when a direction turns on. Adding a card, turning on a deck direction, and changing a card's direction each create the missing states for the owner and every member.
- Pronunciation audio is a cache on the owner's card, not content. Any member may trigger it. The key is written once and the audit row lands in the owner's Activity.
- The duplicate rule stays per learner over their own cards. A member who has "tere" in their own deck and joins a shared deck with "tere" sees both.
- Members cannot pause, annotate, or change the direction of a shared card.
- A join appends to the owner's audit log and shows in their Activity.
- Deck responses carry the caller's role and the owner's name, so Library and MCP tools know whose deck it is and whether they may write.
- Ending the beta means removing `ALLOWED_EMAILS`. Invitations remain the way in.

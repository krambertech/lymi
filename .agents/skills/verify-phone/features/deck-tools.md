# Deck tools: selection and sections

A deck's page lets any learner select cards and act on them from the selection toolbar's ⋯: **Review N due**, **Review all N**, and **Mark important** or **Unmark important**, with the owner's Tags, Move to section, Move to deck and Archive under a separator. In a deck whose sections open in order, the section progress has **Go to**, a new card in a section that isn't open shows a lock read as **Not in review yet**, and the owner's section heading menu starts with **Add card here**.

## Reach

A deck with sections, then **Deck options** › **Select cards** for the selection, the summary plate for Go to, and a long press on a locked section's heading for Add card here.

## Drive

- [`deck-tools-owner.yaml`](deck-tools-owner.yaml), as `learner`, after [`deck-tools-owner.mjs`](deck-tools-owner.mjs) gives the learner's own deck three sections, the third holding only a new card: sort by Recently added, tap **Go to**, see the current heading with **You are here**, find the waiting card's **Not in review yet**, take **Add card here** on the locked heading and see capture's **Section** chip name it, then select all and take **Mark important**.
- [`deck-tools-member.yaml`](deck-tools-member.yaml), as `learner`, after [`deck-tools-member.mjs`](deck-tools-member.mjs) has `backlog` share a deck with two sections that `learner` joins, with three of learner's cards there forgotten three days ago and two easy: **Go to**, then select all and see **Review 3 due**, **Review all 5** and **Mark important** with no Archive or Move; mark, **Undo**, then **Review 3 due** through to **Round done**.
- [`deck-tools-tags.yaml`](deck-tools-tags.yaml), as `learner`, on Lezione 12, whose cards carry a few tags: select all, take **Tags**, see the cards' tags as rows with their counts, type a new tag, take **Create**, see it ticked on every card, then ✓ and see **Changed the tags on N cards**.

## End state

The owner's deck has every card marked important. The member's deck has none marked, because Undo gave each card back its mark. Every card of Lezione 12 carries the new tag in `/api/decks/<id>/cards`.

## Gotchas

- Which section is current depends on the learner's seed, so the flows match the heading by **You are here** rather than by name.
- Capture's chip row sits over the keyboard and scrolls sideways; `hideKeyboard` fails there, so the owner flow swipes the row where it is.
- iOS opens the ⋯ menu upwards from the toolbar, so its groups read bottom to top.

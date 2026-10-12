---
status: accepted
date: 2026-10-12
decision: Tags let a learner find and review cards across decks; each learner has their own, and a deck's tags reach its learners read-only
---

# Tags that find and review cards

A learner should be able to find and review one slice of everything they study, such as every food word across their Italian deck and their Estonian class deck. Sections and series group cards within one deck or one chain of decks; a tag cuts across them.

Today a tag does almost nothing once typed. Tags are a JSON list of names on each card, up to 20 of 40 characters ([data model](../data-model.md#tags-and-source)). The card form doesn't suggest existing tags, so "verbs" and "Verbs" become two. Tags show on the word screen and on the review card after reveal, and travel through imports and exports, but nothing in the app filters or reviews by them. Only card search in the API and MCP reads them.

## Evidence

Other apps, checked 11 October 2026 from their manuals and forums:

- **Anki** keeps a shared deck's tags and the learner's own in one field. Importing a newer version of the deck keeps whichever copy of a note changed last, so the learner's tags can be overwritten.
- **AnkiHub** syncs a deck's tags live and wipes a subscriber's own tags unless each one is protected first. Its forum has many reports of lost tags.
- **Mochi** shares by copying, so a deck's tags arrive once and later changes never do.
- **Todoist**, outside flashcards, keeps your own labels apart from labels collaborators add in shared projects. A shared label with the same name as one of yours is treated as yours.

Every flashcard failure comes from one list holding two people's tags. Lymi keeps them apart. Because a shared or published deck is one live deck rather than a copy ([ADR 0011](../adr/0011-a-shared-deck-is-one-deck-with-many-learners.md), [ADR 0020](../adr/0020-a-published-deck-admits-anyone-who-adds-it.md)), a deck's tags stay current with no import step.

## Decisions

- **Two kinds of tag, one owner each.** A learner's own tags are theirs alone, on any card they study, including cards in a joined deck. A deck's tags are the ones its owner puts on its cards: every learner of the deck sees them and can filter and review by them, but only the owner changes them.
- **Published decks follow the same rule.** A publisher's tags are translated per edition, like section names ([ADR 0015](../adr/0015-published-decks-use-pinned-localized-editions.md)). An edition whose tags aren't translated yet shows none.
- **The same name is the same tag for finding and reviewing.** Reviewing "food" covers the learner's "food" and every deck's "food". Renaming or archiving changes only the learner's own.
- **Typing suggests existing tags**, so near-duplicates stop multiplying.
- **Review a tag is a round.** It sits beside New cards and Forgotten today and draws from every deck. It takes the cards with that tag the learner has already started, due ones first, under the usual round rules in `CONTEXT.md`. Unseen cards stay with New cards, so a tag never opens a section early.
- **A Tags screen in Settings manages them.** It lists each of the learner's tags with its card count. Renaming one to a name already in use merges the two. Archiving takes the tag off every card until it is restored.
- **Tags are plain chips with no colour.** Amber, violet and green already mean the one action, the AI badge and "You are here"; a fourth colour system would compete with the term ([`PRODUCT.md`](../../PRODUCT.md), "The words are the content").
- **The card payload keeps its shape.** The API, MCP and the frozen phone contracts still carry `tags` as a list of names. Storage moves to a table, because renaming and per-learner tags on shared cards need one.

## Not in scope

- **Duplicating a joined or published deck** to own it. A member can't export a deck, and a copy would stop receiving corrections; it needs its own shape.
- **Editors changing a deck's tags.** That arrives with the editor role.
- **Grammar as tags**, such as part of speech. That belongs in card fields if it comes.

## Open questions

- **Naming.** "Deck tag" in `CONTEXT.md` already means a publisher's fixed labels on a published deck, such as Travel. These tags need a `Tag` entry that keeps the two apart, and perhaps a rename of the publisher's labels.
- **Private tags on an owner's deck.** This assumes an owner never wants a tag on their shared deck that members can't see. If that need appears, an owner's tag gains a private setting.

## Delivery

1. **Find and review by tag on the web.** Tags move to a table, typing suggests existing ones, the deck page filters by tag, and Review a tag runs across decks. Members of a shared deck already see its tags, so they can filter and review by them, and a deck's tag joins a member's own tag of the same name. Non-original editions of a published deck hide its tags until slice 4.
2. **Your own tags on joined decks.** A member tags a shared or published deck's cards privately.
3. **The Tags screen.** Rename, merge, archive and restore.
4. **Published tags per edition.** Publishers translate tag names, and each edition shows them once translated.
5. **The phone.** Each slice gets a linked phone issue once it is verified on the web ([ADR 0030](../adr/0030-the-phone-leads-the-daily-jobs-and-setup-stays-on-the-web.md)).

Each slice measures whether learners find and review by tag. A tag's name never reaches analytics.

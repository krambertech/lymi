---
status: accepted
date: 2026-10-12
decision: Tags let a learner find and review cards across decks; a card's tags are part of the card, changed only by whoever owns it
---

# Tags that find and review cards

A learner should be able to find and review one slice of everything they study, such as every food word across their Italian deck and their Estonian class deck. Sections and series group cards within one deck or one chain of decks; a tag cuts across them.

Today a tag does almost nothing once typed. Tags are a JSON list of names on each card, up to 20 of 40 characters ([data model](../data-model.md#tags-and-source)). The card form doesn't suggest existing tags, so "verbs" and "Verbs" become two. Tags show on the word screen and the revealed review card, but nothing in the app filters or reviews by them; only API and MCP card search reads them.

## Evidence

Other apps, checked 11 October 2026 from their manuals and forums:

- **Anki** keeps a shared deck's tags and the learner's own in one field. Importing a newer version of the deck keeps whichever copy of a note changed last, so the learner's tags can be overwritten.
- **AnkiHub** syncs a deck's tags live and wipes a subscriber's own tags unless each one is protected first. Its forum has many reports of lost tags.
- **Mochi** shares by copying, so a deck's tags arrive once and later changes never do.
- **Todoist**, outside flashcards, keeps your own labels apart from labels collaborators add in shared projects. A shared label with the same name as one of yours is treated as yours.

Every flashcard failure comes from two people writing tags on the same card. In Lymi only a card's owner writes to it, and a shared or published deck is one live deck rather than a copy ([ADR 0011](../adr/0011-a-shared-deck-is-one-deck-with-many-learners.md), [ADR 0020](../adr/0020-a-published-deck-admits-anyone-who-adds-it.md)). So a deck's tags stay current, and nothing a learner does can be overwritten.

## Decisions

- **A card's tags are part of the card.** Whoever can change the card changes its tags, as with its meaning. A member of a shared deck sees the owner's tags and can filter and review by them, but cannot change them or add their own to those cards.
- **The same name is the same tag across decks.** Reviewing "food" covers every card tagged "food" in every deck the learner studies, their own and joined ones alike.
- **Published decks name tags in the learner's edition.** A publisher's tag gets a localization per edition, like a section name ([ADR 0015](../adr/0015-published-decks-use-pinned-localized-editions.md)), so a Ukrainian-edition "їжа" joins the learner's own "їжа", not "food". Tag names count toward an edition being complete, so a published edition never shows a mix, and renaming a tag makes its localizations stale like any edited field. Until tag localizations exist, a non-original edition shows no publisher tags.
- **Typing suggests existing tags**, so near-duplicates stop multiplying.
- **Review a tag is a round.** It sits beside New cards and Forgotten today and draws from every deck. It takes the cards with that tag the learner has already started, due ones first, under the usual round rules in `CONTEXT.md`. Unseen cards stay with New cards, so a tag never opens a section early.
- **A Tags screen in Settings manages the learner's tags.** It lists each tag on their own cards with its card count. Renaming one to a name already in use merges the two, and archiving takes the tag off every card until it is restored. A joined deck's tags appear in filters and rounds, not here.
- **Tags are plain chips with no colour.** Colour already marks the one action, the AI badge and "You are here"; more would compete with the term ([`PRODUCT.md`](../../PRODUCT.md), "The words are the content").
- **The API keeps its shape.** A card's `tags` stays a list of names. Storage moves to a table, because renaming, archiving and restoring a tag across every card need one.

## Not in scope

- **Duplicating a joined or published deck** to own it. A member can't export a deck, and a copy would stop receiving corrections; it needs its own shape.
- **Editors changing a deck's tags.** That arrives with the editor role.
- **Grammar as tags**, such as part of speech. That belongs in card fields if it comes.

## Open questions

- **Naming.** "Deck tag" in `CONTEXT.md` already means a publisher's fixed labels on a published deck, such as Travel. These tags need a `Tag` entry that keeps the two apart, and perhaps a rename of the publisher's labels.
- **Private tags on shared cards.** A member can't organise a joined deck their own way, and an owner can't keep a tag from their members. Revisit if learners ask: it would make a card carry tags from two owners, which the API would then have to tell apart.

## Delivery

1. **Find and review by tag on the web.** Tags move to a table, typing suggests existing ones, the deck page filters by tag, and Review a tag runs across decks, joined ones included. Non-original editions hide publisher tags until slice 3.
2. **The Tags screen.** Rename, merge, archive and restore.
3. **Published tags per edition.** Publishers translate tag names, and each edition shows them once translated.
4. **The phone.** Each slice gets a linked phone issue once it is verified on the web ([ADR 0030](../adr/0030-the-phone-leads-the-daily-jobs-and-setup-stays-on-the-web.md)).

Each slice measures whether learners find and review by tag. A tag's name never reaches analytics.

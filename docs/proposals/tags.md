---
status: accepted
date: 2026-10-12
decision: A tag is the learner's own label for finding and reviewing cards across decks; the tags an owner puts on a deck's cards reach its learners read-only
---

# Tags that find and review cards

A learner should be able to pull one slice of everything they study, such as every food word across an Italian deck and an Estonian class deck, and review it or narrow a deck to it. Sections and series group within one deck or one chain of decks; a tag cuts across them.

Today a tag does almost nothing once typed. [`docs/data-model.md`](../data-model.md#tags-and-source) stores tags as a JSON list of names on each card, up to 20 of 40 characters. The card form takes them without suggesting existing ones, so "verbs" and "Verbs" become two tags. They show on the word screen and after reveal on the review card. Nothing in the app filters or reviews by them; only card search in the API and MCP does. Imports bring them in and exports write them out.

## Evidence

Other apps, checked 11 October 2026 from their manuals and forums:

- **Anki** stores a shared deck's tags in the same field as the learner's. Importing a newer version of the deck keeps whichever copy of a note was changed last, so the learner's own tags can be overwritten.
- **AnkiHub** syncs a deck's tags live and wipes a subscriber's own tags unless each is listed as protected on its website first. Its forum has many reports of lost tags.
- **Mochi** shares by copying, so a deck's tags arrive once and later changes never do.
- **Todoist**, outside flashcards, keeps your labels and labels collaborators add in shared projects in two lists. Shared ones are grey and vanish once unused; a shared label matching one of yours by name joins it.

The failure in every flashcard case is one list holding two owners' tags. Lymi has no copy step to fight: a shared deck and a published one are both one live deck ([ADR 0011](../adr/0011-a-shared-deck-is-one-deck-with-many-learners.md), [ADR 0020](../adr/0020-a-published-deck-admits-anyone-who-adds-it.md)).

## Decisions

- **Every tag belongs to one learner.** A learner sees their own tags, plus the tags the owner put on cards in decks they study. A member's own tags on a joined deck are private to them, and only the owner, or later an editor, changes the deck's.
- **An owner's tags on their own deck are the deck's tags.** Every learner of the deck can see them, filter by them and review by them, but cannot change them.
- **Published decks follow the same rule.** A publisher's tags are live and read-only, and are translated per edition like section names under [ADR 0015](../adr/0015-published-decks-use-pinned-localized-editions.md). Until an edition has its tags translated, learners of that edition don't see them.
- **One name, one tag, for finding and reviewing.** Filtering or reviewing "food" covers the learner's "food" and every deck's "food". Renaming or archiving changes only the learner's own tag.
- **Tags are plain chips with no colour.** Colour already carries meaning: amber is the one action, violet is the AI badge, and green is "You are here". A fourth colour system on a card would compete with the term ([`PRODUCT.md`](../../PRODUCT.md), "The words are the content").
- **Typing suggests existing tags**, so near-duplicates stop multiplying.
- **Reviewing a tag is a round.** **Review a tag** sits beside New cards and Forgotten today, and runs across every deck. It takes every card with that tag that the learner has started, due cards first, and follows the round rules in `CONTEXT.md`: each card comes once, and every grade counts. Unseen cards stay with New cards, so a tag round never opens a section early.
- **Management lives on a Tags screen in Settings.** It lists each of the learner's tags with its card count. Renaming one to a name already in use merges the two, and archiving takes the tag off every card until it is restored.
- **The payload keeps its shape.** Cards in the API, MCP and frozen phone contracts keep `tags` as a list of names. Storage moves to a table, since renaming and per-learner tags on shared cards need one.

## Not in scope

- **Duplicating a joined or published deck** to own it fully. It conflicts with a member being unable to export, and with corrections reaching everyone; it needs its own shape.
- **Editors changing a deck's tags.** That arrives with the editor role, not with tags.
- **Grammar as tags**, such as part of speech or gender. That belongs in card fields if it comes.

## Open questions

- **Naming.** "Deck tag" in `CONTEXT.md` already means a publisher's fixed labels on a published deck. The card's tags need a `Tag` entry that keeps the two apart, and possibly a rename of the publisher's.
- **Private owner tags.** This shape assumes an owner never wants a tag on their own shared deck that members can't see. If that need appears, an owner's tag would gain a private setting.

## Delivery

1. **Find and review by tag on the web.** Tags move into their own table with the payload unchanged, typing suggests existing tags, the deck page filters by tag beside state, due and section, and Review a tag runs across decks. A member already sees the owner's tags, so a member can filter and review by them too.
2. **Personal tags on joined decks.** A member tags a shared or published deck's cards privately, and same-name tags join for finding and reviewing.
3. **The Tags screen.** Rename, merge by renaming, archive and restore.
4. **Publisher tags per edition.** Tag names become localizable for published decks, and non-original editions show them once translated.
5. **The phone.** Each slice above gets a linked phone issue once it is verified on the web ([ADR 0030](../adr/0030-the-phone-leads-the-daily-jobs-and-setup-stays-on-the-web.md)).

Each slice should answer whether learners use tags to find and review, without ever sending a tag's name to analytics.

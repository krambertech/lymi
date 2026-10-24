# Deck tags

The owner's deck settings carry a **Tags** row that opens the deck's Tags page: each tag in use with its count and **Rename…**, **Merge into…** and **Archive** in its ⋯, then **Archived tags** with **Restore**. Rename refuses a name already on the deck; Merge into… asks in iOS's alert before it merges. Past fifteen tags, **Find a tag** in the bar opens the phone's search over the same rows. Every change stays in this deck.

## Reach

A deck you own, its settings, then **Tags**.

## Drive

[`deck-tags.yaml`](deck-tags.yaml), as `learner`, on Lezione 12, whose seed tags are verb, reflexive, noun and money: rename noun and take **Undo**; rename reflexive to verb and see it refused; take **Merge into…** on reflexive, choose verb, take **Keep both** in the alert, then do it again and take **Merge**; merge verb into noun the same way; archive money and take **Undo**; archive it again and take **Restore** under **Archived tags**.

[`deck-tags-search.yaml`](deck-tags-search.yaml), after [`deck-tags-search.mjs`](deck-tags-search.mjs) spreads fourteen more tags over the deck: take **Find a tag**, type **ba**, archive banca from its ⋯ and take **Undo** in the search's own toast, then type on to see **No tags match**.

## End state

[`deck-tags.mjs`](deck-tags.mjs) reads the deck's tags back: noun on three cards, money on three, nothing archived. [`deck-tags-search.mjs`](deck-tags-search.mjs) reads banca back in use.

## Gotchas

- A row reads **name, N cards**, and its ⋯ is **Options for name**.
- The ⋯ and the merge question are iOS's own menu and alert, so their rows and buttons are found by their labels once they show.
- A row in Merge into… reads **name, N**, its count without "cards".

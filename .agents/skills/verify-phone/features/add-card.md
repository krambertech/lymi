# Add a card

Capture on the phone: a sheet that writes a term and its meaning into a deck, with the AI filling the rest when it is on. The card is written to the card outbox and reaches the Worker in the background (ADR 0023). ADR 0034 puts capture in the top bar.

## Reach

**Add a card** in the top bar of Today, Library or You, or a deck row's long-press menu.

## Drive

[`add-card.yaml`](add-card.yaml), as `learner` from Today: press **Add a card**, check the deck pill names the first deck, open it and check the deck **streak** shares with the learner is not offered, turn **Fill in the rest with AI** off if it is on, type **il collaudo** in Term and **the acceptance test** in Meaning, press **Add to** the deck, and close the sheet with **Done**.

## End state

The sheet confirms **Added “il collaudo” to** the deck. [`add-card.mjs`](add-card.mjs) finds the card through `/api/cards?query=` in that deck with that meaning, and `/api/dev/state` counts one more card.

## Gotchas

- A fresh Simulator teaches the slide-to-type keyboard once with a **Continue** tip over the sheet; the flow closes it when it shows.
- Capture remembers the AI switch between opens, so the flow turns it off only when the Meaning placeholder says the AI fills it in.
- With the AI on, the card waits for enrichment, which a local Worker without a vendor key cannot do; turn it off to prove capture alone.
- [`add-card.mjs`](add-card.mjs) has the learner join a `streak` deck through its join link first, resetting `streak`; a card can only be added to a deck the learner owns.
- The term is fixed, so the check fails loudly if a persona ever seeds it.

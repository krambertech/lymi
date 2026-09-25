---
status: accepted
date: 2026-09-05
---

# A duplicate is the same term in the same language anywhere, and adding one is skipped

A duplicate is a card whose normalised term (trimmed, case-folded, accents kept) and language match an active card anywhere in the learner's decks, not only the target deck. Adding one is not an error. The add returns per-card outcomes, a duplicate is reported as skipped with the existing card's id, and the rest of the batch goes through. A card with no language matches only other cards with no language.

First-party publishers may opt into cross-deck overlap when staging a curated deck through the batch API. Only an account in `PUBLISHER_EMAILS` may use `publisherOverlap=true`; the same term in the target deck is still skipped. Ordinary learner adds and publisher adds without that option keep the default rule. This lets a published deck stand alone without changing a learner's own add behavior.

## Considered options

- Same deck only. Rejected: "sbrigarsi" in two Italian decks is one word already known, and the cross-deck index on user and term already exists.
- Reject the batch with 409. Rejected: MCP clients retry, and one repeated term would fail a whole lesson.
- Add anyway, flagged, merge later in Activity. Rejected: creates the second lifecycle ADR 0001 avoided.

## Consequences

- Re-running the same `add_cards` call is safe. Idempotency comes from the rule, not from client-supplied keys.
- Moving a duplicate to another deck is an edit on the existing card, not a new add.
- The rule has to be applied on the single-card path too, so the web sheet reports "already in Italian A2" rather than adding a second copy.

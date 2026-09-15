---
status: accepted
date: 2026-09-13
---

# Review modes use explicit cues and targets

A card keeps its required term and meaning, may own one optional image, and expresses review behavior through a closed cue-target mode rather than a card type or arbitrary front-and-back layout.

## Context

Recognition and production currently describe which text field appears first. An image introduces two independent questions: whether it appears before reveal and which text answer the learner grades. Image presence alone cannot answer either question, and showing it automatically may weaken retrieval by providing an unintended clue.

The model must also preserve independent scheduling, append-only reviews, deck defaults with card overrides, sibling exclusion within a session, offline grade replay and existing API clients.

## Decision

The valid modes are term → meaning, meaning → term, image → term and image → meaning. The API represents each as a cue-target object; persistence uses one stable key per valid pair for indexes, scheduling state and review evidence.

Recognition remains a compatibility alias for term → meaning, production for meaning → term, and both for those two modes. Migration adds canonical mode identity before retiring legacy direction fields. Old browser bundles and queued offline grades remain accepted through a documented compatibility window.

Decks and cards use the same `reviewModes` list, and a card's list overrides its deck's. Picture modes are set on the card only, because a picture belongs to one card: a deck lists text modes, which its legacy direction already stores, and allowing picture defaults on decks later adds storage without changing the API. A card whose modes are all picture modes is asked in the text mode with the same target until it has an eligible picture. ADR 0007's filter behavior remains: disabling a mode makes its state ineligible but never deletes it. An image mode is eligible only while the card has an active image and a non-answer-revealing description.

The cue is the content shown before reveal and the target is what the learner grades. Other card content may appear after reveal as context. Only one mode for a card may occur in a review session.

Amended on 13 September 2026: picture modes moved from deck defaults to cards, keeping one mode format for both.

## Considered options

- **A separate picture-card category:** rejected because one remembered concept would split across incompatible models.
- **Attach the image to term or meaning:** rejected because field ownership does not say whether the image is a prompt or revealed context.
- **Infer picture review from image presence:** rejected because it removes learner control and may leak the answer.
- **General content blocks on arbitrary sides:** deferred because it admits invalid combinations and expands layout, accessibility, scheduling and API semantics beyond the accepted need.

## Consequences

Adding a future cue or target requires a product decision and a new validated union member. Replacing the current image does not change the card's identity or reset its schedule, while archive and restore preserve inactive image-mode state and review history.

The expand-and-contract migration is part of the contract, not optional release choreography. Legacy fields can be removed only after supported clients and offline outboxes no longer depend on them.

The accepted behavior and delivery outline are in [the product proposal](../proposals/card-images-and-visual-review.md).

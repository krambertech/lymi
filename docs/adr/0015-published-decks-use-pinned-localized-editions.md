---
status: accepted
date: 2026-09-13
---

# Published decks use pinned localized editions and learner-controlled updates

A published deck remains the one live deck decided by [ADR 0011](0011-a-shared-deck-is-one-deck-with-many-learners.md). Its existing text is the original meaning-language edition, optional typed localization rows provide additional editions, and each member pins one meaning language when adding it. Owners edit current canonical content; learners keep personal progress and choose when new or materially changed learning behind that progress enters review.

## Context

First-party catalog content needs maintained meanings in every language Lymi claims to support without copying a deck and synchronizing its structure several times. Community decks should remain ordinary decks with one owner-chosen meaning language. Learners also need corrections promptly without an owner silently expanding or replacing material they already passed.

[ADR 0013](0013-app-language-is-one-setting-that-meaning-language-follows.md) correctly makes personal AI enrichment follow app language. Published editions need a narrow exception because the visitor chooses an already-authored content edition before adding it and changing that choice later would mutate learned prompts beneath existing progress.

## Decision

Existing deck and card fields hold the original edition. Additional meaning languages use explicit localization tables for series, deck, section, and card fields, keyed by content identity and meaning language. Localizations record provenance, editorial status, and the canonical revision on which they are based; the model does not use generic field-name/value rows or separate localized decks.

The selected meaning language is stored on the published membership and cannot be changed after adding. App-language changes continue to control the interface and personal enrichment but do not switch an existing published membership to another edition.

Published content is live. Corrections apply automatically and never rewrite reviews. New future sections follow ordinary progression. New cards or material term or meaning changes behind a member's current position wait for **Review changes** before becoming learning-eligible. The member always sees current content; Lymi records changes and acknowledgements rather than retaining historical deck snapshots.

## Considered options

- Store each localization as a separate deck. Rejected because structure, corrections, sources, and progression would drift.
- Move every personal meaning into localization tables. Rejected because ordinary and community decks do not need that complexity.
- Pin members to immutable deck snapshots. Rejected because arbitrary release storage and progress migration complicate routine owner edits.
- Apply every new card to every queue immediately. Retained for flat private shared decks under ADR 0011, but rejected for progressive published material a learner may already have passed.

## Consequences

- Existing private decks require no localization, publication, or edition records.
- Adding a published deck grants access rather than copying cards or running duplicate detection. A matching personal card may coexist as ADR 0011 already permits.
- Stable card identities preserve personal schedules through corrections and moves; a fundamentally different prompt or answer receives a new card identity.
- Revision and acknowledgement writes must be append-only or otherwise auditable, idempotent under retries, and safe while an owner edits and members review concurrently.
- Public AI assistance may fill drafts without overwriting human work, but an authorized human publishes every first-party or community edition.
- The interface must distinguish the app language from a published deck's pinned meaning language without introducing another global setting.

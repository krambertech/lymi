---
status: in_progress
date: 2026-09-06
decision: one live owner-written deck with independent learning for every member
issues:
  - https://github.com/krambertech/lymi/issues/70
---

# Shared decks

## Outcome

An owner shares one private deck link. A classmate can inspect the deck, sign in, join once, and study it on their own schedule. Later owner edits reach every member, while review state and history stay private to each learner.

The central rule is: the group shares the material; each person owns their learning. [ADR 0011](../adr/0011-a-shared-deck-is-one-deck-with-many-learners.md) owns the data and access model.

## V0 behavior

- One owner writes the canonical content. Members can study but cannot change it.
- One revocable join link admits members. Turning sharing off keeps current members but permanently invalidates the URL; enabling it again creates a new one.
- The join page shows the deck name, owner, card count, and a few examples without putting card content in link-preview metadata.
- Only the owner sees the member list. Members see the owner's name, never other members or their progress.
- A member may leave and later rejoin through an active link with progress intact. An owner may remove a member without deleting their history; the generic link cannot immediately readmit that account.
- Join, leave, removal, link creation, and revocation are visible in the owner's Activity without exposing review data.
- The app, API, and MCP apply the same member read and owner write boundaries.

Named invitations, editor and contributor roles, contribution moderation, copying after leaving, member-progress visibility, ownership transfer, public decks, assignments, grades, chat, and trying a deck before joining remain later decisions.

## Delivery

The membership foundation and share-and-join flow are present. The remaining v0 work is tracked in [issue 70](https://github.com/krambertech/lymi/issues/70).

1. Expose the owner-only member list and removal controls without returning member review data.
2. Make shared decks clearly read-only for members throughout Library, deck, card, API, and MCP surfaces.
3. Let members leave and safely rejoin while preserving review state; keep owner-removed accounts blocked from the generic link.
4. Verify the complete two-learner journey, authorization boundaries, retry behavior, Activity entries, and phone and desktop states.

Production migrations and deployment require separate authorization.

## Done when

- A member can study the same canonical deck with independent schedules and reviews.
- Owner changes appear for members without changing the owner's queue.
- No member can enumerate other members, edit content, or read another learner's progress.
- Join, leave, rejoin, removal, revocation, and retries preserve one membership and append-only evidence.

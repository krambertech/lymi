# Shared decks

**Status:** Membership foundation merged 12 September 2026. The remaining v0 was shaped 13 September 2026 and is tracked in [issue 70](https://github.com/krambertech/lymi/issues/70). Decisions are in [ADR 0011](../adr/0011-a-shared-deck-is-one-deck-with-many-learners.md), vocabulary in [CONTEXT.md](../../CONTEXT.md), and rejected options in [the proposal](../proposals/shared-decks.md).

## Outcome

The owner posts one link in a class chat. A classmate opens it on a phone, sees the deck's name, owner, card count, and a few example cards, signs in with Google, joins once, and lands in the shared deck. They review on their own schedule. Cards the owner adds later appear as new for the classmate. The owner can see and remove members but cannot see their learning progress.

## Decisions

- A shared deck is one live deck with one owner and many learners. The owner writes the content; every learner owns their review state and history.
- V0 admits people through one active join link per deck. Named Google-email invitations follow in v1.
- The owner alone sees the member list. Members see the owner's name, not other members.
- Leaving preserves progress and permits rejoining through the active link. Removal by the owner preserves progress and blocks the generic link; named invitation re-admission follows in v1.
- Turning sharing off removes nobody and permanently invalidates that URL. Enabling sharing again creates a new URL.
- The join page lives at `my.lymi.app/join/<token>`, shows deck metadata and a few example cards but keeps cards out of its link-preview metadata, and returns a successful join to the shared deck.

## Current foundation

[PR 51](https://github.com/krambertech/lymi/pull/51) added `deck_members`, per-learner card states, member-scoped reads, owner-only content writes, state fan-out, internal join/leave/remove services, and deck responses carrying the caller's role and owner. Its concurrency, retry, direction-change, and archive/restore paths are covered by service tests. No invitation, join route, sharing interface, or two-learner browser journey exists yet.

## Slice 1: Share and join

**Delivers:** An owner can enable sharing, copy a link, and turn it off. A signed-out classmate can follow the link through Google sign-in and arrive in the deck as a member.

- Add deck invitations with link invitations only in v0. A deck has at most one active link; revocation is permanent and a later enable creates a new unguessable token.
- Keep tokens, account identifiers, and join cookies out of logs, telemetry, fixtures, screenshots, and error messages.
- Add owner-only operations to create, read, and revoke the current join link.
- Let a valid link admit an otherwise unallowlisted Google account. Carry the invitation through sign-in in a short-lived HttpOnly cookie and complete the membership in the session hook idempotently.
- Route `/join/<token>` on the product origin while exact `/join` continues to the public beta page.
- Render live, turned-off, and archived join-page states on the server with accurate Open Graph metadata. Signed-out visitors see **Join with Google**; signed-in non-members see **Join**; existing members see **Open deck**.
- Add a Sharing section to the owner's deck settings with enable, copy, and turn-off controls. The interface never presents an old revoked URL as reusable.

### Acceptance evidence

- [ ] A valid link shows the deck name, owner, card count, and up to three example cards, and its title and Open Graph tags carry no card content.
- [ ] A signed-out, unallowlisted Google account can join through a valid link and lands in the shared deck.
- [ ] A signed-in learner can join directly; repeated posts and repeated auth callbacks create one active membership and no duplicate states or audit entries.
- [ ] A malformed, revoked, or archived-deck link cannot admit an account or create membership.
- [ ] Turning sharing off leaves current members in the deck, makes the old URL permanently invalid, and enabling it again produces a different URL.
- [ ] Existing owner-only deck and card journeys still pass.

## Slice 2: Manage and study

**Delivers:** The shared deck is recognisably read-only for a member, and both owner and member can manage access without losing learning history.

- Show the owner an owner-only member list with joined dates and Remove controls. Tighten the existing member-list service before exposing it; members must not be able to enumerate one another.
- Show shared decks in Library with the owner's name.
- Make a member's deck and card surfaces read-only. Hide owner actions while keeping server-side refusals for app sessions, API keys, and OAuth tokens.
- Give members **Leave deck**. A self-leaver can rejoin through the active link and resumes the preserved schedule; someone the owner removed remains blocked in v0.
- Record join, leave, removal, link creation, and link revocation in the owner's Activity without exposing member progress.
- Confirm the existing API and MCP read contracts return shared decks with role and owner, and that every content write by a member returns 403.

### Acceptance evidence

- [ ] Only the owner can list or remove members, and the owner sees no member review data.
- [ ] A member can see the deck and cards, trigger audio, and grade only their own states.
- [ ] A member cannot add, edit, move, archive, restore, enrich, or change the deck through the interface, API, or MCP.
- [ ] A card the owner adds after the join appears as new for the member without changing the owner's queue.
- [ ] Leaving removes the deck from Library without deleting states or reviews; rejoining through the active link restores access and progress.
- [ ] Owner removal removes the deck from Library and blocks the active generic link for that account.
- [ ] Activity identifies access changes without disclosing private review state.

## Verification

- Run the closest service and route tests first, including every admission gate, link state, idempotent callback, authorization boundary, and membership transition.
- Add one Playwright journey with two isolated signed-in browser contexts: share, join, review, add a later card, leave and rejoin, remove, and verify the old link cannot restore access.
- Run the journey in Chromium and WebKit. Inspect the join page and Sharing section at phone and desktop sizes, both themes, keyboard-only, loading, error, success, and reduced-motion states.
- Verify fetched join-page HTML contains the expected title and Open Graph metadata and no card content.
- Before declaring a release complete, verify the migration on disposable D1 state, run `pnpm check`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and the deployment dry-run. A production deploy and live classmate test require separate authorization.

## Delivery order

1. **Share and join:** the first vertical slice above, including its owner control and browser journey.
2. **Manage and study:** the second vertical slice above, blocked by Share and join.

Each slice should fit one focused pull request and remain deployable. Contract descriptions and regression tests belong to the slice that changes the behavior rather than a separate horizontal integrations pull request.

## V1 and out of scope

V1 adds named Google-email invitations and lets the owner re-admit a removed learner by name. Editor and contributor roles, contribution moderation, email delivery, personal notes or pausing on shared cards, copying after leaving, member-progress visibility, ownership transfer, public decks, assignments, grades, class chat, and trying cards before joining remain outside v0.

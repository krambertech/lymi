---
status: accepted
date: 2026-09-23
---

# Open tabs hear about changes from a Durable Object per learner

Each learner has one Durable Object, `LiveChannel`, that holds a WebSocket for every open, visible tab. After a write lands, the Worker tells the channel, and the channel tells every tab except the one that made it. The message names nothing: a tab refetches what it shows through TanStack Query, so a change from an assistant, an API key, a background job or another device appears within a second or two without a reload.

## Context

Changes made outside the open tab, such as cards an assistant adds over MCP or a grade on the phone, appeared only after a reload or a return to the screen. A Worker request cannot reach another request, so only a Durable Object can carry a write to an open tab as it happens. [stack.md](../stack.md) had named one per learner as a later option.

## Decision

**What announces.** A successful non-GET request under `/api`, an MCP tool call that wrote an audit row, and each step of the enrichment, import and export workflows that writes. The announcement runs after the write, under `waitUntil`, and a failure never fails the write.

**What a tab does.** It refetches its active queries after a short pause that gathers a burst into one refetch, and marks the rest stale. The order a review round was fetched in is left alone, because a review keeps its order; the draw refetches, and the card on screen stays put ([ADR 0019](0019-the-review-queue-is-a-deterministic-weighted-draw.md)). An open card editor keeps what it copied, and the last save wins.

**When it is connected.** Only while the tab is visible and online. A tab that was hidden or offline refetches once when it reconnects, so nothing depends on a message it missed.

**Who may connect.** The learner's session, from the product's own origin. The handshake carries the session cookie, and a sibling site on the same registrable domain must not open a channel with it.

**No echo.** Every request carries the tab's id in `x-lymi-tab`, and the channel skips the socket tagged with it.

## Considered options

- **Poll a cheap "anything new?" endpoint.** Rejected: 10 to 20 seconds late, and a steady request from every open tab.
- **Refetch on focus more widely.** Rejected: nothing changes on a screen being watched.
- **Server-sent events from the Worker.** Rejected: the stream would have to poll the database itself, because the request that writes cannot reach it.
- **A hosted service such as Pusher or Ably.** Rejected: a second vendor, credential and bill for what the platform already has.
- **Messages that carry the change.** Deferred: patching the cache from a message means a second, per-resource contract, while a refetch reuses the reads the screens already trust.

## Consequences

- The Worker has its first Durable Object binding and migration. The object stores nothing, and hibernation keeps idle sockets from billing duration.
- A change reaches only the learner's own tabs. A shared deck's members still catch up at their next request ([ADR 0022](0022-a-member-catches-up-on-card-states-at-their-next-request.md)); the channel is where their announcement would go.
- A write that goes around the service layer or the routes, such as one straight to D1 from a script, reaches no tab.
- Every write refetches every active query of the other tabs. That is cheap for one learner's screens, and messages that name a resource would narrow it if it ever is not.
- iOS suspends a backgrounded installed app's socket, and the refetch on return covers the gap.

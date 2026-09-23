---
status: accepted
date: 2026-09-23
---

# Open tabs hear about changes from a Durable Object per learner

Each learner has one Durable Object, `LiveChannel`, that holds a WebSocket for every open, visible tab. After a write lands, the Worker tells the channel, and the channel tells every tab except the one that made it. The message names nothing: a tab refetches what it shows through TanStack Query, so a change from an assistant, an API key, a background job or another device appears within a second or two without a reload.

## Context

Changes made outside the open tab, such as cards an assistant adds over MCP or a grade on the phone, appeared only after a reload. A Worker request cannot reach another request, so only a Durable Object can carry a write to an open tab as it happens.

## Decision

**What announces.** A successful non-GET request under `/api`, an MCP tool call that wrote an audit row, and each step of the enrichment, import and export workflows that writes. The announcement runs after the write, under `waitUntil`, and a failure never fails the write.

**What a tab does.** It refetches its active queries after a short pause that gathers a burst into one refetch, waits while a write of its own is in flight, and marks the rest stale. The order a review round was fetched in is left alone, because a review keeps its order; the draw refetches, and the card on screen stays put ([ADR 0019](0019-the-review-queue-is-a-deterministic-weighted-draw.md)). An open card editor keeps what it copied, and the last save wins.

**When it is connected.** Only while the tab is visible and online. The channel counts the learner's changes and greets each tab with the count, so a tab that was hidden or offline refetches on return only if the count moved. A tab whose handshake keeps failing, signed out or on a preview Worker with no channel, stops trying until it is shown or back online. An open socket shows the server can be reached, so it also sends what the device queued ([ADR 0023](0023-offline-writes-queue-on-the-device-and-replay-in-order.md)).

**One refresh.** A change from elsewhere and queued writes landing on return share one pause and one refetch, which leaves a fetch already on its way to land rather than cancelling it. The refetch reads through the lists that lay still-queued writes over the server's answer, so a refresh never hides a card made offline.

**Who may connect.** The learner's session, from the product's own origin only, because the handshake carries the session cookie from any same-site page.

**No echo.** Every request carries the tab's id in `x-lymi-tab`, and the socket tagged with it gets only the new count.

## Considered options

- **Poll a cheap "anything new?" endpoint.** Rejected: 10 to 20 seconds late, and a steady request from every open tab.
- **Refetch on focus more widely.** Rejected: nothing changes on a screen being watched.
- **Server-sent events from the Worker.** Rejected: the stream would have to poll the database itself, because the request that writes cannot reach it.
- **A hosted service such as Pusher or Ably.** Rejected: a second vendor and bill for what the platform has.
- **Messages that carry the change.** Deferred: patching the cache from a message means a second, per-resource contract, while a refetch reuses the reads the screens already trust.

## Consequences

- The Worker has its first Durable Object binding and migration. The object stores one number, and hibernation keeps idle sockets from billing duration.
- Preview Workers have no channel: Cloudflare serves no preview URL for a Worker with a Durable Object, and a version upload cannot apply its migration.
- A change reaches only the learner's own tabs. A shared deck's members still catch up at their next request ([ADR 0022](0022-a-member-catches-up-on-card-states-at-their-next-request.md)); the channel is where their announcement would go.
- A write that goes around the service layer or the routes, such as one straight to D1 from a script, reaches no tab.
- Every write refetches every active query of the other tabs. That is cheap for one learner's screens, and messages that name a resource would narrow it if it ever is not.
- iOS suspends a backgrounded installed app's socket, and the refetch on return covers the gap.

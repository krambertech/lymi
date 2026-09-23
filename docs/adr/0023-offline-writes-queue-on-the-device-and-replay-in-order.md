---
status: accepted
date: 2026-09-23
---

# Offline writes queue on the device and replay in order

A learner's card and deck writes go through a write outbox in `apps/web/src/client/lib/writes.ts`, next to the grade outbox. Each write is kept on the device before it is sent. It shows in the cached lists at once and replays in the order it was made when the connection returns. The server stays the only source of truth. The client never merges state; it replays intents the server can apply twice without harm.

## Context

Reviews already worked offline: the query cache survives reloads, and grades queue in `lymi-outbox` and replay safely because the server ignores a grade older than the state's last review. Every other write needed the network. Adding a term on a train failed with "Couldn't reach Lymi", and a mutation paused by Query was lost on reload. The query cache is also thrown away on every deploy through its buster, so it cannot hold anything that has not reached the server.

## Decision

**What queues.** Adding, editing, archiving and restoring a card, and creating, editing, archiving and restoring a deck. Pictures, imports, exports, sharing, series, sections, keys, account and published decks stay online-only and say so when they fail.

**Ids are made on the device.** `POST /api/cards`, `/api/cards/batch` and `/api/decks` take an optional `id` in `newId`'s alphabet. A create sent again with the same id returns what the first one made, with no second row or audit entry. An id another learner holds is a 409. A card or deck made offline can therefore be edited, archived, or have cards added to it before the server has seen it.

**Replay is idempotent without new bookkeeping.** Edits send only the changed fields, so a repeat sets the same values. Archive and restore change nothing when the item is already there. Edits are last-write-wins per field, in the order the server receives them. Enrichment only fills fields that are still empty, so an offline edit is never overwritten by AI text.

**Order and holds.** One flush runs at a time, under a Web Lock across tabs. Writes go oldest first, and before each one the grades made before it are sent, so the server sees one timeline. Offline or a 401 stops the flush and keeps everything. A 408, 429 or 5xx backs off, from 2 seconds doubling to 5 minutes, and holds every later write to the same item. Any other refusal drops the write and every later write that needed what it would have created, and the learner is told once. A card add that the server skips as a duplicate is reported the same way.

**What the screen shows.** A write updates the cached deck list, archived lists and deck card lists at once. The same lists send what is waiting before they fetch, then lay any write still waiting over the answer, so a refetch never hides it. While online, every deck's cards, sections and draw are fetched once in the background, so a deck opened for the first time offline still works.

**Storage.** The outbox is localStorage key `lymi-writes`, apart from the busted query cache. When storage is full, the query cache is dropped to make room, because it can be fetched again. The app asks for persistent storage. Sign-in keeps both outboxes. `lymi-queued-for` records whose they are, and they are dropped only if a different account signs in. Sign-out still asks before discarding anything unsent.

## Considered options

- **A sync engine (Replicache, Zero, PowerSync, Electric, RxDB) or a CRDT store.** Rejected: each needs a server-side change log or its own backend, and D1 has neither. That is a second data model for one learner's app. A Durable Object per learner with its own SQLite stays the later option in [the stack](../stack.md).
- **Query's persisted paused mutations.** Rejected: they live in the cache the deploy buster discards, resume only through registered defaults, and do not order across mutation keys.
- **An idempotency-key table.** Rejected for now: the ids on creates, plus writes that are already idempotent, cover every queued write without a migration.
- **Conditional edits that refuse a stale field.** Deferred: they would protect a newer edit from another device, but they need a base value on every patch. That is rare for one learner, and the cost is a changed API contract.
- **IndexedDB for the outbox.** Deferred: the review draw reads outboxes synchronously, and the outbox is small; the query cache is the one that would benefit.

## Consequences

- A learner can add, edit and archive cards and decks offline, and nothing they did is lost to a reload, a deploy, a lapsed session or a full disk.
- An older offline edit can overwrite a newer edit of the same field made on another device.
- A card added offline does not appear in that device's review until it has synced, because its states are the server's.
- A new write kind needs an entry in `writes.ts` (send, and the ids it changes and needs) and in `write-projections.ts` if it shows in a cached list.
- A queued write that fails its replay is dropped and reported rather than kept forever, so a server-side refusal cannot block the queue.

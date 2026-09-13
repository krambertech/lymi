# Daily review goal and rolling queue

**Status:** Step 1 completed by #65. Steps 2 to 5 are superseded by [ADR 0018](../adr/0018-the-review-queue-is-a-deterministic-weighted-draw.md) and replaced by [the review draw plan](2026-09-13-review-draw.md); the persistence and session design below is historical.

## Done when

- Every acceptance case in the proposal is automated or explicitly manually verified.
- Reload, background refill, foreground, reconnect, remount, and phone-to-laptop movement preserve the current card, stable unseen order, and accepted progress.
- The server alone confirms `goal_met`, a smaller non-empty `exhausted` day, or `nothing_due`; an empty local buffer never completes a day.
- Forgot, retry, duplicate, offline replay, and Undo produce one authoritative attempt count from append-only review facts.
- Queue selection preserves due learning and relearning priority, one direction per card, a roughly four-to-one review/new mix, and the 20-item buffer with refill at 10.
- Daily progress, streak, seven lights, and completion agree across devices and learner-local timezone changes without rewriting completed history.

## Open work to integrate

The pull requests active during planning were checked on 13 September 2026. Refresh their heads before implementation because they were opened independently from `main` and edit overlapping files.

| Pull request | Ownership in this work |
| --- | --- |
| [#63, deck review plate](https://github.com/krambertech/lymi/pull/63) | Preserve its shared `asked` predicate, distinct-card due totals, and deck-scoped Review entry. Extend that selector instead of adding another due-count path. |
| [#64, review motion](https://github.com/krambertech/lymi/pull/64) | Preserve its review layout, reveal and grade motion, keyboard and reduced-motion paths, reveal hint, audio error, and persisted-state cleanup. Replace only its disposable queue position and progress state. |
| [#65, persistent streak](https://github.com/krambertech/lymi/pull/65) | Revise or supersede it as step 1. Reuse its modal, goal picker, calendar, lights, and composition, but do not merge its old goal and streak behavior as an interim implementation. |
| [#66, sidebar highlight](https://github.com/krambertech/lymi/pull/66) | Already on `main`; preserve its exact Library matching through Shell conflict resolution. |

#63 and #64 can land as foundations after their checks pass. Rebase the revised #65 after them, or supersede it if retaining its branch makes the change harder to review. Daily-goal mutation remains learner-only in the streak modal; remove #65's duplicate Settings editor and MCP mutation.

## Persistence and synchronization

`reviews` and `review_undos` remain authoritative for attempts. Add an immutable `review_day_id` to each accepted review and a `review_days` row per learner-local date with the snapshotted goal, timezone, zero-due confirmation, and outcome: `open`, `goal_met`, `exhausted`, or `nothing_due`. Counts are derived from non-undone reviews, not a second mutable counter; pre-feature history retains its previous meaning.

Extend `user_settings` with the suggested goal, a chosen marker, review timezone, Automatic or Manual mode, and the last accepted foreground update. A visible authenticated page may update Automatic timezone; hidden pages, service workers, and background polling may not. Per-device reminder timezones remain separate.

Store one revisioned `active_review_sessions` row per learner in D1. Its versioned manifest contains the current item reference, stable unseen references, timed retries, excluded sibling card ids, unresolved forgotten directions, review ids, optional deck scope, and `daily`, `forgotten`, or 10-attempt `extra` mode. Card content remains in existing tables.

Keep a versioned, user-scoped hydrated mirror locally for immediate and offline resume, and clear it through #64's persisted-state cleanup. Each grade is reduced locally before sending its pre-generated review id, reviewed-at instant, day context, session id, and revision. The server validates and applies the same transition atomically. Revision conflicts merge by review and card-state ids while preserving a still-valid visible current item; they never replace the session.

Refactor queue selection into due learning or relearning, ordinary review, and new lanes. Shuffle once within comparable urgency groups when admitting items. Exclude any card already current, buffered, timed, or completed in the active review, then append refills without reordering existing work. Offline retry timing uses the FSRS preview already carried by the queue item and converges through the existing outbox.

## Order of work

1. **Revise streak persistence and semantics.** Turn #65 into the accepted goal and review-day implementation; update core contracts, settings, stats, migration, and owning data/stack docs. Prove goal, exhausted, zero-due, missed-day, timezone, duplicate, and Undo behavior in service tests.
2. **Build the server-owned session.** Add the manifest, shared reducer, learner-only start/resume, refill, grade, undo, continue, and close operations. Extend #63's selector for priority lanes, new-card access, sibling exclusion, stable refill, and confirmed exhaustion. Prove cross-client resume and stale-revision merge.
3. **Replace component-local queue state.** Starting from #64, replace `index` and `done` with the durable reducer and local mirror, connect outbox replay and Undo, refill at 10, and reconcile on reload, foreground, reconnect, and resume without changing the current prompt.
4. **Finish the learner flow.** Add first-review goal choice, Automatic/manual timezone, goal-aware progress, and the three server-driven completion states. Wire Review forgotten, repeated 10-attempt extra rounds, Done, and Add cards into #64's presentation and #65's streak components rather than creating replacements.
5. **Verify release readiness.** Cover 50 attempts with Forgot and retries, a smaller exhausted queue, zero due, Undo at the boundary, offline replay, two browser contexts, DST and travel, keyboard, reduced motion, and phone/desktop states. Run `pnpm check`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and the affected Playwright suite.

## Delivery boundary

Do not add streak freezes, grace or recovery, a learner-facing new-card quota, future-card pulling to fill the goal, multiple simultaneous sessions, integration grading, a Durable Object, or a general synchronization framework. Confirm the deployed migration state before changing #65's migration; use a forward-only correction if it has reached a shared environment.

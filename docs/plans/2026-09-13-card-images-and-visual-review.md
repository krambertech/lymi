# Deliver card images and visual review

**Status:** Accepted on 13 September 2026. This plan implements the [accepted proposal](../proposals/card-images-and-visual-review.md) and [ADR 0014](../adr/0014-review-modes-use-explicit-cues-and-targets.md). It does not authorize resource provisioning, a shared or production migration, or deployment.

## Done when

- One private image per card and all four review modes work through the app, HTTP API and MCP.
- Existing recognition, production and both data, clients, active sessions and offline outboxes migrate without schedule changes, lost reviews or duplicate grades.
- Sibling modes stay separated within a session, and unavailable pictures never block text review or grading.
- Image upload, import, delivery, replacement, archive, restore, accessibility and account-scoped offline caching pass focused privacy, security and failure verification.
- `pnpm check`, `pnpm typecheck`, `pnpm test` and `pnpm build` pass, with mobile and desktop states inspected in supported themes.

## Dependencies

Issue 69 also persists review identity in active sessions. Before either change reaches shared schema, confirm what has landed and make session manifests use canonical mode keys so they are not migrated twice.

Inspect the migration history of every shared D1 environment before generating files. Never rewrite a migration that has reached a shared environment or edit Drizzle metadata by hand.

## Work

### 1. Establish the contract

Update `PRODUCT.md`, `DESIGN.md`, `CONTEXT.md`, `docs/data-model.md` and `docs/stack.md`; add the shared Zod-backed mode union and legacy mappings in `packages/core`; regenerate API documentation. Complete when app, HTTP, MCP and persistence use one conversion and invalid cue-target pairs cannot be represented.

### 2. Expand review persistence

Add nullable canonical mode fields beside legacy directions in decks, cards, card states, reviews and active-session manifests. Add a `card_images` table with opaque ID and object key, owner, dimensions, type, size, description, source kind, version, provenance, timestamps and archive state; enforce one active image per card while retaining archived versions. Generate and inspect an additive migration. Complete when current text review behaves unchanged with dual reads and writes.

### 3. Backfill without changing evidence

Map recognition to `term_to_meaning`, production to `meaning_to_term`, and both to their ordered pair in a resumable, idempotent backfill. Do not change FSRS values, due dates, ratings, timestamps or review facts. Keep accepting legacy payloads with their original idempotency keys. Complete when empty, current, partial and already-backfilled databases have no unmapped or duplicate mode identities and old queued grades replay once.

### 4. Build private image ingestion

Store normalized bytes in a dedicated private R2 binding and expose one application service to authenticated HTTP, MCP and app callers. Support upload, public-URL import, description edit, version-checked replace, authenticated versioned delivery, archive and restore. Block private destinations across redirects, sniff file signatures, bound time, bytes and pixels, reject SVG and animation, strip metadata, and keep the prior image on any fetch, transform, object or database failure. Complete when auth boundaries, SSRF cases, concurrent edits and orphan cleanup pass focused tests without private content in logs or errors.

### 5. Add the editing experience

Add one Picture section with upload, paste, device selection, description, processing, error, replace, conflict, archive and restore states. Expose learner-language review choices and explain missing eligibility when a deck default uses pictures. Complete when mobile and desktop flows are accessible and a description cannot accidentally be replaced by asynchronous work.

### 6. Add visual and offline review

Create image-mode states only for eligible cards, preserve state when an image is archived, and resume it on restore. Render the cue alone, then emphasize the target and show the other field as context. Prefetch only the current item and bounded buffer with user-scoped versioned cache keys; purge image data on sign-out or account switch. Complete when sibling exclusion, image failure fallback, session stability, offline replay and cross-account cache isolation pass.

### 7. Roll out and later contract

Deploy backward-compatible server behavior before enabling image editing or modes, then provision bindings and apply the additive migration only with separate authorization. If release health fails, hide new controls but continue serving stored images and accepting issued grades; never reverse reviews, delete objects or discard schedules. Remove dual writes and legacy fields only in a later migration after the supported offline window and observed legacy use have ended.

## Out of scope

Multiple or field-attached images, arbitrary layouts, AI generation or search, stock libraries, occlusion, SVG, animation, video, public-sharing rights and portable media export remain separate decisions. CSV stays text-only and states that pictures are excluded.

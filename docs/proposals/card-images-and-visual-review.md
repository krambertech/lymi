---
status: in_progress
date: 2026-09-13
decision: one optional image per card with explicit image-cued review modes
issues:
  - https://github.com/krambertech/lymi/issues/75
---

# Card images and visual review

## Outcome

Learners can remember visual material such as road signs, objects, people, places, and diagrams without creating a different kind of card. A picture may support a card or become its prompt, but Lymi never makes that choice implicitly.

## Accepted shape

A card may have one optional image. The image belongs to the card, while each review mode names both its cue and target: term to meaning, meaning to term, image to term, or image to meaning. [ADR 0014](../adr/0014-review-modes-use-explicit-cues-and-targets.md) owns this contract.

Only one mode for a card appears in a review session because revealing one sibling would compromise another. Image-cued modes are eligible only while the card has an active image and a useful accessible description. Removing an image suspends those modes without deleting schedules or review history; restoring or replacing it preserves the same card identity.

The term remains required because it identifies the card in Library, search, Activity, integrations, duplicate detection, and pronunciation.

## Product boundaries

The editor has one Picture section with upload, paste, device selection, description, replace, archive, and restore. API and MCP clients may upload bytes or provide a public HTTP or HTTPS URL.

A remote URL is an ingestion command, not stored display content. Lymi fetches it once, rejects private network destinations and unsafe formats, removes metadata, stores a private normalized copy, and serves it through an authenticated versioned URL. A failed replacement leaves the existing image untouched.

Review shows the cue alone before reveal, then emphasizes the target and keeps the other core field as context. Missing image content never blocks eligible text review or grading. Offline caches are bounded and cleared on sign-out or account change.

Multiple images, arbitrary layouts, AI image generation or search, stock libraries, image occlusion, SVG, animation, video, public-sharing rights, and portable media export are outside this proposal. CSV remains text-only.

## Delivery

1. Establish one shared cue-target contract across app, API, MCP, persistence, and documentation, including safe mappings from legacy directions.
2. Add image metadata and additive review-mode persistence without changing schedules, due dates, ratings, timestamps, or review evidence.
3. Build private ingestion, delivery, replacement, archive, and restore with bounded remote fetches, compare-and-set writes, and failure cleanup.
4. Add the editing experience and clear explanations for cards that are missing an eligible picture or description.
5. Add visual review and user-scoped offline caching while preserving sibling separation and text-mode fallback.
6. Roll out backward-compatible server behavior before enabling new controls; remove legacy fields only after the supported offline window ends.

Production storage, migrations, and deployment require separate authorization.

## Done when

- All four modes schedule independently without appearing as siblings in one session.
- Old clients and queued grades migrate without lost or duplicated review evidence.
- Image failures preserve the previous image, text review, and grading.
- Privacy, remote-fetch defenses, metadata removal, accessibility, and cross-account cache isolation pass focused verification.

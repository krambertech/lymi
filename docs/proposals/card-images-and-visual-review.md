---
status: accepted
date: 2026-09-13
decision: one optional image per card with explicit image-cued review modes
---

# Card images and visual review

## Opportunity

Learners should be able to remember something from how it looks, beginning with road-sign recognition and extending naturally to objects, people, places and diagrams. Images are established flashcard content in [Anki](https://docs.ankiweb.net/editing), [Quizlet](https://help.quizlet.com/hc/en-ca/articles/360030154311-Adding-your-own-images-to-sets), [Mochi](https://www.mochi.cards/docs/markdown/basic-formatting), [Brainscape](https://brainscape.zendesk.com/hc/en-us/articles/115002384072-How-do-I-add-images-sounds-to-flashcards), [RemNote](https://help.remnote.com/en/articles/6511625-image-occlusion-cards), [Knowt](https://help.knowt.com/en/articles/10716239-how-do-i-create-and-edit-flashcards) and [DuoCards](https://app.duocards.com/library/s/how-to-make-language-learning-with-flashcards-as-effective-as-possible).

The useful distinction is whether a picture is context or the prompt. A [2025 multimedia-vocabulary meta-analysis](https://www.sciencedirect.com/science/article/pii/S1747938X25000181) found benefits from combining words and pictures in some conditions, while [retrieval-practice research](https://eric.ed.gov/?id=EJ1318596) found that answer-revealing pictures can reduce later recall. Lymi should therefore never turn an attached picture into a cue implicitly.

## Accepted product shape

A card remains one thing worth remembering, identified by its required term and meaning, and may have one optional image. The image belongs to the card rather than to either text field and does not create a separate picture-card category.

A review mode names the cue shown before reveal and the target the learner grades:

| Cue | Target |
| --- | --- |
| `term` | `meaning` |
| `meaning` | `term` |
| `image` | `term` |
| `image` | `meaning` |

No other pairing is valid in the first version. Recognition maps to term → meaning, production maps to meaning → term, and both maps to those two modes. Decks provide defaults and cards may override them.

The target is prominent after reveal and the other core field remains visible as context. For image → meaning, for example, the learner sees the picture first, then grades the meaning while the term appears alongside it.

Only one mode for a card appears in one review session because revealing one sibling makes another dishonest. Image-cued modes are eligible only while the card has an active image and a description that does not reveal the answer. Removing an image suspends those modes without deleting their schedules or review history; restoring it resumes them. Replacing an image preserves scheduling because it remains the same card.

The term remains required even when it is not a cue. It identifies the card in the library, search, activity, integrations, duplicate detection and pronunciation, and provides revealed context.

## Adding a picture

The app supports upload, paste and device photo or camera selection. API and MCP clients may upload bytes or provide a public HTTP or HTTPS URL.

A remote URL is an ingestion command, not stored display content. Lymi fetches it once, validates and normalizes it, strips embedded metadata, stores a private copy and serves that copy through an authenticated, versioned URL. Review never hotlinks the source.

Creating an image is separate from creating a card because retrieval, transformation and storage can fail independently. A failed replacement leaves the current image untouched. Replacing, archiving and restoring use a current image version so slow work cannot overwrite a newer learner edit.

The card API exposes stable image metadata and `reviewModes`; storage keys, provider details and credential-bearing source URLs remain internal. Existing direction-shaped requests and queued offline grades stay compatible during an explicit migration window.

## Experience and safeguards

The card editor has one Picture section, not a new card flow. It explains that the description is the accessible image prompt and must describe visible features without naming the answer. If a deck enables picture review, cards without eligible pictures continue in their text modes and the editor identifies what is missing.

Images are private learner content and stay out of logs, telemetry, fixtures and error messages. Remote import blocks private and metadata-network destinations across redirects, sniffs the actual format, bounds time, bytes and pixels, rejects SVG and animation, and normalizes supported still images to a bounded web format.

Review prefetches only the current item and a small buffer. Missing image content never blocks eligible text review or grading, and sign-out or account switching clears user-scoped image caches.

CSV remains text-only and says pictures are not included. Shared or public pictures require a separate decision about rights, attribution, reporting and moderation.

## First-release boundary

The first release includes one image per card, upload and remote import, replace and archive or restore, API and MCP parity, the two image-cued modes, accessible descriptions, private delivery and offline review support.

Multiple images, field-attached images, arbitrary layouts, AI image generation or search, stock libraries, image occlusion, SVG, animation, video, shared-image rights and portable media export are out of scope.

## Evidence of success

- Learners can add and review road signs and other visual concepts without creating a different kind of card.
- All four modes schedule independently while sibling modes remain separated within a session.
- Old clients can replay recognition and production grades after migration without loss or duplication.
- Image failures leave the previous image, text review, schedules and append-only review evidence consistent.
- Private image delivery, remote-fetch defenses, metadata removal and account-scoped offline caching pass focused verification.

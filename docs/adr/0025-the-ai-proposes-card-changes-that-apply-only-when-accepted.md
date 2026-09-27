---
status: accepted
date: 2026-09-28
---

# The AI proposes card changes that apply only when the learner accepts

When a card turns often forgotten ([ADR 0024](0024-returns-widen-and-an-often-forgotten-card-returns-once.md)), the AI diagnoses it once: one likely cause and a drafted fix, or `unclear` with no fix. The fix may change text the learner already wrote, split the card, or add cards, so it never applies on its own. It waits until the learner accepts it, and an accepted fix is an ordinary edit or add by the learner. Until now the AI only filled empty fields ([ADR 0002](0002-mcp-client-extracts-server-enriches.md)), and enrichment keeps that rule.

A diagnosis belongs to one learner and one revision of the card, and is stored once per `(learner, card, revision)`. Draws read it and never recompute it. An edit that raises the card's revision allows a new one.

## Context

A card that keeps failing is usually a card that needs changing, not more drilling: two things on one card, a cue that fits another word, a pair the learner keeps mixing up, or nothing to hang the term on. Rules cannot see a missing anchor or an unnamed pair, and the learner cannot always say why a card will not stick. [Issue #401](https://github.com/krambertech/lymi/issues/401) has the causes, the fixes and the options it rejected.

Enrichment can write without asking because it only fills what is empty, and the AI badge marks what it wrote. A fix rewrites the learner's own text, so a badge after the fact is not enough.

The same card fails for different reasons for different learners of a shared deck, and an edit can remove the reason. A diagnosis stored on the card would be wrong for one of them, or outlive the text it was about.

## Considered options

- **Apply the fix and offer Undo:** rejected. The learner's words would change under them in the middle of a review.
- **One diagnosis per card, shared by every learner:** rejected. Members of a shared deck forget a card for their own reasons, and most of them cannot edit it.
- **Diagnose at every draw:** rejected. One model call per often-forgotten card per draw costs money and latency, and the answer would change between reviews.
- **Always name a cause:** rejected. Below a confidence threshold the diagnosis says `unclear`, and the offer shows ways to change the card instead of a claimed cause.

## Consequences

- The diagnosis runs in a Cloudflare Workflow after the draw that found the card, never inside the draw's latency. With no OpenAI key, nothing is written or queued.
- The trigger is the first draw that sees the card often forgotten for a revision with no diagnosis. A card still often forgotten after a fix is accepted is diagnosed again for its new revision, so the offer in review has to decide whether to show that one.
- `cards.revision` moves only when text an edition translates changes. Changing a card's language or review modes does not allow a new diagnosis.
- A run that fails leaves its row at `failed`, and that revision is not retried.
- The confidence threshold is a named constant set by the evaluation over labelled cards in `apps/web/src/server/diagnosis`. The model's own cause is stored beside the one the learner is told, so a new threshold needs no second call.
- A member of a shared deck gets a diagnosis of a card they cannot edit. Which fixes such a learner can accept is for the offer to decide.
- Each stored diagnosis writes an audit row with actor `ai` and entity `diagnosis`. Activity does not show it, because nothing on the card changed. The fix, once accepted, shows like any edit.
- `GET /api/cards/:id` and MCP `get_card` carry the diagnosis of the card's current revision.

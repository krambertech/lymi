---
status: accepted
date: 2026-09-28
---

# The AI proposes card changes that apply only when the learner accepts

When a card turns often forgotten ([ADR 0024](0024-returns-widen-and-an-often-forgotten-card-returns-once.md)), the AI diagnoses it once: one likely cause and a drafted fix, or `unclear` with no fix. The fix may change text the learner already wrote, split the card, or add cards, so it never applies on its own. It waits until the learner accepts it. Accepting is the learner's write: its audit row names the learner as the actor, never the AI, so Activity treats it like any edit the learner makes in the app. Text the AI drafted is stored with source `ai`, and carries the AI badge, until the learner edits it. Until now the AI only filled empty fields ([ADR 0002](0002-mcp-client-extracts-server-enriches.md)), and enrichment keeps that rule.

A diagnosis belongs to one learner and one revision of the card, and is stored once per `(learner, card, revision)`. Draws read it and never recompute it. An edit that raises the card's revision allows a new one.

## Context

A card that keeps failing is usually a card that needs changing, not more drilling: two things on one card, a cue with more than one right answer, a pair the learner keeps mixing up, or nothing to connect the term to. Rules cannot see a missing anchor or an unnamed pair, and the learner cannot always say why a card will not stick. [Issue #401](https://github.com/krambertech/lymi/issues/401) has the causes, the fixes and the options it rejected.

Enrichment can write without asking because it only fills what is empty, and the AI badge marks what it wrote. A fix rewrites the learner's own text, so a badge after the fact is not enough.

The same card fails for different reasons for different learners of a shared deck, and an edit can remove the reason. A diagnosis stored on the card would be wrong for one of them, or outlive the text it was about.

## Considered options

- **Apply the fix and offer Undo:** rejected. The learner's words would change under them in the middle of a review.
- **One diagnosis per card, shared by every learner:** rejected. Members of a shared deck forget a card for their own reasons, and most of them cannot edit it.
- **Diagnose at every draw:** rejected. One model call per often-forgotten card per draw costs money and latency, and the answer would change between reviews.
- **Always name a cause:** rejected. Below a confidence threshold the diagnosis says `unclear`, and the offer shows ways to change the card instead of a claimed cause.

## Consequences

- The diagnosis runs in a Cloudflare Workflow after the draw that found the card, never inside the draw's latency. With no OpenAI key, nothing is written or queued.
- The trigger is the first draw that sees the card often forgotten for a revision with no diagnosis. A card still often forgotten after a fix is accepted is diagnosed again for its new revision. Review offers that one only after the card's first grade was Forgot on `SLIPPING_FORGOTTEN_DAYS` more days since the last offer, so one fix never follows another at once.
- `cards.revision` moves only when text an edition translates changes. Changing a card's language or review modes does not allow a new diagnosis.
- A run that fails, or a Workflow that refuses the run, leaves its row at `failed`. A draw more than a day later moves it back to `working` and queues it once, and does the same for a row a cut-off run left `working`, so an outage delays a diagnosis rather than losing it.
- The confidence threshold is a named constant set by the evaluation over labelled cards in `apps/web/src/server/diagnosis`. The model's own cause is stored beside the one the learner is told, so a new threshold needs no second call.
- Each row stores the prompt version that wrote it. When `DIAGNOSIS_PROMPT_VERSION` rises, the next draw that sees the card moves a `done` row of an older version back to `working` and the Workflow writes the new cause over it, unless the learner accepted or dismissed it. `offered_at` stays, so review still offers a card at most once per revision.
- The learner can say a named cause is wrong. A dismissed diagnosis is never offered or diagnosed again for its revision, and cannot be accepted until the dismissal is undone. Dismissing is the learner's write and records the cause in analytics, so the prompt can be judged by what learners reject.
- A member of a shared deck gets a diagnosis of a card they cannot edit, but review offers them no fix and accepting one is refused, because every fix changes the owner's card.
- Each stored diagnosis writes an audit row with actor `ai` and entity `diagnosis`. Activity does not show it, because nothing on the card changed. The fix, once accepted, is recorded as the learner's edit. A connected app or API key turning a fix down, or taking that back, is shown, like any write from outside the app.
- `GET /api/cards/:id` and MCP `get_card` carry the diagnosis of the card's current revision.

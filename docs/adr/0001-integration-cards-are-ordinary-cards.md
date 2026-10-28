---
status: accepted
date: 2026-09-05
---

# Integration cards are saved without approval

A card added through the API or MCP is saved immediately, with `created_by` set to the actor. There is no proposals table or approval step. An Activity view in Settings lists what integrations and the AI wrote so the learner can inspect, edit or archive it.

## Considered options

- A `proposals` table with approve and reject, written by MCP and the web. Rejected: a second lifecycle for the same content, a second screen to keep empty, and a "pending" state the review queue has to know about.
- Temporary candidates the client edits and saves in one screen. Rejected: MCP clients have nowhere to store a candidate, and learners need to inspect cards on their phone after adding them on a laptop.

## Consequences

- Duplicate handling and enrichment must work reliably because no approval step follows. See ADR 0004.
- "Review" keeps its spaced-repetition meaning. The oversight act is "inspect" and the screen is "Activity". See CONTEXT.md.
- Undo is archive and restore, the same as every other card.

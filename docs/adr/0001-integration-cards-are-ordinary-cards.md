---
status: accepted
date: 2026-09-05
---

# Cards added by integrations are ordinary cards

The brief said the learner reviews AI-prepared cards before they are added. We decided against a proposals table or any approval step. A card that arrives through the API or MCP is a card the moment it lands, with `created_by` set to the actor, and an Activity view in Settings lists what integrations and the AI wrote so it can be inspected, edited or archived.

## Considered options

- A `proposals` table with approve and reject, written by MCP and the web. Rejected: a second lifecycle for the same content, a second screen to keep empty, and a "pending" state the review queue has to know about.
- Ephemeral candidates the client edits and commits in one screen. Rejected: MCP clients have nowhere to put a suggestion, and phone review of a laptop capture is the habit the product wants.

## Consequences

- Duplicate protection and enrichment must be good on the write path, because there is no gate after it. See ADR 0004.
- "Review" keeps its spaced-repetition meaning. The oversight act is "inspect" and the screen is "Activity". See CONTEXT.md.
- Undo is archive and restore, the same as every other card.

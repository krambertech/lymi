---
status: accepted
date: 2026-09-05
---

# The MCP client extracts vocabulary, the server only enriches

The brief described "AI-assisted preparation" as the learner pasting lesson material and the product proposing cards. We moved extraction out of the product. Claude Desktop or Codex already holds the transcript and a model, so it reads the lesson and calls `add_cards`. The Worker's AI does one job, enrichment: fill the empty fields on a card (meaning, example, pronunciation, language), never overwrite text that is already there, label every filled field `ai`, and write meanings in the learner's meaning language.

Enrichment runs in the background after an add that leaves fields empty. The learner's own adds in the app enrich by default. An API key or MCP client gets it only on a card sent with `enrich: true` (21 September 2026): an agent tending a deck in bulk found unasked-for examples above the learner's level and pronunciations it then had to clear one card at a time.

## Considered options

- A `POST /api/prepare` endpoint and a paste-a-lesson screen in the web app. Rejected for now: a prompt to maintain, a UI to build, and a second copy of the transcript in the Worker for no gain while the MCP client can do it. Can be added later without touching the enrichment path.
- Both. Rejected as scope for this pass.

## Consequences

- The quality of extraction is the MCP client's, guided by tool descriptions and the deck context the server exposes. The tool descriptions are product copy and deserve care.
- Enrichment is the only prompt the server owns. It is the place to invest.
- Extraction cannot happen from the web app until a prepare endpoint exists.

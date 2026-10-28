---
status: accepted
date: 2026-09-05
---

# MCP clients extract; the server enriches

The MCP client reads lesson material and calls `add_cards`. Claude Desktop or Codex already has the transcript and a model, so extraction stays there. The Worker enriches the resulting cards: it fills empty fields (meaning, example, pronunciation, language), labels each filled field `ai`, and writes meanings in the learner's meaning language. It never overwrites existing text.

Enrichment runs in the background after an add that leaves fields empty. The learner's own adds in the app enrich by default. An API key or MCP client gets it only on a card sent with `enrich: true`, because an agent tending a deck in bulk should not have to clear text it did not ask for.

## Considered options

- A `POST /api/prepare` endpoint and a paste-a-lesson screen in the web app. Rejected for now: a prompt to maintain, a UI to build, and a second copy of the transcript in the Worker for no gain while the MCP client can do it. Can be added later without touching the enrichment path.
- Client and server extraction together. Rejected for the first version to keep its scope small.

## Consequences

- The MCP client controls extraction quality, guided by tool descriptions and the deck context the server exposes.
- Enrichment is the only prompt the server owns.
- Extraction cannot happen from the web app until a prepare endpoint exists.

---
status: accepted
date: 2026-10-01
---

# Each assistant signs in with its own registered client

An assistant that cannot identify itself with its own Client ID Metadata Document signs in to Lymi with a client Lymi registers for it. Where the assistant accepts a bare client ID, Lymi publishes a metadata document on `lymi.app` with the assistant's fixed redirect, as it already does for Gemini CLI. Where the assistant insists on a client secret, Lymi stores a confidential client for that one assistant. Dynamic client registration stays off. It is switched on for one assistant only when neither works there against a real connection.

## Context

ChatGPT, Codex, Claude, Claude Code, VS Code Copilot and Copilot CLI send their own metadata documents, which Lymi's Better Auth server reads ([ADR 0003](0003-better-auth-is-the-oauth-server.md)). As of 1 October 2026, Cursor and Grok document only dynamic client registration or a client ID configured by hand. The Gemini app is reported to send a metadata document Google serves for each connector, which needs nothing from Lymi; Google documents neither way. MCP `2026-07-28` deprecates dynamic registration in favour of metadata documents.

With dynamic registration on, any program can register itself under any name, and the consent screen shows whatever name it chose. A client Lymi registers carries a name and a mark Lymi controls, so the learner sees which assistant is asking, and Activity names it.

## Considered options

- **A registered client per assistant, dynamic registration as a last resort:** accepted. It reaches the assistants the learner uses and keeps the list of apps short and honest.
- **Turn dynamic registration on for everyone:** rejected for now. It reaches every host at once, but the consent screen names whatever the registrant claims, and the spec is moving away from it.
- **Support only assistants with their own metadata documents:** rejected. It leaves out Cursor and Grok, which the learner wants.

## Consequences

- Each registered client names its redirect URIs exactly. A host that changes its redirect breaks until Lymi's document or record changes, so each client has a sign-in check in the host's setup guide.
- A confidential client's secret lives in the host's own configuration and in Lymi's database, never in the repository.
- `AppMark` and the connected-apps list learn each registered client's id, so the consent screen and Activity show the assistant's name.
- The Gemini app's custom apps are limited to adult US accounts, so its client can be tested only from one.

[Proposal: interactive MCP apps and the Lymi plugin](../proposals/interactive-mcp-apps.md)

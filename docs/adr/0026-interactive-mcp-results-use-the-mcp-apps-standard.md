---
status: accepted
date: 2026-10-01
---

# Interactive MCP results use MCP Apps

Lymi's interactive MCP results are one React bundle served by the product Worker as a `ui://` resource under the MCP Apps extension (`io.modelcontextprotocol/ui`, spec `2026-01-26`). Tools link to it through `_meta.ui.resourceUri`, and the view talks to the host only through the standard bridge: tool input and result notifications, `tools/call`, `ui/update-model-context`, `ui/open-link` and `ui/message`. A host extension, such as ChatGPT's side panel, mentions and settings, is declared beside the standard metadata and never replaces it. Every tool keeps its full text and structured result, so hosts without UI support still receive the full result.

## Context

As of 1 October 2026 the same MCP Apps resource renders in ChatGPT, Claude on web, desktop and mobile, VS Code Copilot, Cursor, Microsoft 365 Copilot and Goose. OpenAI documents `window.openai` and `openai/outputTemplate` as compatibility aliases and tells new work to use the standard. ChatGPT alone offers side panels, a sidebar entry, composer mentions and native settings, announced on 29 September 2026. Lymi's rule is one product contract across the app, the API and MCP, so separate host contracts would be harder to keep consistent.

## Considered options

- **The MCP Apps standard with host extensions layered on:** accepted. One view reaches every host that renders interfaces, and the extras reach ChatGPT users without forking the view.
- **OpenAI's Apps SDK (`window.openai`) first:** rejected. It reaches one host, and OpenAI itself now treats it as a legacy alias.
- **A separate integration per host:** rejected. It doubles review, testing and upkeep for no behaviour the learner needs.
- **No interface, text only:** rejected. A batch of forty added and skipped cards is hard to check as prose, and correcting one card by describing it to the assistant is slower than editing it.

## Consequences

- The view is its own Vite build into a single HTML file, so it runs on any sandbox origin. It lives in `apps/web/src/client/mcp-app`, reuses Lymi's tokens, primitives and Lingui catalogs, and never imports the product's query cache, router or offline outbox.
- The view reads and writes only through MCP tools the host calls on the learner's behalf, with the connection's own grant. Every write goes through the service layer as actor `mcp`, so Activity shows it under the connected app, and a read-only grant is refused as it is for the assistant.
- The resource URI carries a content version, because hosts cache a resource by its URI.
- The views show status and one card at a time, and change nothing; the assistant makes every change. Nothing a view shows enters model context.
- A tool whose only job is the view is marked `visibility: ["app"]`, so the model never calls it.
- The view never grades a review or starts one; a link opens review in Lymi.
- Host differences, such as Claude's hashed sandbox domain and ChatGPT's unique `ui.domain`, are set per host in the resource metadata. The interface is tested in each host before a directory submission.

[Proposal: interactive MCP apps and the Lymi plugin](../proposals/interactive-mcp-apps.md)

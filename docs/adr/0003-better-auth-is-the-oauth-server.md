---
status: accepted
date: 2026-09-05
---

# Better Auth is the OAuth server for MCP, and issues API keys

Claude Desktop and Codex are the first MCP clients, and both require OAuth 2.1 for remote MCP servers. Rather than run Cloudflare's `workers-oauth-provider` next to Better Auth, we use `@better-auth/mcp` (Better Auth 1.7) so the same auth system that owns sessions also acts as the authorization server, and the `apiKey` plugin for personal keys used by curl, scripts and Claude Code. Every key and grant carries one scope, `read` or `write`.

The MCP endpoint itself is `createMcpHandler` from the Agents SDK, stateless, in the same Worker, with no Durable Object. `McpAgent` was the earlier plan and has been deprecated by Cloudflare.

## Considered options

- Bearer API key only. Rejected: Claude Desktop and Codex do not accept static headers for custom connectors.
- `workers-oauth-provider` as a second auth system. Rejected: two user stores, two consent flows, and the dependency's own DCR path is now deprecated.
- Per-entity scopes (`cards:write`, `decks:read`). Rejected for now: one learner, no third-party apps, and two scopes are enough to hand a read-only key to a dashboard.

## Consequences

- Better Auth is load-bearing. A vendor change would mean rewriting auth, keys and OAuth together.
- Client registration is by Client ID Metadata Documents or pre-registration, not dynamic registration. Codex and Claude Desktop both follow this.
- A client that only knows dynamic registration gets a Client ID Metadata Document that Lymi publishes on the public site, limited to loopback redirects, instead of dynamic registration being switched on. Gemini CLI is the first, at `/oauth/gemini-cli.json`.
- The Worker verifies access tokens against its own JWKS, so MCP requests do not hit D1 for auth.
- Integrations can never grade a review, whatever their scope.

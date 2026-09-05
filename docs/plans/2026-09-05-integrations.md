# Integrations pass: API, keys, OAuth, MCP, enrichment, Activity

**Status:** Decided 5 September 2026, not started. Decisions are in [stack.md](../stack.md) and [docs/adr](../adr/README.md). Vocabulary is in [CONTEXT.md](../../CONTEXT.md). This page is the order of work for the session that builds it.

## What exists

- Hono routes in `apps/web/src/server/routes/` talk to D1 directly and hardcode `actor: "user"`.
- Better Auth 1.7.2 with session cookies only, KV as secondary storage, Google plus local email sign-in.
- Zod request schemas in `packages/core/src/types.ts`. Drizzle schema in `packages/core/src/schema/app.ts`.
- `audit_log.actor` and `reviews.source` already have slots for `api` and `mcp`.
- No AI code, no `Provider` interface, no Worker tests.

## Order of work

Each step leaves the app deployable. Stop and check at the end of each.

1. **Service layer.** Move the bodies of `routes/decks.ts`, `routes/cards.ts`, `routes/review.ts` into `apps/web/src/server/services/` as functions taking `{ db, userId, actor }`. Routes become thin. Add `created_by` (actor enum) to `cards` and a `user_settings` table with `meaning_language` (default `en`). One migration.
2. **Duplicate rule.** `normaliseTerm()` in `packages/core`. A `normalized_term` column on `cards` with an index on `(user_id, language, normalized_term)`. `addCards()` takes one or many, returns per-card `{ status: "added" | "skipped", card, existing? }`. The web sheet uses it and shows "already in <deck>". ADR 0004.
3. **API keys and scopes.** Better Auth `apiKey` plugin, header `x-api-key`, `enableSessionForAPIKeys`, `permissions` carrying `read` or `write`. Middleware resolves session, API key or OAuth token into one `{ user, actor, scope }`. Write routes require `write`. Settings gets create, list and revoke.
4. **OpenAPI.** Generate from the Zod schemas, serve the document at `/api/openapi.json` and a reference UI at `/api/docs`. Update `docs/data-model.md` to point at it.
5. **OAuth server.** `@better-auth/mcp` plus the required `jwt` plugin. Serves `/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource`, consent page. Regenerate the auth schema with `pnpm --filter @lymi/web auth:schema` and migrate. Test the flow with Claude Desktop before writing a single tool.
6. **MCP handler.** `createMcpHandler` at `/mcp`. Unauthenticated requests get `401` with `WWW-Authenticate: Bearer resource_metadata=...`. Tools: `list_decks`, `get_deck`, `search_cards`, `add_cards`, `update_card`, `archive_card`, `restore_card`, `due_counts`, `enrich`. All call the service layer with `actor: "mcp"`. Tool descriptions are product copy; write them with the `ux-writing` skill.
7. **Enrichment.** `Provider` interface in `packages/core`, OpenAI implementation through AI Gateway. `enrich(cardId)` fills only empty fields, sets `*_source = "ai"`, writes an audit row with `actor: "ai"`. Triggered with `ctx.waitUntil` after any add that leaves fields empty. Meanings in `user_settings.meaning_language`.
8. **Activity.** Settings screen listing audit rows where actor is not `user`, grouped by day, each card row opening the editor with archive. Load the `impeccable` skill before building it.
9. **Tests.** `@cloudflare/vitest-pool-workers` for the service layer: duplicate rule, scope enforcement, enrichment never overwrites.

## Facts checked on 5 September 2026

- `@better-auth/mcp` and `@better-auth/oauth-provider` were split out in Better Auth 1.7.0. Register `mcp()`, not both. It needs the `jwt` plugin. Tokens are verified against JWKS with no database hit.
- Dynamic client registration is off by default and deprecated by the MCP 2026-07-28 spec. Use Client ID Metadata Documents (`@better-auth/cimd`). On Workers, supply a CIMD fetch resolver that blocks private addresses and redirects.
- Better Auth on D1 needs `transaction: false`.
- `apiKey` plugin: default header `x-api-key`. Keys carry `permissions: Record<string, string[]>`. `getSession` returns a session for a key only with `enableSessionForAPIKeys: true`.
- Claude Desktop and claude.ai require OAuth with S256 PKCE for custom connectors. Static headers are org-admin only. Claude Code accepts a bearer header. Codex and ChatGPT connectors accept OAuth or no auth, never a header.
- Cloudflare deprecated `McpAgent`. `createMcpHandler` from the Agents SDK is stateless and needs no Durable Object.
- Claude Desktop does not support MCP elicitation. Claude Code does.

## Not in this pass

Text-to-speech, review grading over MCP, scopes finer than `read` and `write`, a `POST /api/prepare` extraction endpoint.

## Suggested skills for the implementing session

`claude-api` is not needed (OpenAI is the vendor). Load `wrangler` and `workers-best-practices` before touching the Worker, `agents-sdk` for `createMcpHandler`, `typescript-best-practices` throughout, `impeccable` and `ux-writing` for Activity and Settings, `technical-writing` for docs and the PR.

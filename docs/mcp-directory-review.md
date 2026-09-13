# MCP directory review

How to get Lymi's MCP server at `https://my.lymi.app/mcp` through ChatGPT plugin review and into the Claude connector directory. Neither directory needs an interactive UI. Issue [#83](https://github.com/krambertech/lymi/issues/83) tracks the work, and the public tool docs are at [lymi.app/docs/mcp](https://lymi.app/docs/mcp).

## Submission is blocked on accounts

**A reviewer cannot sign in today.** Production sign-in is Google only, and `databaseHooks.user.create` in `apps/web/src/server/auth.ts` refuses any email outside `ALLOWED_EMAILS` unless it arrives through a join link. Submission waits for:

- A public account path. Opening sign-up needs per-learner rate and cost limits, because card audio comes from a paid speech API.
- The privacy policy, terms and support page from [#82](https://github.com/krambertech/lymi/issues/82). Both portals ask for a privacy policy URL.

Until then, run the checks below on a custom connector with an allowlisted account.

## What each directory checks

| Requirement | ChatGPT | Claude | Where Lymi meets it |
| --- | --- | --- | --- |
| Client identity | CIMD preferred, DCR fallback | CIMD when the metadata advertises it | `cimd()` in `auth.ts`; no DCR |
| Metadata gate | `client_id_metadata_document_supported: true`, `none` auth method, S256 | Same | Better Auth's `/.well-known/oauth-authorization-server/api/auth` |
| Redirect URI | `https://chatgpt.com/connector_platform_oauth_redirect` | `https://claude.ai/api/mcp/auth_callback` | Read from the client's metadata document |
| Tool hints | `readOnlyHint`, `destructiveHint`, `openWorldHint` required | `title` plus `readOnlyHint` or `destructiveHint` | `readTool` and `writeTool` in `mcp/server.ts`, asserted in `server.test.ts` |
| Per-tool auth | `securitySchemes`, mirrored in `_meta` | Not used | Both fields, `read` or `write` per tool; `withSecuritySchemes` in `mcp/server.ts` |
| Re-auth trigger | Tool error with `_meta["mcp/www_authenticate"]` | HTTP 401 with `resource_metadata` | Both: step-up on a read-only write, 401 after disconnect |
| Domain proof | Token at `/.well-known/openai-apps-challenge` | None | `OPENAI_APPS_CHALLENGE` secret |
| Output | No internal, diagnostic or unrequested data | Reasonably sized, helpful errors | See [Tool output](#tool-output) |

Checked against [OpenAI's auth guide](https://developers.openai.com/apps-sdk/build/auth), [submission guide](https://developers.openai.com/plugins/deploy/submission), [Anthropic's authentication guide](https://claude.com/docs/connectors/building/authentication) and [review criteria](https://claude.com/docs/connectors/building/review-criteria) on 13 September 2026.

## Access follows the live grant

Every `/mcp` request passes two checks. `requireMcpAuth` verifies the JWT without a database read. `authorizeMcpClaims` then reads the learner's consent row for that client:

- No row means the learner disconnected the app. The request gets a 401 challenge, even if the token is still valid.
- The effective scope is the narrower of the token's and the consent's.
- A write on a read-only grant returns a tool error that names the fix, plus an `insufficient_scope` challenge for ChatGPT.

Read tools never write; `getSettings` returns defaults rather than creating a row. No tool grades reviews, whatever the scope. Every write runs through the service layer as actor `mcp` and appears in Activity.

## Tool output

Tools return the learner's text and the ids a follow-up call needs. Card output omits `createdBy`, `updatedAt`, `userId`, `normalizedTerm` and `audioKey`. A `ServiceError` reaches the assistant as its message. For any other error, the Worker logs only the tool name and the error's class, because a Drizzle message carries SQL and learner data. The assistant gets "Lymi could not finish this just now. Try again in a moment."

## Verify the domain for OpenAI

OpenAI's submission portal issues the token. Set the challenge base URL to `https://my.lymi.app`, then store the token as a production secret:

```bash
pnpm --filter @lymi/web exec wrangler secret put OPENAI_APPS_CHALLENGE
```

The route returns the bare token as `text/plain`, or 404 while the secret is unset.

## Starter prompts

- "Add the new words from this lesson to my Italian deck." Paste a short lesson.
- "What do I have due today?"
- "Find my card for *sbrigarsi* and add an example sentence."
- "How is my recall going this month?"
- "I don't need the Portuguese deck any more. Archive it."

## Review cases

Run these on a reviewer account seeded like the local `learner` persona, which has the decks `Lezione 12` (Italian), `Verbi` and `Portuguese`.

| # | Prompt | Expected tools | Expected result |
| --- | --- | --- | --- |
| P1 | "Add *sbrigarsi*, *magari* and *ormai* from today's lesson to Lezione 12." | `list_decks`, `add_cards` | One call adds the new terms. A term already present is skipped, and the result names its existing card. |
| P2 | Repeat P1 exactly. | `add_cards` | Nothing is added; every term is skipped. |
| P3 | "How many cards are due, and in which deck?" | `due_counts` | Per-deck totals that match Today. |
| P4 | "Change the meaning of *ormai* to 'by now'." | `search_cards`, `update_card` | The card shows the new meaning, labelled `ai`. ChatGPT may ask to confirm first. |
| P5 | "Archive the Portuguese deck, then bring it back." | `archive_deck`, `restore_deck` | The deck leaves Library, then returns with its cards and schedule. |
| N1 | "Grade my due cards as Good." | None | The assistant says only the learner can review, in the app. |
| N2 | "Delete the Verbi deck permanently." | None, or `archive_deck` after it explains | The assistant explains that archive is the only removal. |
| N3 | On a read-only grant: "Add *allora* to Lezione 12." | `add_cards` | A tool error tells the learner to reconnect with write, and ChatGPT offers to reconnect. No card is added. |

## Before submitting

Run each check in MCP Inspector and in both clients, against a production custom connector:

- Connect with write, then with write unticked, and run every tool on each grant.
- Disconnect under **Settings → Connected apps**. The next call fails and asks for a new sign-in.
- Let an access token expire, which takes an hour. The client refreshes without a prompt.
- Send malformed input, such as an empty `cards` array or an unknown deck id. Each error says what to fix.
- Find an archived card with `search_cards` and `archived: true`, then restore it.
- Confirm each write appears in Activity.

For local OAuth testing without a public client, use the recipe in [testing.md](testing.md#mcp-sign-in-on-the-local-server).

## Still open

- The public account path, with its rate and cost limits.
- A populated reviewer account whose instructions need no MFA or email confirmation. Google sign-in makes this hard, so review may need its own sign-in method.
- An owner for availability, latency, monitoring, incidents, support and protocol updates.
- Listing material: name, descriptions, icon, categories, documentation URL, support contact and release notes.

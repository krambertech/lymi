# MCP directory review

How to get Lymi's MCP server at `https://my.lymi.app/mcp` through the ChatGPT plugin review and the Claude connector directory. The server needs no interactive UI for either. Issue [#83](https://github.com/krambertech/lymi/issues/83) tracks the work; the tool surface itself is documented publicly at [lymi.app/docs/mcp](https://lymi.app/docs/mcp).

## Submission is blocked on accounts

**A reviewer cannot sign in today.** Production sign-in is Google only, and `databaseHooks.user.create` in `apps/web/src/server/auth.ts` refuses any email not in `ALLOWED_EMAILS` unless it arrives through a join link. Lymi stays private for now, so a submission waits for two things:

- A public account path, decided separately. Opening sign-up needs per-learner rate and cost limits, because card audio comes from a paid speech API.
- The privacy policy, terms and support page from [#82](https://github.com/krambertech/lymi/issues/82). Both portals ask for a privacy policy URL.

Until then, the checks below run against a custom connector on an allowlisted account.

## What each directory checks

| Requirement | ChatGPT | Claude | Where Lymi meets it |
| --- | --- | --- | --- |
| Client identity | CIMD preferred, DCR fallback | CIMD when the metadata advertises it | `cimd()` in `auth.ts`; no DCR |
| Metadata gate | `client_id_metadata_document_supported: true`, `none` auth method, S256 | Same | Better Auth's `/.well-known/oauth-authorization-server/api/auth` |
| Redirect URI | `https://chatgpt.com/connector_platform_oauth_redirect` | `https://claude.ai/api/mcp/auth_callback` | Read from the client's metadata document |
| Tool hints | `readOnlyHint`, `destructiveHint`, `openWorldHint` required | `title` plus `readOnlyHint` or `destructiveHint` | `readTool` and `writeTool` in `mcp/server.ts`, asserted in `server.test.ts` |
| Per-tool auth | `securitySchemes` | Not used | `_meta.securitySchemes`, `read` or `write` per tool |
| Re-auth trigger | Tool error with `_meta["mcp/www_authenticate"]` | HTTP 401 with `resource_metadata` | Both: step-up on a read-only write, 401 after disconnect |
| Domain proof | Token at `/.well-known/openai-apps-challenge` | None | `OPENAI_APPS_CHALLENGE` secret |
| Output | No internal, diagnostic or unrequested data | Reasonably sized, helpful errors | See [Tool output](#tool-output) |

Checked against [OpenAI's auth guide](https://developers.openai.com/apps-sdk/build/auth), [submission guide](https://developers.openai.com/plugins/deploy/submission), [Anthropic's authentication guide](https://claude.com/docs/connectors/building/authentication) and [review criteria](https://claude.com/docs/connectors/building/review-criteria) on 13 September 2026.

## Access follows the live grant

Every `/mcp` request passes two checks. `requireMcpAuth` verifies the JWT without touching the database. `authorizeMcpClaims` then reads the learner's consent row for that client:

- No row means the learner disconnected the app, so the request gets a 401 challenge even when the token has not expired.
- The effective scope is the narrower of the token's scope and the consent's scope.
- A write on a read-only grant returns a tool error naming the fix, with an `insufficient_scope` challenge for ChatGPT.

Grading a review is not a tool, whatever the scope. Every write goes through the service layer with actor `mcp`, so it appears in Activity.

## Tool output

Tools return what the learner wrote and the ids the next call needs. Card output leaves out `createdBy`, `updatedAt`, `userId`, `normalizedTerm` and `audioKey`. A `ServiceError` becomes its own message. Any other failure is logged by the Worker and the assistant gets "Lymi could not finish this just now. Try again in a moment." It never sees the internal message, which can carry SQL.

## Verify the domain for OpenAI

The OpenAI submission portal issues the token. Set the challenge base URL to `https://my.lymi.app`, then store the token as a production secret:

```bash
pnpm --filter @lymi/web exec wrangler secret put OPENAI_APPS_CHALLENGE
```

The route answers the bare token as `text/plain`, and 404 while the secret is unset.

## Starter prompts

- "Add the new words from this lesson to my Italian deck." Paste a short lesson.
- "What do I have due today?"
- "Find my card for *sbrigarsi* and add an example sentence."
- "How is my recall going this month?"
- "I don't need the Portuguese deck any more. Archive it."

## Review cases

Run these on a reviewer account seeded like the local `learner` persona: an Italian deck named `Lezione 12`, a `Verbi` deck and a `Portuguese` deck.

| # | Prompt | Expected tools | Expected result |
| --- | --- | --- | --- |
| P1 | "Add *sbrigarsi*, *magari* and *ormai* from today's lesson to Lezione 12." | `list_decks`, `add_cards` | One call adds new terms, skips any already present, and names the existing card for each skip. |
| P2 | Repeat P1 exactly. | `add_cards` | Nothing added; every term is skipped. No duplicate cards. |
| P3 | "How many cards are due, and in which deck?" | `due_counts` | Totals per deck that match the Today screen. |
| P4 | "Change the meaning of *ormai* to 'by now'." | `search_cards`, `update_card` | The card shows the new meaning, labelled `ai`. ChatGPT asks to confirm first. |
| P5 | "Archive the Portuguese deck, then bring it back." | `archive_deck`, `restore_deck` | The deck leaves Library and returns with its cards and schedule. |
| N1 | "Grade my due cards as Good." | None | The assistant says only the learner can review, in the app. |
| N2 | "Delete the Verbi deck permanently." | None, or `archive_deck` after saying so | The assistant explains that archive is the only removal. |
| N3 | On a read-only grant: "Add *allora* to Lezione 12." | `add_cards` | A tool error telling the learner to reconnect with write. ChatGPT offers to reconnect. No card is added. |

## Before submitting

Run each item in MCP Inspector and in both clients, on a production custom connector:

- Connect with write, then again with write unticked. Run every tool on each grant.
- Disconnect under Settings → Connected apps. The next call must fail and prompt a new sign-in.
- Wait out an access token (one hour) and confirm the client refreshes without a prompt.
- Send malformed input, such as an empty `cards` array or an unknown deck id. Each error must say what to fix.
- Search archived cards with `archived: true` and restore one.
- Check each write in Activity.

Local OAuth testing without a public client uses the recipe in [testing.md](testing.md#mcp-sign-in-on-the-local-server).

## Still open

- The public account path and the rate and cost limits that go with it.
- A populated reviewer account with instructions that need no MFA or email confirmation. Google sign-in makes this hard; a reviewer-only sign-in method may be needed.
- Who owns availability, latency, monitoring, incidents, support and protocol updates once the listing is public.
- Listing material: name, descriptions, icon, categories, documentation URL, support contact and release notes.

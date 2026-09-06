# Architecture decision records

One file per decision that is hard to reverse, surprising without context, and the result of a real trade-off. Everything else lives in [stack.md](../stack.md). Vocabulary lives in [CONTEXT.md](../../CONTEXT.md).

| ADR | Decision |
| --- | --- |
| [0001](0001-integration-cards-are-ordinary-cards.md) | Cards added by integrations are ordinary cards, overseen in Activity |
| [0002](0002-mcp-client-extracts-server-enriches.md) | The MCP client extracts vocabulary, the server only enriches |
| [0003](0003-better-auth-is-the-oauth-server.md) | Better Auth is the OAuth server for MCP and issues API keys |
| [0004](0004-duplicates-are-skipped-not-rejected.md) | A duplicate is the same term and language anywhere, and adding one is skipped |
| [0005](0005-review-is-a-button-not-a-destination.md) | Review is a button, not a destination, and rarely-opened screens live behind You |

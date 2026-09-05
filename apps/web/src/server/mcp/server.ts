import type { Scope } from "@lymi/core";
import { McpServer } from "@modelcontextprotocol/server";
import type { ServiceContext } from "../services/context";

/** What one MCP request runs as. Built from the verified access token, never from the body. */
export interface McpPrincipal {
  ctx: ServiceContext;
  scope: Scope;
}

/**
 * A fresh server per request. Stateless: tools read and write through the same service
 * layer the REST routes use, with actor "mcp", so nothing can bypass product rules and
 * every write lands in Activity.
 *
 * Tools arrive in step 6. Until then this is a server with a name and no tools, which is
 * all an OAuth flow needs to complete.
 */
export function buildMcpServer(_principal: McpPrincipal): McpServer {
  return new McpServer(
    { name: "lymi", version: "0.1.0" },
    {
      instructions:
        "Lymi keeps one learner's vocabulary: decks of cards, each card a term with its meaning, " +
        "example and pronunciation, reviewed with spaced repetition. Tools are being added.",
    },
  );
}

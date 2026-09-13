import { requireMcpAuth } from "@better-auth/mcp";
import { createMcpHandler } from "agents/mcp/server";
import type { Auth } from "../auth";
import type { Db } from "../db";
import type { Bindings } from "../env";
import { grantedScope } from "../services/connected-apps";
import { buildMcpServer, type McpPrincipal } from "./server";

/** The scopes an MCP client is told to ask for. offline_access buys it a refresh token. */
export const MCP_CHALLENGE_SCOPES = ["read", "write", "offline_access"] as const;

/**
 * `requireMcpAuth` verifies the JWT and answers a bad token with the RFC 9728 challenge;
 * `authorizeMcpClaims` then checks the live consent.
 */
export function handleMcpRequest(
  request: Request,
  deps: { auth: Auth; db: Db; env: Bindings },
): Promise<Response> {
  const protectedHandler = requireMcpAuth(
    deps.auth,
    async (req, claims) => {
      const principal = await authorizeMcpClaims(claims, deps);
      if (principal instanceof Response) return principal;
      return handleVerifiedMcpRequest(req, principal, deps.env);
    },
    { resource: mcpResource(deps.env), challengeScopes: MCP_CHALLENGE_SCOPES },
  );
  return protectedHandler(request);
}

/** `wrangler types` narrows PRODUCT_URL to the production literal; tests and local dev use others. */
type ProductOrigin = { PRODUCT_URL: string };

/** The protected resource identifier every access token is bound to. */
export function mcpResource(env: ProductOrigin): string {
  return `${env.PRODUCT_URL}/mcp`;
}

export function mcpResourceMetadataUrl(env: ProductOrigin): string {
  return new URL("/.well-known/oauth-protected-resource/mcp", env.PRODUCT_URL).toString();
}

/** A disconnect deletes the consent but not the token, so consent decides access and scope. */
export async function authorizeMcpClaims(
  claims: Record<string, unknown>,
  deps: { db: Db; env: ProductOrigin },
): Promise<McpPrincipal | Response> {
  const userId = typeof claims.sub === "string" ? claims.sub : null;
  const clientId = typeof claims.client_id === "string" ? claims.client_id : null;
  if (!userId || !clientId) {
    return unauthorized(deps.env, "The access token does not name a learner and a client");
  }
  const consent = await grantedScope({ db: deps.db, userId }, clientId);
  if (!consent) {
    return unauthorized(deps.env, "This connection was disconnected in Lymi. Sign in again.");
  }
  const tokenWrites = scopesOf(claims.scope).has("write");
  return {
    ctx: { db: deps.db, userId, actor: "mcp" },
    scope: tokenWrites && consent === "write" ? "write" : "read",
    resourceMetadataUrl: mcpResourceMetadataUrl(deps.env),
  };
}

/** Split from the auth checks so the transport can be tested alone. */
export function handleVerifiedMcpRequest(
  req: Request,
  principal: McpPrincipal,
  env: ProductOrigin,
): Promise<Response> {
  const handler = createMcpHandler(() => buildMcpServer(principal), {
    route: "/mcp",
    allowedHostnames: [new URL(env.PRODUCT_URL).hostname],
  });
  return handler.fetch(req);
}

/** The `scope` claim is a space-separated string by RFC 9068; some issuers send an array. */
function scopesOf(claim: unknown): Set<string> {
  if (typeof claim === "string") return new Set(claim.split(" ").filter(Boolean));
  if (Array.isArray(claim)) return new Set(claim.filter((s): s is string => typeof s === "string"));
  return new Set();
}

function unauthorized(env: ProductOrigin, message: string): Response {
  const challenge = [
    `resource_metadata="${mcpResourceMetadataUrl(env)}"`,
    `scope="${MCP_CHALLENGE_SCOPES.join(" ")}"`,
    `error="invalid_token"`,
    `error_description="${message}"`,
  ].join(", ");
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message }, id: null }),
    {
      status: 401,
      headers: { "content-type": "application/json", "www-authenticate": `Bearer ${challenge}` },
    },
  );
}

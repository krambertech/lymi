import { requireMcpAuth } from "@better-auth/mcp";
import { createMcpHandler } from "agents/mcp/server";
import type { Auth } from "../auth";
import type { Db } from "../db";
import type { Bindings } from "../env";
import { buildMcpServer, type McpPrincipal } from "./server";

/** The scopes an MCP client is told to ask for. offline_access buys it a refresh token. */
export const MCP_CHALLENGE_SCOPES = ["read", "write", "offline_access"] as const;

/**
 * Handle one request to /mcp.
 *
 * `requireMcpAuth` verifies the bearer token against this Worker's own JWKS (signature,
 * issuer, audience, expiry) with no database hit, and answers an unauthenticated request
 * with 401 and the RFC 9728 `WWW-Authenticate: Bearer resource_metadata=...` header that
 * starts the OAuth flow in Claude Desktop and Codex. The verified claims become the
 * principal every tool runs as.
 */
export function handleMcpRequest(
  request: Request,
  deps: { auth: Auth; db: Db; env: Bindings },
): Promise<Response> {
  const protectedHandler = requireMcpAuth(
    deps.auth,
    (req, claims) => handleVerifiedMcpRequest(req, claims, deps),
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

/**
 * Serve one request whose token has already been verified. Split from the guard so the
 * transport and the tool wiring can be exercised with synthetic claims.
 */
export function handleVerifiedMcpRequest(
  req: Request,
  claims: Record<string, unknown>,
  deps: { db: Db; env: ProductOrigin },
): Promise<Response> {
  const userId = typeof claims.sub === "string" ? claims.sub : null;
  if (!userId) return Promise.resolve(jsonRpcError(401, "The access token has no subject"));
  const scopes = scopesOf(claims.scope);
  const principal: McpPrincipal = {
    ctx: { db: deps.db, userId, actor: "mcp" },
    scope: scopes.has("write") ? "write" : "read",
  };
  const handler = createMcpHandler(() => buildMcpServer(principal), {
    route: "/mcp",
    allowedHostnames: [new URL(deps.env.PRODUCT_URL).hostname],
  });
  return handler.fetch(req, {
    authInfo: {
      token: bearerOf(req) ?? "",
      clientId: typeof claims.client_id === "string" ? claims.client_id : "",
      scopes: [...scopes],
      ...(typeof claims.exp === "number" ? { expiresAt: claims.exp } : {}),
      resource: new URL(mcpResource(deps.env)),
    },
  });
}

/** The `scope` claim is a space-separated string by RFC 9068; some issuers send an array. */
function scopesOf(claim: unknown): Set<string> {
  if (typeof claim === "string") return new Set(claim.split(" ").filter(Boolean));
  if (Array.isArray(claim)) return new Set(claim.filter((s): s is string => typeof s === "string"));
  return new Set();
}

function bearerOf(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header) return null;
  const [type, token] = header.split(" ", 2);
  return type?.toLowerCase() === "bearer" && token ? token : null;
}

function jsonRpcError(status: number, message: string): Response {
  return new Response(
    JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message }, id: null }),
    { status, headers: { "content-type": "application/json" } },
  );
}

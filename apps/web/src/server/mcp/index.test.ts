import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Db, schema } from "../db";
import { learner, testDb } from "../services/test-db";
import { authorizeMcpClaims, handleVerifiedMcpRequest } from "./index";
import type { McpPrincipal } from "./server";

const env = { PRODUCT_URL: "https://my.lymi.app" };
const clientId = "https://c.example/client.json";

const principal: McpPrincipal = {
  ctx: { db: {} as Db, userId: "user-1", actor: "mcp" },
  scope: "write",
  resourceMetadataUrl: "https://my.lymi.app/.well-known/oauth-protected-resource/mcp",
};

function rpc(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("https://my.lymi.app/mcp", {
    method: "POST",
    headers: {
      // Node's Request does not add Host; a real Worker request always carries it.
      host: "my.lymi.app",
      authorization: "Bearer test-token",
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

/** A JSON-RPC result whether the transport answered as JSON or as one SSE event. */
async function resultOf(res: Response): Promise<unknown> {
  const text = await res.text();
  const line = text
    .split("\n")
    .find((l) => l.startsWith("data:"))
    ?.slice(5);
  return JSON.parse(line ?? text);
}

describe("handleVerifiedMcpRequest", () => {
  it("serves initialize and tools/list over Streamable HTTP on the product host", async () => {
    const init = await handleVerifiedMcpRequest(
      rpc({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "test", version: "0" },
        },
      }),
      principal,
      env,
    );
    expect(init.status).toBe(200);
    const hello = (await resultOf(init)) as { result: { serverInfo: { name: string } } };
    expect(hello.result.serverInfo.name).toBe("lymi");

    const list = await handleVerifiedMcpRequest(
      rpc({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
      principal,
      env,
    );
    expect(list.status).toBe(200);
    const tools = (await resultOf(list)) as {
      result: { tools: { name: string; _meta?: Record<string, unknown> }[] };
    };
    const addCards = tools.result.tools.find((t) => t.name === "add_cards");
    // The per-tool auth declaration has to survive the transport, not just the registration.
    expect(addCards?._meta?.securitySchemes).toEqual([{ type: "oauth2", scopes: ["write"] }]);
  });

  it("refuses a request for a host that is not the product origin", async () => {
    const res = await handleVerifiedMcpRequest(
      new Request("https://evil.example/mcp", {
        method: "POST",
        headers: {
          host: "evil.example",
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
      }),
      principal,
      env,
    );
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe("authorizeMcpClaims", () => {
  let db: Db;
  let dispose: () => Promise<void>;

  beforeAll(async () => {
    ({ db, dispose } = await testDb());
    await learner(db, "user-1", "Kateryna");
    await db.insert(schema.oauthClient).values({ id: "client-1", clientId, redirectUris: [] });
  }, 60_000);

  afterAll(async () => {
    await dispose();
  });

  async function consent(scopes: string[]) {
    const now = new Date();
    await db.delete(schema.oauthConsent);
    // Stored the way Better Auth's adapter writes it: an already-serialised array.
    await db.insert(schema.oauthConsent).values({
      id: "consent-1",
      clientId,
      userId: "user-1",
      scopes: JSON.stringify(scopes),
      createdAt: now,
      updatedAt: now,
    });
  }

  const claims = { sub: "user-1", client_id: clientId, scope: "read write offline_access" };

  it("runs as the learner with the scope both the token and the consent allow", async () => {
    await consent(["read", "write", "offline_access"]);

    const result = await authorizeMcpClaims(claims, { db, env });

    expect(result).toMatchObject({ ctx: { userId: "user-1", actor: "mcp" }, scope: "write" });
  });

  it("narrows to read when the consent no longer grants write", async () => {
    await consent(["read", "offline_access"]);

    const result = await authorizeMcpClaims(claims, { db, env });

    expect(result).toMatchObject({ scope: "read" });
  });

  it("sends a disconnected client back to sign in, even with an unexpired token", async () => {
    await db.delete(schema.oauthConsent);

    const result = await authorizeMcpClaims(claims, { db, env });

    expect(result).toBeInstanceOf(Response);
    const res = result as Response;
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain(
      'resource_metadata="https://my.lymi.app/.well-known/oauth-protected-resource/mcp"',
    );
  });

  it("rejects a token that does not name both a learner and a client", async () => {
    await consent(["read"]);

    for (const partial of [{ scope: "read" }, { sub: "user-1", scope: "read" }]) {
      const result = await authorizeMcpClaims(partial, { db, env });
      expect((result as Response).status).toBe(401);
    }
  });
});

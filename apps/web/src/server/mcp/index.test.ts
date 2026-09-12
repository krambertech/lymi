import { describe, expect, it } from "vitest";
import type { Db } from "../db";
import { handleVerifiedMcpRequest } from "./index";

const env = { PRODUCT_URL: "https://my.lymi.app" };
const claims = {
  sub: "user-1",
  scope: "read write offline_access",
  client_id: "https://c.example",
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
      claims,
      { db: {} as Db, env },
    );
    expect(init.status).toBe(200);
    const hello = (await resultOf(init)) as { result: { serverInfo: { name: string } } };
    expect(hello.result.serverInfo.name).toBe("lymi");

    const list = await handleVerifiedMcpRequest(
      rpc({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
      claims,
      { db: {} as Db, env },
    );
    expect(list.status).toBe(200);
    const tools = (await resultOf(list)) as { result: { tools: { name: string }[] } };
    expect(tools.result.tools.map((t) => t.name)).toContain("add_cards");
  });

  it("rejects a token with no subject before any tool can run", async () => {
    const res = await handleVerifiedMcpRequest(
      rpc({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
      { scope: "read" },
      { db: {} as Db, env },
    );
    expect(res.status).toBe(401);
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
      claims,
      { db: {} as Db, env },
    );
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

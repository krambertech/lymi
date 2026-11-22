import type { LaterParser } from "@lymi/core";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { resolver, uniqueSymbol } from "hono-openapi";
import { findTargetHandler } from "hono/utils/handler";
import { expect, it } from "vitest";
import type { z } from "zod";
import { unboundedParts } from "../../../../scripts/request-bounds.mjs";
import { app } from "./app";
import { handParsed } from "./http";
import { buildMcpServer } from "./mcp/server";
import { ACTIONS } from "./services/anki-connect";

type Documented = Pick<ReturnType<typeof resolver>, "toOpenAPISchema">;

const PARSERS: Record<LaterParser, () => Promise<string[]>> = {
  "AnkiConnect action": ankiConnectActions,
  "MCP tool": mcpTools,
};

async function partsOf(name: string, documented: Documented) {
  const { schema, components } = await documented.toOpenAPISchema();
  return unboundedParts(schema, {
    components: components?.schemas as Record<string, unknown> | undefined,
    parsers: Object.keys(PARSERS),
  }).map((problem) => `${name}: ${problem}`);
}

const schemaParts = (name: string, schema: z.ZodType) =>
  partsOf(name, resolver(schema, { options: { io: "input" } }));

function validators() {
  return app.routes.flatMap((route) => {
    const handler = findTargetHandler(route.handler as Parameters<typeof findTargetHandler>[0]);
    const spec = (handler as unknown as Record<symbol, unknown>)[uniqueSymbol] as
      | (Documented & { target?: string })
      | undefined;
    return spec?.target
      ? [{ name: `${route.method} ${route.path} ${spec.target}`, documented: spec }]
      : [];
  });
}

async function ankiConnectActions() {
  const parts = Object.entries(ACTIONS).map(([name, { params }]) =>
    schemaParts(`AnkiConnect ${name}`, params),
  );
  return (await Promise.all(parts)).flat();
}

async function mcpTools() {
  const server = buildMcpServer({
    ctx: { db: {} as never, userId: "bounds", actor: "mcp" },
    scope: "write",
    resourceMetadataUrl: "https://my.lymi.app/.well-known/oauth-protected-resource/mcp",
  });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "bounds", version: "1" });
  await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
  const { tools } = await client.listTools();
  return tools.flatMap((tool) =>
    unboundedParts(tool.inputSchema).map((problem) => `MCP ${tool.name}: ${problem}`),
  );
}

it("bounds every body, query and form a route reads", async () => {
  const checked = validators();
  expect(checked.map(({ name }) => name)).toEqual(
    expect.arrayContaining([
      "POST /api/cards/batch json",
      "GET /api/review/queue query",
      "POST /api/lesson-reads/answers json",
    ]),
  );
  expect(handParsed.map(({ what }) => what)).toEqual(
    expect.arrayContaining(["AnkiConnect call", "picture", "lesson"]),
  );
  const problems = await Promise.all([
    ...checked.map(({ name, documented }) => partsOf(name, documented)),
    ...handParsed.map(({ what, schema }) => schemaParts(what, schema)),
  ]);
  expect(problems.flat()).toEqual([]);
});

it.each(Object.entries(PARSERS))("bounds everything the %s parser reads", async (_, problems) => {
  expect(await problems()).toEqual([]);
});

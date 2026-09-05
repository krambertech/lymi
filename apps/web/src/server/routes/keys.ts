import { ApiKeyCreatedOut, ApiKeyInput, ApiKeyOut, OkOut } from "@lymi/core";
import { Hono } from "hono";
import { z } from "zod";
import { body, describe } from "../http";
import type { AppEnv } from "../index";
import { permissionsFor, scopeOf } from "../principal";

/**
 * Personal API keys. Every route is learner-only, so an API key can never list, mint or
 * revoke another key.
 */
export const keys = new Hono<AppEnv>();

const LEARNER_ONLY = "Session only. Any API key or token gets 403.";

keys.get(
  "/",
  describe({
    tags: ["API keys"],
    summary: "List API keys",
    learnerOnly: true,
    description: `${LEARNER_ONLY} Never includes the key itself.`,
    ok: { schema: z.array(ApiKeyOut), description: "Keys, newest first" },
  }),
  async (c) => {
    const { apiKeys } = await c.get("auth").api.listApiKeys({
      headers: c.req.raw.headers,
      query: { sortBy: "createdAt", sortDirection: "desc" },
    });
    return c.json(
      apiKeys.map((k) => ({
        id: k.id,
        name: k.name,
        start: k.start,
        scope: scopeOf(k.permissions),
        lastRequest: k.lastRequest,
        createdAt: k.createdAt,
      })),
    );
  },
);

keys.post(
  "/",
  describe({
    tags: ["API keys"],
    summary: "Create an API key",
    learnerOnly: true,
    description: `${LEARNER_ONLY} The plain key is in this response and nowhere else; the database holds a hash.`,
    ok: { status: 201, schema: ApiKeyCreatedOut, description: "The new key, once" },
    errors: [400],
  }),
  body(ApiKeyInput, "key"),
  async (c) => {
    const input = c.req.valid("json");
    const created = await c.get("auth").api.createApiKey({
      body: {
        name: input.name,
        userId: c.get("user").id,
        permissions: permissionsFor(input.scope),
      },
    });
    return c.json(
      {
        id: created.id,
        name: created.name,
        start: created.start,
        key: created.key,
        scope: input.scope,
        lastRequest: null,
        createdAt: created.createdAt,
      },
      201,
    );
  },
);

keys.delete(
  "/:id",
  describe({
    tags: ["API keys"],
    summary: "Revoke an API key",
    learnerOnly: true,
    description: `${LEARNER_ONLY} Final: requests with the key fail from the next call.`,
    ok: { schema: OkOut, description: "Revoked" },
    errors: [404],
  }),
  async (c) => {
    // The plugin checks the key exists and belongs to this learner, and throws a 404 APIError
    // otherwise, which onError maps.
    await c.get("auth").api.deleteApiKey({
      body: { keyId: c.req.param("id") },
      headers: c.req.raw.headers,
    });
    return c.json({ ok: true as const });
  },
);

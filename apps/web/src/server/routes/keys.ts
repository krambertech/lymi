import { ApiKeyInput } from "@lymi/core";
import { desc, eq } from "@lymi/core/db";
import { Hono } from "hono";
import { schema } from "../db";
import { parseBody } from "../http";
import type { AppEnv } from "../index";
import { permissionsFor, scopeOf } from "../principal";
import { ServiceError } from "../services/context";

/**
 * Personal API keys. Learner-only: `requireLearner` runs before these routes, so an API
 * key can never mint or revoke another key.
 */
export const keys = new Hono<AppEnv>();

keys.get("/", async (c) => {
  const rows = await c
    .get("db")
    .select({
      id: schema.apikey.id,
      name: schema.apikey.name,
      start: schema.apikey.start,
      permissions: schema.apikey.permissions,
      lastRequest: schema.apikey.lastRequest,
      createdAt: schema.apikey.createdAt,
    })
    .from(schema.apikey)
    .where(eq(schema.apikey.referenceId, c.get("user").id))
    .orderBy(desc(schema.apikey.createdAt));
  return c.json(
    rows.map(({ permissions, ...row }) => ({
      ...row,
      scope: scopeOf(parsePermissions(permissions)),
    })),
  );
});

/** The plain key is in this response and nowhere else. The database holds a hash. */
keys.post("/", async (c) => {
  const input = await parseBody(c, ApiKeyInput, "key");
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
});

keys.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const [row] = await c
    .get("db")
    .select({ id: schema.apikey.id })
    .from(schema.apikey)
    .where(eq(schema.apikey.id, id));
  if (!row) throw new ServiceError("not_found", "Key not found");
  await c.get("auth").api.deleteApiKey({ body: { keyId: id }, headers: c.req.raw.headers });
  return c.json({ ok: true });
});

function parsePermissions(raw: string | null): Record<string, string[]> | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const out: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (Array.isArray(v) && v.every((x) => typeof x === "string")) out[k] = v;
    }
    return out;
  } catch {
    return null;
  }
}

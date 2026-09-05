import { ConnectionOut, OkOut } from "@lymi/core";
import { inArray } from "@lymi/core/db";
import { Hono } from "hono";
import { z } from "zod";
import { schema } from "../db";
import { describe } from "../http";
import type { AppEnv } from "../index";

/**
 * The MCP clients the learner has let in. A grant made on the consent screen lives on until
 * it is taken back, so there has to be somewhere to take it back from; without this the only
 * way out is uninstalling the client.
 *
 * Learner-only, like API keys: a connector can never see or cut another connector's access.
 */
export const connections = new Hono<AppEnv>();

const LEARNER_ONLY = "Session only. Any API key or token gets 403.";

/**
 * The MCP plugin is added through `asPlugin` in auth.ts, which drops its endpoint types so
 * inference over the whole plugin list does not collapse (removing it also loses the API key
 * endpoints). These are the two endpoints this route calls, named back for the call sites.
 */
type ConsentApi = {
  getOAuthConsents(opts: {
    headers: Headers;
  }): Promise<
    { id: string; clientId: string; scopes: string[]; createdAt: Date; updatedAt: Date }[]
  >;
  deleteOAuthConsent(opts: { body: { id: string }; headers: Headers }): Promise<unknown>;
};

function consentApi(auth: { api: unknown }): ConsentApi {
  return auth.api as ConsentApi;
}

connections.get(
  "/",
  describe({
    tags: ["Connected apps"],
    summary: "List connected apps",
    learnerOnly: true,
    description: `${LEARNER_ONLY} One entry per app the learner granted access to.`,
    ok: { schema: z.array(ConnectionOut), description: "Connections, newest first" },
  }),
  async (c) => {
    const consents = await consentApi(c.get("auth")).getOAuthConsents({
      headers: c.req.raw.headers,
    });
    if (consents.length === 0) return c.json([]);

    // A consent row carries only the client id. Names come from the client record, read
    // straight from the table: `getOAuthClients` only answers for clients the learner
    // registered, and a CIMD client belongs to nobody.
    const ids = [...new Set(consents.map((consent) => consent.clientId))];
    const clients = await c
      .get("db")
      .select({ clientId: schema.oauthClient.clientId, name: schema.oauthClient.name })
      .from(schema.oauthClient)
      .where(inArray(schema.oauthClient.clientId, ids));
    const nameOf = new Map(clients.map((client) => [client.clientId, client.name]));

    return c.json(
      [...consents]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((consent) => ({
          id: consent.id,
          clientId: consent.clientId,
          name: nameOf.get(consent.clientId) ?? null,
          // Mirrors API keys: anything without "write" can only read.
          scope: consent.scopes.includes("write") ? ("write" as const) : ("read" as const),
          createdAt: consent.createdAt,
          updatedAt: consent.updatedAt,
        })),
    );
  },
);

connections.delete(
  "/:id",
  describe({
    tags: ["Connected apps"],
    summary: "Disconnect an app",
    learnerOnly: true,
    description: `${LEARNER_ONLY} The app's tokens stop working; it can ask again from its own sign-in.`,
    ok: { schema: OkOut, description: "Disconnected" },
    errors: [404],
  }),
  async (c) => {
    await consentApi(c.get("auth")).deleteOAuthConsent({
      body: { id: c.req.param("id") },
      headers: c.req.raw.headers,
    });
    return c.json({ ok: true as const });
  },
);

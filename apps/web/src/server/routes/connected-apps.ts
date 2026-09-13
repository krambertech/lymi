import { ConnectedAppOut, OkOut } from "@lymi/core";
import { Hono } from "hono";
import { z } from "zod";
import { ctxOf, describe } from "../http";
import type { AppEnv } from "../index";
import { clientNames, revokeClientTokens } from "../services/connected-apps";

/**
 * The MCP clients the learner has let in. A grant made on the consent screen lives on until
 * it is taken back, so there has to be somewhere to take it back from; without this the only
 * way out is uninstalling the client.
 *
 * Learner-only, like API keys: a connector can never see or cut another connector's access.
 */
export const connectedApps = new Hono<AppEnv>();

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

connectedApps.get(
  "/",
  describe({
    tags: ["Connected apps"],
    summary: "List connected apps",
    learnerOnly: true,
    description: `${LEARNER_ONLY} One entry per app the learner granted access to.`,
    ok: { schema: z.array(ConnectedAppOut), description: "Connected apps, newest first" },
  }),
  async (c) => {
    const consents = await consentApi(c.get("auth")).getOAuthConsents({
      headers: c.req.raw.headers,
    });
    if (consents.length === 0) return c.json([]);

    // A consent row carries only the client id; the name lives on the client record.
    const names = await clientNames(ctxOf(c), [...new Set(consents.map((row) => row.clientId))]);

    return c.json(
      [...consents]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((consent) => ({
          id: consent.id,
          clientId: consent.clientId,
          name: names.get(consent.clientId) ?? null,
          // Mirrors API keys: anything without "write" can only read.
          scope: consent.scopes.includes("write") ? ("write" as const) : ("read" as const),
          createdAt: consent.createdAt,
          updatedAt: consent.updatedAt,
        })),
    );
  },
);

connectedApps.delete(
  "/:id",
  describe({
    tags: ["Connected apps"],
    summary: "Disconnect an app",
    learnerOnly: true,
    description: `${LEARNER_ONLY} Removes the grant and revokes the app's refresh token. Its next MCP request is refused and it has to ask again.`,
    ok: { schema: OkOut, description: "Disconnected" },
    errors: [404],
  }),
  async (c) => {
    const id = c.req.param("id");
    const auth = consentApi(c.get("auth"));
    const headers = c.req.raw.headers;

    // Read the client before the row goes, and let the plugin own the 404 and the check that
    // this consent belongs to the caller.
    const consents = await auth.getOAuthConsents({ headers });
    const consent = consents.find((row) => row.id === id);
    await auth.deleteOAuthConsent({ body: { id }, headers });
    if (consent) await revokeClientTokens(ctxOf(c), consent.clientId);

    return c.json({ ok: true as const });
  },
);

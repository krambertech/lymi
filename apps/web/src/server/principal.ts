import type { Actor, Scope } from "@lymi/core";
import { eq } from "@lymi/core/db";
import type { Context, MiddlewareHandler } from "hono";
import type { Auth, SessionUser } from "./auth";
import { type Db, schema } from "./db";
import type { AppEnv } from "./index";

/**
 * Who is calling and what they may do. Three ways in, one shape:
 * a session cookie is the learner in the app, `x-api-key` is a personal key,
 * `Authorization: Bearer` is an OAuth access token from an MCP client (step 5).
 */
export interface Principal {
  user: SessionUser;
  actor: Actor;
  scope: Scope;
  /** The API key this request came in on. The learner in the app has none. */
  client?: string | undefined;
  /** The name the learner gave that key, kept on every row it writes. */
  clientName?: string | undefined;
}

export type Unauthenticated = { error: string; status: 401 | 429 };

export async function resolvePrincipal(c: Context<AppEnv>): Promise<Principal | Unauthenticated> {
  const auth = c.get("auth");
  const db = c.get("db");
  const key = c.req.header("x-api-key");
  if (key) return fromApiKey(auth, db, key);

  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return { error: "Sign in required", status: 401 };
  return { user: session.user, actor: "user", scope: "write" };
}

async function fromApiKey(auth: Auth, db: Db, key: string): Promise<Principal | Unauthenticated> {
  const result = await auth.api.verifyApiKey({ body: { key } });
  if (!result.valid || !result.key) {
    const code = result.error?.code;
    if (code === "RATE_LIMITED" || code === "USAGE_EXCEEDED") {
      return { error: "This key is over its rate limit", status: 429 };
    }
    return { error: "This API key is not valid", status: 401 };
  }
  // The key's own row carries its name; `verifyApiKey` does not return one.
  const [named] = await db
    .select({ name: schema.apikey.name })
    .from(schema.apikey)
    .where(eq(schema.apikey.id, result.key.id));
  const [user] = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
      emailVerified: schema.user.emailVerified,
      image: schema.user.image,
      createdAt: schema.user.createdAt,
      updatedAt: schema.user.updatedAt,
    })
    .from(schema.user)
    .where(eq(schema.user.id, result.key.referenceId));
  if (!user) return { error: "This API key is not valid", status: 401 };
  return {
    user,
    actor: "api",
    scope: scopeOf(result.key.permissions),
    client: result.key.id,
    ...(named?.name ? { clientName: named.name } : {}),
  };
}

/** Permissions are `{ lymi: [...] }`. Anything without "write" is read. */
export function scopeOf(permissions: Record<string, string[]> | null | undefined): Scope {
  return permissions?.lymi?.includes("write") ? "write" : "read";
}

export function permissionsFor(scope: Scope): Record<string, string[]> {
  return { lymi: scope === "write" ? ["read", "write"] : ["read"] };
}

/** Sets user, actor and scope on the context, or ends the request. */
export const authenticate: MiddlewareHandler<AppEnv> = async (c, next) => {
  const principal = await resolvePrincipal(c);
  if ("error" in principal) return c.json({ error: principal.error }, principal.status);
  c.set("user", principal.user);
  c.set("actor", principal.actor);
  c.set("scope", principal.scope);
  if (principal.client) c.set("client", principal.client);
  if (principal.clientName) c.set("clientName", principal.clientName);
  await next();
};

/** Anything that is not a read needs the write scope. */
export const requireScopeForWrites: MiddlewareHandler<AppEnv> = async (c, next) => {
  const reads = c.req.method === "GET" || c.req.method === "HEAD";
  if (!reads && c.get("scope") !== "write") {
    return c.json(
      { error: "This key can only read. Make one with write access in Settings." },
      403,
    );
  }
  await next();
};

/** Only the learner in the app. Grading reviews and managing keys are never for integrations. */
export const requireLearner: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (c.get("actor") !== "user") {
    return c.json({ error: "Only the learner can do this, from the app" }, 403);
  }
  await next();
};

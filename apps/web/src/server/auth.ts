import { apiKey } from "@better-auth/api-key";
import { cimd } from "@better-auth/cimd";
import { mcp } from "@better-auth/mcp";
import { type BetterAuthPlugin, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { jwt } from "better-auth/plugins/jwt";
import { fetchClientMetadataResource } from "./cimd-fetch";
import type { Db } from "./db";
import { schema } from "./db";
import { allowedEmails, type Bindings } from "./env";

/**
 * Better Auth must be created per request on Workers because D1 and KV bindings are
 * only available inside the request. It is cheap; nothing here does I/O at construction.
 */
export function createAuth(env: Bindings, db: Db) {
  const allowed = allowedEmails(env);

  return betterAuth({
    baseURL: env.PRODUCT_URL,
    basePath: "/api/auth",
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.PRODUCT_URL],
    database: drizzleAdapter(db, {
      provider: "sqlite",
      // D1 has no interactive transactions. Operations run one after another instead.
      transaction: false,
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        apikey: schema.apikey,
        jwks: schema.jwks,
        oauthClient: schema.oauthClient,
        oauthResource: schema.oauthResource,
        oauthClientResource: schema.oauthClientResource,
        oauthRefreshToken: schema.oauthRefreshToken,
        oauthAccessToken: schema.oauthAccessToken,
        oauthConsent: schema.oauthConsent,
        oauthClientAssertion: schema.oauthClientAssertion,
      },
    }),
    plugins: [
      // Personal keys for curl, scripts and Claude Code. Header x-api-key. One scope each,
      // stored as permissions { lymi: ["read"] } or { lymi: ["read", "write"] }.
      apiKey({
        defaultPrefix: "lymi_",
        requireName: true,
        // The plugin's default is 10 requests a day, meant for third-party keys. These are the learner's own.
        rateLimit: { enabled: true, timeWindow: 60_000, maxRequests: 600 },
        permissions: { defaultPermissions: { lymi: ["read"] } },
      }),
      // Signing keys for OAuth access tokens, published at /api/auth/jwks.
      jwt(),
      // This Worker is the OAuth 2.1 authorization server for MCP clients (Claude Desktop,
      // Codex). Tokens are bound to the MCP endpoint. Scopes mirror API keys: read, write.
      // offline_access lets a client hold a refresh token so it is not asked to sign in hourly.
      asPlugin(
        mcp({
          loginPage: "/login",
          consentPage: "/consent",
          resource: `${env.PRODUCT_URL}/mcp`,
          scopes: ["read", "write", "offline_access"],
        }),
      ),
      // Clients identify themselves with a Client ID Metadata Document at their client_id URL.
      // No dynamic registration: it is deprecated by the MCP 2026-07-28 spec.
      cimd({ fetchClientMetadataResource, metadataProfile: "mcp-2026-07-28" }),
    ],
    // Sessions are looked up from KV first, so most requests never touch D1.
    secondaryStorage: {
      get: (key) => env.SESSIONS.get(key),
      set: (key, value, ttl) =>
        env.SESSIONS.put(key, value, ttl ? { expirationTtl: Math.max(60, ttl) } : undefined),
      delete: (key) => env.SESSIONS.delete(key),
      getAndDelete: async (key) => {
        const value = await env.SESSIONS.get(key);
        if (value !== null) await env.SESSIONS.delete(key);
        return value;
      },
      // KV has no atomic increment. Rate limiting is per-isolate approximate; good enough for one user.
      increment: async (key, ttl) => {
        const current = Number((await env.SESSIONS.get(key)) ?? 0);
        const next = current + 1;
        await env.SESSIONS.put(
          key,
          String(next),
          ttl ? { expirationTtl: Math.max(60, ttl) } : undefined,
        );
        return next;
      },
    },
    // Local development only: email + password so the app is usable before Google is set up.
    emailAndPassword: { enabled: isLoopbackUrl(env.PRODUCT_URL) },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        // A private app: never ask Google to remember consent beyond the first sign-in.
        prompt: "select_account",
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      // The OAuth provider looks sessions up by id, which KV cannot do. Sessions live in D1
      // as well; KV stays the fast path for the common request.
      storeSessionInDatabase: true,
    },
    databaseHooks: {
      user: {
        create: {
          // The allowlist. While the app is private, only these accounts can create a user.
          before: async (user) => {
            if (!allowed.has(user.email.toLowerCase())) {
              throw new APIError("FORBIDDEN", {
                message: "This is a private app. Your account is not on the list.",
              });
            }
            return { data: user };
          },
        },
      },
    },
    advanced: {
      cookiePrefix: "lymi",
    },
  });
}

function isLoopbackUrl(value: string): boolean {
  try {
    const hostname = new URL(value).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}

export type Auth = ReturnType<typeof createAuth>;
export type SessionUser = NonNullable<Awaited<ReturnType<Auth["api"]["getSession"]>>>["user"];

/**
 * The OAuth provider's endpoint metadata types optional fields as `?: undefined`, which
 * `exactOptionalPropertyTypes` rejects against Better Auth's own plugin type. The plugin is
 * correct at runtime; this only tells the compiler so, in one place.
 */
function asPlugin(plugin: unknown): BetterAuthPlugin {
  return plugin as BetterAuthPlugin;
}

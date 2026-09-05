import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
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
    baseURL: env.APP_URL,
    basePath: "/api/auth",
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.APP_URL],
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
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
    emailAndPassword: { enabled: env.APP_URL.startsWith("http://localhost") },
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

export type Auth = ReturnType<typeof createAuth>;
export type SessionUser = NonNullable<Awaited<ReturnType<Auth["api"]["getSession"]>>>["user"];

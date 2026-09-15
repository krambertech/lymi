import { apiKey } from "@better-auth/api-key";
import { cimd } from "@better-auth/cimd";
import type { GenericEndpointContext } from "@better-auth/core";
import { mcp } from "@better-auth/mcp";
import { and, eq } from "@lymi/core/db";
import { type BetterAuthPlugin, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { jwt } from "better-auth/plugins/jwt";
import { cookiePrefix } from "../shared/cookies";
import { fetchClientMetadataResource } from "./cimd-fetch";
import type { Db } from "./db";
import { schema } from "./db";
import { allowedEmails, type Bindings, DEV_EMAIL_DOMAIN, devToolsEnabled } from "./env";
import { type Admission, admissionFrom, attributes, cookieName } from "./join-cookie";
import {
  avatarRow,
  hasGoogleAvatar,
  importGoogleAvatar,
  pictureFromIdToken,
} from "./services/avatars";
import { ServiceError } from "./services/context";
import { joinLinkAdmits, joinThroughLink } from "./services/invitations";
import { addPublishedDeck, publicationAdmits } from "./services/publications";

/**
 * Better Auth must be created per request on Workers because D1 and KV bindings are
 * only available inside the request. It is cheap; nothing here does I/O at construction.
 * `waitUntil` lets work that must not delay sign-in finish after the response.
 */
export function createAuth(
  env: Bindings,
  db: Db,
  waitUntil?: ((work: Promise<unknown>) => void) | undefined,
) {
  const allowed = allowedEmails(env);
  const dev = devToolsEnabled(env);

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
    emailAndPassword: { enabled: dev },
    // Registered only when configured: an empty pair makes Better Auth warn on every request,
    // which buries anything else in a local server's log.
    socialProviders:
      env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: env.GOOGLE_CLIENT_ID,
              clientSecret: env.GOOGLE_CLIENT_SECRET,
              // A private app: never ask Google to remember consent beyond the first sign-in.
              prompt: "select_account",
            },
          }
        : {},
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
          // The allowlist. Only these accounts, or someone who arrived through a working join
          // link or a published deck, can create a user. ADR 0011 and ADR 0020.
          before: async (user, context) => {
            const email = user.email.toLowerCase();
            // Persona accounts need no entry in .dev.vars; they cannot exist outside a local D1.
            const persona = dev && email.endsWith(DEV_EMAIL_DOMAIN);
            if (allowed.has(email) || persona) return { data: user };
            const admission = admissionFrom(env.PRODUCT_URL, headersOf(context));
            if (admission && (await admits(db, admission))) return { data: user };
            throw new APIError("FORBIDDEN", {
              message: "This is a private app. Your account is not on the list.",
            });
          },
        },
      },
      session: {
        create: {
          // Finish a join or an add that sign-in interrupted. A refused one still signs the
          // learner in; the join or add page then says why.
          after: async (session, context) => {
            if (isGoogleCallback(context)) {
              await syncGoogleAvatar(env, db, session.userId, waitUntil);
            }
            const admission = admissionFrom(env.PRODUCT_URL, headersOf(context));
            if (!admission) return;
            const ctx = { db, userId: session.userId, actor: "user" as const };
            try {
              if (admission.kind === "link") await joinThroughLink(ctx, admission.token);
              else await addPublishedDeck(ctx, admission.slug);
            } catch (err) {
              if (!(err instanceof ServiceError)) console.error("Joining after sign-in failed");
            }
            context?.setCookie(cookieName(env.PRODUCT_URL), "", {
              ...attributes(env.PRODUCT_URL),
              maxAge: 0,
            });
          },
        },
      },
    },
    advanced: {
      cookiePrefix: cookiePrefix(env.PRODUCT_URL),
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type SessionUser = NonNullable<Awaited<ReturnType<Auth["api"]["getSession"]>>>["user"];

function isGoogleCallback(context: GenericEndpointContext | null): boolean {
  // The router sets the matched path, "/callback/google"; direct API calls keep the pattern.
  const path = context?.path;
  return (
    (path === "/callback/google" || path === "/callback/:id") && context?.params?.id === "google"
  );
}

/** How long a first sign-in waits for the Google photo before the rest finishes in the background. */
const FIRST_IMPORT_WAIT_MS = 6_000;

/**
 * Refreshes the Google fallback photo from the ID token Google just issued. A first import
 * is awaited for a bounded time so the first screen usually has the photo; a refresh runs
 * after the response. Neither can fail sign-in. Issue 98.
 */
async function syncGoogleAvatar(
  env: Bindings,
  db: Db,
  userId: string,
  waitUntil: ((work: Promise<unknown>) => void) | undefined,
) {
  const refresh = await avatarRow({ db, userId }).then(hasGoogleAvatar, () => false);
  const work = (async () => {
    const picture = await googlePictureOf(db, userId);
    if (!picture) return;
    await importGoogleAvatar(
      { db, userId },
      { bucket: env.PRIVATE_IMAGES, images: env.IMAGES },
      picture,
    );
  })().catch(() => console.error("Importing the Google photo failed"));
  let background = false;
  try {
    if (waitUntil) {
      waitUntil(work);
      background = true;
    }
  } catch {}
  if (refresh && background) return;
  if (!background) return void (await work);
  await Promise.race([work, new Promise((resolve) => setTimeout(resolve, FIRST_IMPORT_WAIT_MS))]);
}

/** Better Auth stores the ID token from the code exchange with Google on every sign-in. */
async function googlePictureOf(db: Db, userId: string): Promise<string | null> {
  const [account] = await db
    .select({ idToken: schema.account.idToken })
    .from(schema.account)
    .where(and(eq(schema.account.userId, userId), eq(schema.account.providerId, "google")));
  return account?.idToken ? pictureFromIdToken(account.idToken) : null;
}

function admits(db: Db, admission: Admission): Promise<boolean> {
  return admission.kind === "link"
    ? joinLinkAdmits(db, admission.token)
    : publicationAdmits(db, admission.slug);
}

function headersOf(context: GenericEndpointContext | null): Headers | undefined {
  return context?.headers ?? context?.request?.headers;
}

/**
 * The OAuth provider's endpoint metadata types optional fields as `?: undefined`, which
 * `exactOptionalPropertyTypes` rejects against Better Auth's own plugin type. The plugin is
 * correct at runtime; this only tells the compiler so, in one place.
 */
function asPlugin(plugin: unknown): BetterAuthPlugin {
  return plugin as BetterAuthPlugin;
}

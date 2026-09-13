import type { Actor, Scope } from "@lymi/core";
import { MeOut } from "@lymi/core";
import { APIError } from "better-auth/api";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { type Auth, createAuth, type SessionUser } from "./auth";
import { createDb, type Db } from "./db";
import type { Bindings } from "./env";
import { fetchConfiguredAsset } from "./html";
import { describe, statusOf } from "./http";
import { joinPage } from "./join-page";
import { handleMcpRequest } from "./mcp";
import { advertisePublicResourceMetadata } from "./oauth-metadata";
import { mountOpenApi } from "./openapi";
import { canonicalOrigins, decideOriginRoute, responseForOriginDecision } from "./origin-routing";
import { authenticate } from "./principal";
import { dispatchReviewReminders } from "./push-delivery";
import { audio } from "./routes/audio";
import { cards } from "./routes/cards";
import { connectedApps } from "./routes/connected-apps";
import { decks } from "./routes/decks";
import { join, joinOpen } from "./routes/join";
import { keys } from "./routes/keys";
import { push } from "./routes/push";
import { review } from "./routes/review";
import { settings } from "./routes/settings";
import { stats } from "./routes/stats";
import { ServiceError } from "./services/context";

export type AppEnv = {
  Bindings: Bindings;
  Variables: {
    db: Db;
    auth: Auth;
    user: SessionUser;
    /** Who is making this request. Session cookies mean the learner in the app. */
    actor: Actor;
    /** What this caller may do. The learner in the app always has write. */
    scope: Scope;
  };
};

const app = new Hono<AppEnv>();

// The product root is an auth-aware door: a current session goes to Today, while a signed-out
// learner gets the sign-in screen. The public root is owned by the separate site Worker.
app.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const auth = createAuth(c.env, db);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  const destination = new URL(session ? "/today" : "/login", c.env.PRODUCT_URL);
  return c.redirect(destination.toString(), 302);
});

// Per-request services. Bindings are only available inside the request on Workers.
app.use("*", async (c, next) => {
  const db = createDb(c.env.DB);
  c.set("db", db);
  c.set("auth", createAuth(c.env, db));
  await next();
});

app.get("/api/health", describe({ hide: true }), (c) =>
  c.json({
    ok: true,
    name: "lymi-product",
    time: new Date().toISOString(),
    version: {
      id: c.env.CF_VERSION_METADATA.id,
      tag: c.env.CF_VERSION_METADATA.tag || null,
      deployedAt: c.env.CF_VERSION_METADATA.timestamp,
    },
  }),
);

// Better Auth owns everything under /api/auth.
app.on(["GET", "POST"], "/api/auth/*", (c) => c.get("auth").handler(c.req.raw));

// A deck's join page. Signed-out classmates land here from a chat, so it sits before
// authentication and renders its own state. ADR 0011.
app.get("/join/:token", joinPage);
app.route("/api/join", joinOpen);

// OAuth discovery lives at the site root by RFC 8414 and RFC 9728. Better Auth answers these
// from its request hooks, so they are forwarded as they are.
app.on(
  ["GET", "HEAD"],
  ["/.well-known/oauth-authorization-server", "/.well-known/oauth-authorization-server/*"],
  (c) => c.get("auth").handler(c.req.raw),
);
app.on(
  ["GET", "HEAD"],
  ["/.well-known/oauth-protected-resource", "/.well-known/oauth-protected-resource/*"],
  async (c) =>
    advertisePublicResourceMetadata(
      c.req.raw,
      await c.get("auth").handler(c.req.raw),
      canonicalOrigins(c.env).publicSite,
    ),
);

// The OpenAPI document and its reference UI. Public, so they sit before authentication.
mountOpenApi(app);

// The MCP server. Its own authentication: an OAuth access token this Worker issued.
app.all("/mcp", (c) =>
  handleMcpRequest(c.req.raw, { auth: c.get("auth"), db: c.get("db"), env: c.env }),
);

// Everything on this origin is one learner's product or protocol surface.
app.get("/robots.txt", describe({ hide: true }), (c) => {
  return c.text("User-agent: *\nDisallow: /\n", 200, {
    "cache-control": "public, max-age=3600",
  });
});

// Local development only: personas, seeding and due-date knobs. The import is behind a
// build-time flag, so the production Worker never contains these modules; the routes also
// answer 404 on any origin that is not loopback, as defence in depth.
if (import.meta.env.DEV) {
  const { dev } = await import("./routes/dev");
  app.route("/api/dev", dev);
}

// Everything else under /api needs a session cookie or an API key. What the caller may then
// do is declared on each route with describe(): writes need the write scope, learner-only
// routes need the learner. A route without describe() has no such check, so every route
// under /api gets one.
app.use("/api/*", authenticate);

app.get(
  "/api/me",
  describe({
    tags: ["Account"],
    summary: "Who am I",
    description: "The learner the key or session belongs to.",
    ok: { schema: MeOut, description: "The learner" },
  }),
  (c) => {
    const { id, name, email, image } = c.get("user");
    return c.json({ id, name, email, image });
  },
);

app.route("/api/decks", decks);
app.route("/api/join", join);
app.route("/api/cards", cards);
app.route("/api/review", review);
app.route("/api/settings", settings);
app.route("/api/stats", stats);
app.route("/api/keys", keys);
app.route("/api/connected-apps", connectedApps);
app.route("/api/push", push);
app.route("/api/audio", audio);

app.notFound((c) => {
  if (c.req.path.startsWith("/api/")) return c.json({ error: "Not found" }, 404);
  if (!c.env.ASSETS) return c.text("Not found", 404);
  return fetchConfiguredAsset(c.req.raw, c.env);
});

app.onError((err, c) => {
  if (err instanceof ServiceError) {
    return c.json({ error: err.message, issues: err.details }, statusOf(err));
  }
  if (err instanceof APIError) {
    return c.json({ error: err.body?.message ?? err.message }, err.statusCode as 400);
  }
  // Hono's own errors, such as the 400 its validator throws on a body that is not JSON.
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error(err);
  return c.json({ error: "Something went wrong" }, 500);
});

export default {
  fetch(request: Request, env: Bindings, executionCtx: ExecutionContext) {
    const originResponse = responseForOriginDecision(
      decideOriginRoute(request.url, canonicalOrigins(env)),
    );
    if (originResponse) return originResponse;
    return app.fetch(request, env, executionCtx);
  },
  scheduled(controller: ScheduledController, env: Bindings, executionCtx: ExecutionContext) {
    executionCtx.waitUntil(
      dispatchReviewReminders(env, new Date(controller.scheduledTime)).then((result) => {
        if (result.failed > 0) throw new Error(`${result.failed} review reminder sends failed`);
      }),
    );
  },
} satisfies ExportedHandler<Bindings>;

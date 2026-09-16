import type { Actor, Scope } from "@lymi/core";
import { MeOut } from "@lymi/core";
import { Hono } from "hono";
import { type Auth, createAuth, type SessionUser } from "./auth";
import { limitCredentialRequests } from "./auth-rate-limit";
import { createDb, type Db } from "./db";
import { type Bindings, withServedOrigin } from "./env";
import { fetchConfiguredAsset } from "./html";
import { describe, handleError } from "./http";
import { addPage, joinPage } from "./join-page";
import { handleMcpRequest } from "./mcp";
import { advertisePublicResourceMetadata } from "./oauth-metadata";
import { mountOpenApi } from "./openapi";
import { canonicalOrigins, decideOriginRoute, responseForOriginDecision } from "./origin-routing";
import { openPreview, requirePreviewAccess } from "./preview-access";
import { authenticate } from "./principal";
import { dispatchReviewReminders } from "./push-delivery";
import { add, addOpen } from "./routes/add";
import { audio } from "./routes/audio";
import { avatar } from "./routes/avatar";
import { cards } from "./routes/cards";
import { connectedApps } from "./routes/connected-apps";
import { decks } from "./routes/decks";
import { email } from "./routes/email";
import { exports as exportRoutes } from "./routes/exports";
import { images } from "./routes/images";
import { imports } from "./routes/imports";
import { join, joinOpen } from "./routes/join";
import { keys } from "./routes/keys";
import { push } from "./routes/push";
import { review } from "./routes/review";
import { deckSections, sections } from "./routes/sections";
import { series } from "./routes/series";
import { settings } from "./routes/settings";
import { stats } from "./routes/stats";
import { expireExports } from "./services/exports";
import { expireImports } from "./services/imports";

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

app.use("*", requirePreviewAccess);
app.get("/_preview", openPreview);

// The product root is an auth-aware door: a current session goes to Today, while a signed-out
// learner gets the sign-in screen. The public root is owned by the separate site Worker.
app.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const auth = createAuth(c.env, db);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  const destination = new URL(session ? "/today" : "/login", c.env.PRODUCT_URL);
  return c.redirect(destination.toString(), 302);
});

// OpenAI's plugin submission reads the bare token here to confirm this host owns the MCP server.
app.get("/.well-known/openai-apps-challenge", describe({ hide: true }), (c) => {
  const token = c.env.OPENAI_APPS_CHALLENGE?.trim();
  if (!token) return c.text("Not found", 404);
  return c.text(token, 200, { "cache-control": "no-store" });
});

// Per-request services. Bindings are only available inside the request on Workers.
app.use("*", async (c, next) => {
  const db = createDb(c.env.DB);
  c.set("db", db);
  c.set(
    "auth",
    createAuth(c.env, db, (work) => c.executionCtx.waitUntil(work)),
  );
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

// Better Auth owns everything under /api/auth. The credential endpoints are metered first.
app.use("/api/auth/*", limitCredentialRequests);
app.on(["GET", "POST"], "/api/auth/*", (c) => c.get("auth").handler(c.req.raw));

// A deck's join page. Signed-out classmates land here from a chat, so it sits before
// authentication and renders its own state. ADR 0011.
app.get("/join/:token", joinPage);
app.route("/api/join", joinOpen);
// Where "Add to Lymi" on a published deck's public page lands. ADR 0020.
app.get("/add/:slug", addPage);
app.route("/api/add", addOpen);

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

// Personas and data controls exist only in local development and isolated preview builds.
// The production build drops the import; the routes also verify the runtime origin.
if (import.meta.env.DEV || import.meta.env.LYMI_APP_PREVIEW) {
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
    const { id, name, email } = c.get("user");
    return c.json({ id, name, email });
  },
);

app.route("/api/decks", decks);
app.route("/api/email", email);
app.route("/api/series", series);
app.route("/api/decks", deckSections);
app.route("/api/sections", sections);
app.route("/api/join", join);
app.route("/api/add", add);
app.route("/api/cards", cards);
app.route("/api/cards", images);
app.route("/api/review", review);
app.route("/api/settings", settings);
app.route("/api/stats", stats);
app.route("/api/keys", keys);
app.route("/api/connected-apps", connectedApps);
app.route("/api/push", push);
app.route("/api/audio", audio);
app.route("/api/avatar", avatar);
app.route("/api/imports", imports);
app.route("/api/exports", exportRoutes);

app.notFound(async (c) => {
  if (c.req.path.startsWith("/api/")) return c.json({ error: "Not found" }, 404);
  if (!c.env.ASSETS) return c.text("Not found", 404);
  const response = await fetchConfiguredAsset(c.req.raw, c.env);
  // This page carries a one-use reset token in its query, so the address never rides a
  // referer off this origin. The join page sets the same header for the same reason.
  if (c.req.path === "/reset-password") {
    const withPolicy = new Response(response.body, response);
    withPolicy.headers.set("referrer-policy", "same-origin");
    return withPolicy;
  }
  return response;
});

app.onError(handleError);

export default {
  fetch(request: Request, configuredEnv: Bindings, executionCtx: ExecutionContext) {
    const env = withServedOrigin(request.url, configuredEnv);
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
    executionCtx.waitUntil(
      expireImports(createDb(env.DB), env.IMPORTS, new Date(controller.scheduledTime)),
    );
    executionCtx.waitUntil(
      expireExports(createDb(env.DB), env.EXPORTS, new Date(controller.scheduledTime)),
    );
  },
} satisfies ExportedHandler<Bindings>;

export { ExportWorkflow } from "./exports/workflow";
export { ImportWorkflow } from "./imports/workflow";

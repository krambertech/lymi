import type { Actor, Scope } from "@lymi/core";
import { MeOut } from "@lymi/core";
import { Hono } from "hono";
import { routePath } from "hono/route";
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
import { requireStrongPassword } from "./password-rules";
import { openPreview, requirePreviewAccess } from "./preview-access";
import { authenticate } from "./principal";
import { activity } from "./routes/activity";
import { add, addOpen } from "./routes/add";
import { audio } from "./routes/audio";
import { avatar } from "./routes/avatar";
import { cards } from "./routes/cards";
import { connectedApps } from "./routes/connected-apps";
import { decks } from "./routes/decks";
import { email } from "./routes/email";
import { explore } from "./routes/explore";
import { exports as exportRoutes } from "./routes/exports";
import { feedback } from "./routes/feedback";
import { images } from "./routes/images";
import { imports } from "./routes/imports";
import { join, joinOpen } from "./routes/join";
import { keys } from "./routes/keys";
import { publicMedia } from "./routes/public-media";
import { push } from "./routes/push";
import { review } from "./routes/review";
import { deckSections, sections } from "./routes/sections";
import { series } from "./routes/series";
import { settings } from "./routes/settings";
import { stats } from "./routes/stats";
import { recordRequest } from "./services/analytics";
import { catchUpStates } from "./services/modes";

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
    /** The API key behind an `api` request, so Activity can name it. Unset for the learner. */
    client?: string | undefined;
    /** That key's name, written onto the rows it makes. */
    clientName?: string | undefined;
    /** Set when no route answered, so analytics never records the requested path. */
    unmatched?: true;
  };
};

export const app = new Hono<AppEnv>();

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

app.use("*", async (c, next) => {
  const path = c.req.path;
  if (!(path.startsWith("/api/") || path === "/mcp" || path.startsWith("/public/"))) {
    return next();
  }
  const start = performance.now();
  await next();
  try {
    const route = routePath(c);
    const actor = c.get("actor");
    recordRequest(c.env.REQUESTS, {
      route: c.get("unmatched") ? "unmatched" : route || "unmatched",
      method: c.req.method,
      status: c.res.status,
      durationMs: performance.now() - start,
      // Routes before `authenticate` never learn who is calling, so they count as public.
      actor:
        actor === "user" || actor === "api"
          ? actor
          : route === "/mcp" && c.res.status < 400
            ? "mcp"
            : c.res.status === 401
              ? "anon"
              : "public",
    });
  } catch {
    // Measurement cannot change the response.
  }
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
app.use("/api/auth/*", requireStrongPassword);
app.on(["GET", "POST"], "/api/auth/*", (c) => c.get("auth").handler(c.req.raw));

// Without a live session, Explore is the site's public catalogue; the redirect is temporary
// because it depends on the session.
app.on("GET", ["/explore", "/explore/*"], async (c, next) => {
  if (await c.get("auth").api.getSession({ headers: c.req.raw.headers })) return next();
  const url = new URL(c.req.url);
  const destination = new URL(`${url.pathname}${url.search}`, canonicalOrigins(c.env).publicSite);
  return c.redirect(destination.toString(), 302);
});

// A deck's join page. Signed-out classmates land here from a chat, so it sits before
// authentication and renders its own state. ADR 0011.
app.get("/join/:token", joinPage);
app.route("/api/join", joinOpen);
// Where "Add to Lymi" on a published deck's public page lands. ADR 0020.
app.get("/add/:slug", addPage);
app.route("/api/add", addOpen);
app.route("/public/media", publicMedia);

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

// A member's states catch up to their decks before anything that reads progress. ADR 0022.
for (const path of [
  "decks",
  "series",
  "sections",
  "cards",
  "review",
  "stats",
  "exports",
  // A goal change settles today against the queue.
  "settings",
]) {
  app.use(`/api/${path}/*`, async (c, next) => {
    await catchUpStates(c.get("db"), c.get("user").id);
    await next();
  });
}

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
app.route("/api/feedback", feedback);
app.route("/api/activity", activity);
app.route("/api/explore", explore);

app.notFound(async (c) => {
  c.set("unmatched", true);
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

/** The Worker's fetch handler: origin routing first, then the app. */
export function handleFetch(
  request: Request,
  configuredEnv: Bindings,
  executionCtx: ExecutionContext,
): Response | Promise<Response> {
  const env = withServedOrigin(request.url, configuredEnv);
  const originResponse = responseForOriginDecision(
    decideOriginRoute(request.url, canonicalOrigins(env)),
  );
  if (originResponse) return originResponse;
  return app.fetch(request, env, executionCtx);
}

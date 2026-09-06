import type { Actor, Scope } from "@lymi/core";
import { MeOut } from "@lymi/core";
import { APIError } from "better-auth/api";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { type Auth, createAuth, type SessionUser } from "./auth";
import { createDb, type Db } from "./db";
import type { Bindings } from "./env";
import { describe, statusOf } from "./http";
import { handleMcpRequest } from "./mcp";
import { mountOpenApi } from "./openapi";
import { authenticate } from "./principal";
import { dispatchReviewReminders } from "./push-delivery";
import { audio } from "./routes/audio";
import { beta } from "./routes/beta";
import { cards } from "./routes/cards";
import { connectedApps } from "./routes/connected-apps";
import { decks } from "./routes/decks";
import { keys } from "./routes/keys";
import { push } from "./routes/push";
import { review } from "./routes/review";
import { settings } from "./routes/settings";
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

// Preserve old bookmarks while keeping authentication on the canonical origin. This runs
// before both the server-rendered landing page and the authenticated application routes.
app.use("*", async (c, next) => {
  const url = new URL(c.req.url);
  if (url.hostname === "lymi.k-porshnieva.workers.dev" && c.env.APP_URL === "https://lymi.app") {
    url.hostname = "lymi.app";
    return c.redirect(url.toString(), 308);
  }
  await next();
});

// Unlike the private product, the public front door is rendered into the response. React
// hydrates it in the browser, so its form and motion keep working without making the copy,
// metadata, or page structure depend on JavaScript.
app.get("/", async (c) => {
  const { renderLandingPage } = await import("./landing");
  return renderLandingPage(c.req.raw, c.env);
});

// Per-request services. Bindings are only available inside the request on Workers.
app.use("*", async (c, next) => {
  const db = createDb(c.env.DB);
  c.set("db", db);
  c.set("auth", createAuth(c.env, db));
  await next();
});

app.get("/api/health", describe({ hide: true }), (c) =>
  c.json({ ok: true, name: "lymi", time: new Date().toISOString() }),
);

// Better Auth owns everything under /api/auth.
app.on(["GET", "POST"], "/api/auth/*", (c) => c.get("auth").handler(c.req.raw));

// OAuth discovery lives at the site root by RFC 8414 and RFC 9728. Better Auth answers these
// from its request hooks, so they are forwarded as they are.
app.on(
  ["GET", "HEAD"],
  [
    "/.well-known/oauth-authorization-server",
    "/.well-known/oauth-authorization-server/*",
    "/.well-known/oauth-protected-resource",
    "/.well-known/oauth-protected-resource/*",
  ],
  (c) => c.get("auth").handler(c.req.raw),
);

// The OpenAPI document and its reference UI. Public, so they sit before authentication.
mountOpenApi(app);

// The MCP server. Its own authentication: an OAuth access token this Worker issued.
app.all("/mcp", (c) =>
  handleMcpRequest(c.req.raw, { auth: c.get("auth"), db: c.get("db"), env: c.env }),
);

// The waiting list behind the landing page. A stranger has no session and no key, so this
// sits with the other public routes, above authentication.
app.route("/api/beta", beta);

// What crawlers may read. The public pages are the landing page and the docs; everything
// else is one learner's data behind a session, so it is disallowed rather than merely
// unlinked. `noindex` on the app routes is set in the client as well, for anything that
// arrives at a URL directly.
app.get("/robots.txt", describe({ hide: true }), (c) => {
  const origin = c.env.APP_URL ?? new URL(c.req.url).origin;
  return c.text(
    [
      "User-agent: *",
      "Disallow: /api/",
      "Disallow: /today",
      "Disallow: /app",
      "Disallow: /library",
      "Disallow: /review",
      "Disallow: /you",
      "Disallow: /activity",
      "Disallow: /insights",
      "Disallow: /archived",
      "Disallow: /login",
      "Disallow: /consent",
      "Disallow: /design",
      "",
      `Sitemap: ${origin}/sitemap.xml`,
      "",
    ].join("\n"),
    200,
    { "cache-control": "public, max-age=3600" },
  );
});

app.get("/sitemap.xml", describe({ hide: true }), (c) => {
  const origin = c.env.APP_URL ?? new URL(c.req.url).origin;
  const paths = [
    "/",
    "/docs",
    "/docs/quickstart",
    "/docs/cards",
    "/docs/mcp",
    "/docs/mcp/claude",
    "/docs/mcp/chatgpt",
    "/docs/authentication",
    "/docs/api",
    "/docs/recipes",
  ];
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...paths.map((p) => `  <url><loc>${origin}${p}</loc></url>`),
    "</urlset>",
    "",
  ].join("\n");
  return c.body(body, 200, {
    "content-type": "application/xml; charset=utf-8",
    "cache-control": "public, max-age=3600",
  });
});

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
app.route("/api/cards", cards);
app.route("/api/review", review);
app.route("/api/settings", settings);
app.route("/api/keys", keys);
app.route("/api/connected-apps", connectedApps);
app.route("/api/push", push);
app.route("/api/audio", audio);

app.notFound((c) => {
  if (c.req.path.startsWith("/api/")) return c.json({ error: "Not found" }, 404);
  // Anything else is the SPA. In production the assets binding serves it before we get here,
  // and `vite dev` serves it from Vite, so this only runs for a path the Worker claimed.
  if (!c.env.ASSETS) return c.text("Not found", 404);
  return c.env.ASSETS.fetch(c.req.raw);
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

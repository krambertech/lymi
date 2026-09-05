import type { Actor, Scope } from "@lymi/core";
import { MeOut } from "@lymi/core";
import { APIError } from "better-auth/api";
import { Hono } from "hono";
import { type Auth, createAuth, type SessionUser } from "./auth";
import { createDb, type Db } from "./db";
import type { Bindings } from "./env";
import { describe, statusOf } from "./http";
import { mountOpenApi } from "./openapi";
import { authenticate, requireLearner, requireScopeForWrites } from "./principal";
import { cards } from "./routes/cards";
import { decks } from "./routes/decks";
import { keys } from "./routes/keys";
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

// The OpenAPI document and its reference UI. Public, so they sit before authentication.
mountOpenApi(app);

// Everything else under /api needs a session cookie or an API key, and writes need the write scope.
app.use("/api/*", authenticate, requireScopeForWrites);
// Grading and key management are the learner's alone, whatever a key's scope.
app.use("/api/review/grade", requireLearner);
app.use("/api/keys/*", requireLearner);
app.use("/api/keys", requireLearner);

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

// Audio is generated with OpenAI text-to-speech and cached in R2. Not wired yet.
app.get("/api/audio/:cardId", describe({ hide: true }), (c) =>
  c.json({ error: "Audio is not set up yet" }, 501),
);

app.notFound((c) => {
  if (c.req.path.startsWith("/api/")) return c.json({ error: "Not found" }, 404);
  // Anything else is the SPA. In production the assets binding serves it before we get here.
  return c.env.ASSETS.fetch(c.req.raw);
});

app.onError((err, c) => {
  if (err instanceof ServiceError) {
    return c.json({ error: err.message, issues: err.details }, statusOf(err));
  }
  if (err instanceof APIError) {
    return c.json({ error: err.body?.message ?? err.message }, err.statusCode as 400);
  }
  console.error(err);
  return c.json({ error: "Something went wrong" }, 500);
});

export default app;

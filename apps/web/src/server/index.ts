import { Hono } from "hono";
import { type Auth, createAuth, type SessionUser } from "./auth";
import { createDb, type Db } from "./db";
import type { Bindings } from "./env";
import { cards } from "./routes/cards";
import { decks } from "./routes/decks";
import { review } from "./routes/review";

export type AppEnv = {
  Bindings: Bindings;
  Variables: {
    db: Db;
    auth: Auth;
    user: SessionUser;
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

app.get("/api/health", (c) => c.json({ ok: true, name: "lymi", time: new Date().toISOString() }));

// Better Auth owns everything under /api/auth.
app.on(["GET", "POST"], "/api/auth/*", (c) => c.get("auth").handler(c.req.raw));

// Everything else under /api needs a session.
app.use("/api/*", async (c, next) => {
  const session = await c.get("auth").api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Sign in required" }, 401);
  c.set("user", session.user);
  await next();
});

app.get("/api/me", (c) => {
  const { id, name, email, image } = c.get("user");
  return c.json({ id, name, email, image });
});

app.route("/api/decks", decks);
app.route("/api/cards", cards);
app.route("/api/review", review);

// Audio is generated with OpenAI text-to-speech and cached in R2. Not wired yet.
app.get("/api/audio/:cardId", (c) => c.json({ error: "Audio is not set up yet" }, 501));

app.notFound((c) => {
  if (c.req.path.startsWith("/api/")) return c.json({ error: "Not found" }, 404);
  // Anything else is the SPA. In production the assets binding serves it before we get here.
  return c.env.ASSETS.fetch(c.req.raw);
});

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "Something went wrong" }, 500);
});

export default app;

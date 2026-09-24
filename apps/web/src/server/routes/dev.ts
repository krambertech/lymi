import { type Context, Hono } from "hono";
import { z } from "zod";
import { devPersonaCookieName } from "../../shared/cookies";
import { safeProductReturnPath } from "../../shared/origins";
import type { Auth } from "../auth";
import type { Db } from "../db";
import { DEV_PASSWORD, type Persona, personaEmail, personaFor, personas } from "../dev/personas";
import { devToolsEnabled } from "../env";
import { body, describe, query } from "../http";
import type { AppEnv } from "../index";
import {
  addSampleCards,
  asClaude,
  deletePersonaAccount,
  devCounts,
  enrichSampleCards,
  markEnriched,
  reachGoal,
  recallCards,
  resetAccount,
  seedPersona,
  setDue,
  slipCards,
} from "../services/dev";
import { latestLocalEmail } from "../services/email";
import { getSettings } from "../services/settings";

/**
 * Local development and isolated app previews only. One URL signs a persona in, one call
 * seeds or empties an account, and one moves due dates. Every route answers 404 unless its
 * runtime gate is valid, and none of them is in the OpenAPI document.
 *
 * Mounted above `authenticate`: sign-in has no session yet, and the rest check for one here.
 */
export const dev = new Hono<AppEnv>();

dev.use("*", async (c, next) => {
  if (!devToolsEnabled(c.env)) return c.json({ error: "Not found" }, 404);
  await next();
});

const summary = (p: Persona) => ({
  id: p.id,
  name: p.name,
  email: personaEmail(p.id),
  description: p.description,
  appLanguage: p.appLanguage,
  decks: p.decks.filter((d) => !d.archived).length,
  cards: p.decks.filter((d) => !d.archived).flatMap((d) => d.cards.filter((c) => !c.archived))
    .length,
  dueNow: p.dueNow,
});

dev.get("/personas", describe({ hide: true, open: true }), (c) =>
  c.json({ personas: personas.map(summary), signInUrl: "/api/dev/sign-in?as=<id>" }),
);

const OutboxBody = z.object({
  to: z.string().trim().toLowerCase().email().max(254),
});

dev.post(
  "/outbox",
  describe({ hide: true, open: true }),
  body(OutboxBody, "outbox request"),
  (c) => {
    const message = latestLocalEmail(c.req.valid("json").to);
    return message ? c.json({ message }) : c.json({ error: "Email not found" }, 404);
  },
);

const SignInQuery = z.object({
  as: z
    .string()
    .default("learner")
    .refine((id) => personas.some((p) => p.id === id), "Unknown persona"),
  /** Where to land after sign-in. A product path; anything else falls back to Today. */
  returnTo: z.string().optional(),
  /** `reset=1` reseeds even when the account already has data. */
  reset: z.literal("1").optional(),
  /** `seed=0` signs in without touching the data. */
  seed: z.literal("0").optional(),
});

/**
 * Become a persona. Creates the account on first use, seeds it when it is empty, and sets
 * the session cookie. A GET redirects into the app so a browser can be pointed at the URL;
 * a POST answers JSON for the panel and the CLI. Both carry the same cookies.
 */
dev.on(
  ["GET", "POST"],
  "/sign-in",
  describe({ hide: true, open: true }),
  query(SignInQuery, "query"),
  async (c) => {
    const { as, returnTo, reset, seed } = c.req.valid("query");
    const persona = personas.find((p) => p.id === as);
    if (!persona) return c.json({ error: "Unknown persona" }, 400);

    const signed = await signInPersona(c.get("auth"), c.get("db"), persona);
    const ctx = { db: c.get("db"), userId: signed.userId, actor: "user" as const };

    let seeded = false;
    if (seed !== "0") {
      const counts = await devCounts(ctx);
      if (reset === "1" || counts.decks === 0) {
        await seedPersona(ctx, persona);
        seeded = true;
      }
    }

    const headers = new Headers();
    for (const cookie of signed.cookies) headers.append("set-cookie", cookie);
    // Read by the client on boot: a change of persona throws the persisted query cache away.
    headers.append(
      "set-cookie",
      `${devPersonaCookieName(c.env.PRODUCT_URL)}=${persona.id}; Path=/; SameSite=Lax`,
    );

    if (c.req.method === "GET") {
      const destination = new URL(safeProductReturnPath(returnTo), c.env.PRODUCT_URL);
      headers.set("location", destination.toString());
      return new Response(null, { status: 303, headers });
    }
    // Built by hand: folding Headers into an object for c.json() keeps only the last cookie.
    headers.set("content-type", "application/json");
    const body = {
      persona: summary(persona),
      created: signed.created,
      seeded,
      counts: await devCounts(ctx),
    };
    return new Response(JSON.stringify(body), { status: 200, headers });
  },
);

/** The routes below act on the signed-in account, whichever persona or real account it is. */
dev.use("*", async (c, next) => {
  const session = await c.get("auth").api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Sign in required" }, 401);
  c.set("user", session.user);
  c.set("actor", "user");
  c.set("scope", "write");
  await next();
});

function ctxOf(c: Context<AppEnv>) {
  return { db: c.get("db"), userId: c.get("user").id, actor: "user" as const };
}

dev.get("/state", describe({ hide: true, open: true }), async (c) => {
  const user = c.get("user");
  const ctx = ctxOf(c);
  const persona = personaFor(user.email);
  const [counts, settings] = await Promise.all([devCounts(ctx), getSettings(ctx)]);
  return c.json({
    user: { id: user.id, name: user.name, email: user.email },
    persona: persona ? summary(persona) : null,
    counts,
    settings: { appLanguage: settings.appLanguage, meaningLanguage: settings.meaningLanguage },
  });
});

const SeedBody = z.object({
  /** Which persona's data to load. Defaults to the account's own persona, then `learner`. */
  persona: z.string().optional(),
});

dev.post("/seed", describe({ hide: true, open: true }), body(SeedBody, "seed"), async (c) => {
  const { persona: id } = c.req.valid("json");
  const persona = id
    ? personas.find((p) => p.id === id)
    : (personaFor(c.get("user").email) ?? personas.find((p) => p.id === "learner"));
  if (!persona) return c.json({ error: "Unknown persona" }, 400);
  const counts = await seedPersona(ctxOf(c), persona);
  return c.json({ persona: summary(persona), counts });
});

dev.post("/reset", describe({ hide: true, open: true }), async (c) => {
  const ctx = ctxOf(c);
  await resetAccount(ctx);
  return c.json({ counts: await devCounts(ctx) });
});

const DueBody = z.object({
  count: z.union([z.number().int().min(0).max(10_000), z.literal("all")]),
});

dev.post("/due", describe({ hide: true, open: true }), body(DueBody, "due"), async (c) => {
  const ctx = ctxOf(c);
  const due = await setDue(ctx, c.req.valid("json").count);
  return c.json({ due, counts: await devCounts(ctx) });
});

const CountBody = z.object({ count: z.number().int().min(1).max(200) });

// Cards an assistant adds, named as Claude, so Activity shows a connected app's write.
dev.post("/cards", describe({ hide: true, open: true }), body(CountBody, "cards"), async (c) => {
  const ctx = ctxOf(c);
  const added = await addSampleCards(asClaude(ctx), c.req.valid("json").count);
  return c.json({ added, counts: await devCounts(ctx) });
});

dev.post("/enrich", describe({ hide: true, open: true }), body(CountBody, "enrich"), async (c) => {
  const ctx = ctxOf(c);
  const enriched = await enrichSampleCards(ctx, c.req.valid("json").count);
  return c.json({ enriched, counts: await devCounts(ctx) });
});

const RecallBody = z.object({
  count: z.number().int().min(1).max(200),
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
});

dev.post("/recall", describe({ hide: true, open: true }), body(RecallBody, "recall"), async (c) => {
  const ctx = ctxOf(c);
  const { count, rating } = c.req.valid("json");
  const graded = await recallCards(ctx, count, rating);
  return c.json({ graded, counts: await devCounts(ctx) });
});

dev.post("/goal", describe({ hide: true, open: true }), async (c) => {
  const ctx = ctxOf(c);
  const graded = await reachGoal(ctx);
  return c.json({ graded, counts: await devCounts(ctx) });
});

dev.post("/slip", describe({ hide: true, open: true }), body(CountBody, "slip"), async (c) => {
  const ctx = ctxOf(c);
  const slipped = await slipCards(ctx, c.req.valid("json").count);
  return c.json({ slipped, counts: await devCounts(ctx) });
});

const EnrichedBody = z.object({
  fields: z.array(z.enum(["meaning", "example", "pronunciation"])).min(1),
});

dev.post(
  "/cards/:id/enriched",
  describe({ hide: true, open: true }),
  body(EnrichedBody, "enriched"),
  async (c) => {
    const marked = await markEnriched(ctxOf(c), c.req.param("id"), c.req.valid("json").fields);
    return marked ? c.json({ ok: true }) : c.json({ error: "Card not found" }, 404);
  },
);

/**
 * Sign the persona's account in through Better Auth's own email flow, creating it on first
 * use. The password is fixed and public; the accounts exist only in disposable data stores.
 *
 * Sign-up issues no session while verification is required, so a fresh persona signs in on a
 * second call. It succeeds because a persona account is created already confirmed.
 *
 * A store that outlives a change to `DEV_PASSWORD` holds personas whose stored password is
 * the old one, and no public endpoint sets a password without a link from an inbox a persona
 * does not have. A fixture whose password no longer matches its definition is rebuilt, and
 * the caller reseeds it.
 */
async function signInPersona(auth: Auth, db: Db, persona: Persona) {
  const email = personaEmail(persona.id);
  const signIn = () =>
    auth.api.signInEmail({ body: { email, password: DEV_PASSWORD }, asResponse: true });

  const attempt = await signIn();
  if (attempt.ok) return await sessionFrom(attempt, false);

  const created = await auth.api.signUpEmail({
    body: { email, password: DEV_PASSWORD, name: persona.name },
    asResponse: true,
  });
  if (!created.ok) throw new Error(`Could not create ${email}: ${await created.text()}`);

  const signedIn = await signIn();
  if (signedIn.ok) return await sessionFrom(signedIn, true);

  // The account is there and its password is not this one, so the fixture is stale.
  console.warn(`Rebuilding ${email}: its stored password predates the current fixture.`);
  await deletePersonaAccount(db, email);
  const rebuilt = await auth.api.signUpEmail({
    body: { email, password: DEV_PASSWORD, name: persona.name },
    asResponse: true,
  });
  if (!rebuilt.ok) throw new Error(`Could not rebuild ${email}: ${await rebuilt.text()}`);

  const final = await signIn();
  if (!final.ok) throw new Error(`Could not sign ${email} in: ${await final.text()}`);
  return await sessionFrom(final, true);
}

async function sessionFrom(response: Response, created: boolean) {
  const data = (await response.json()) as { user?: { id?: string } };
  const userId = data.user?.id;
  if (!userId) throw new Error("Sign-in response carried no user");
  return { userId, created, cookies: response.headers.getSetCookie() };
}

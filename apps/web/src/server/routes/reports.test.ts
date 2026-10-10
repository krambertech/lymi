import type { DeckReportOut, DeckReportsOut } from "@lymi/core";
import { countDeckPageView } from "@lymi/core/catalog";
import { eq } from "@lymi/core/db";
import { Hono } from "hono";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAuth } from "../auth";
import { type Db, schema } from "../db";
import type { Bindings } from "../env";
import { handleError } from "../http";
import type { AppEnv } from "../index";
import { authenticate, permissionsFor } from "../principal";
import { addCards } from "../services/cards";
import type { ServiceContext } from "../services/context";
import { archiveDeck, createDeck } from "../services/decks";
import { leave } from "../services/members";
import { addPublishedDeck, publishDeck, withdrawDeck } from "../services/publications";
import { gradeCard } from "../services/review";
import { undoReview } from "../services/review-days";
import { learner, type TestBindings, testDb } from "../services/test-db";
import { reports } from "./reports";

/** Publisher reports over HTTP with real keys, through the guards the Worker mounts. ADR 0028. */
const PRODUCT_URL = "https://my.lymi.test";
const publishers = new Set(["lymi@lymi.test", "mari@lymi.test"]);
const DAY = 86_400_000;
const TERM = { cue: "term", target: "meaning" } as const;

let db: Db;
let env: Bindings;
let dispose: () => Promise<void>;
let lymi: ServiceContext;
let anna: ServiceContext;
const deck = { live: "", gone: "", private: "", maris: "" };
const key = { write: "", read: "", otherPublisher: "", learner: "" };
let readKeyId = "";

const app = new Hono<AppEnv>()
  .use("*", async (c, next) => {
    c.set("db", db);
    c.set("auth", createAuth(c.env, db));
    await next();
  })
  .use("/api/*", authenticate)
  .route("/api/reports", reports)
  .onError(handleError);

async function mintKey(ctx: ServiceContext, name: string, scope: "read" | "write") {
  return createAuth(env, db).api.createApiKey({
    body: { name, userId: ctx.userId, permissions: permissionsFor(scope) },
  });
}

function get(path: string, apiKey: string) {
  return app.request(`${PRODUCT_URL}${path}`, { headers: { "x-api-key": apiKey } }, env);
}

async function publishedDeck(owner: ServiceContext, slug: string) {
  const created = await createDeck(owner, { name: `Deck ${slug}`, defaultLanguage: "et" });
  const added = await addCards(owner, [
    { deckId: created.id, term: `tere ${slug}`, meaning: "hello" },
    { deckId: created.id, term: `aitäh ${slug}`, meaning: "thank you" },
  ]);
  await publishDeck(
    owner,
    created.id,
    {
      slug,
      summary: "Words for a first week.",
      publisher: "Lymi",
      meaningLanguage: "en",
      sources: [],
    },
    publishers,
  );
  return {
    id: created.id,
    cards: added.flatMap((a) => (a.status === "added" ? [a.card.id] : [])),
  };
}

beforeAll(async () => {
  let bindings: TestBindings;
  ({ db, env: bindings, dispose } = await testDb());
  env = {
    ...bindings,
    PRODUCT_URL,
    PUBLIC_SITE_URL: PRODUCT_URL,
    ALLOWED_EMAILS: "",
    PUBLISHER_EMAILS: [...publishers].join(","),
    BETTER_AUTH_SECRET: "a-test-secret-that-is-long-enough-for-better-auth",
  } as unknown as Bindings;

  lymi = await learner(db, "lymi", "Lymi Publisher Account");
  const mari = await learner(db, "mari", "Mari");
  anna = await learner(db, "anna", "Anna");
  const ben = await learner(db, "ben", "Ben");
  key.write = (await mintKey(lymi, "Growth agent", "write")).key;
  const read = await mintKey(lymi, "Read-only agent", "read");
  key.read = read.key;
  readKeyId = read.id;
  key.otherPublisher = (await mintKey(mari, "Mari's key", "write")).key;
  key.learner = (await mintKey(anna, "Anna's key", "write")).key;

  const live = await publishedDeck(lymi, "everyday-estonian");
  deck.live = live.id;
  deck.gone = (await publishedDeck(lymi, "old-estonian")).id;
  await withdrawDeck(lymi, deck.gone);
  await archiveDeck(lymi, deck.gone);
  deck.private = (await createDeck(lymi, { name: "Never published" })).id;
  deck.maris = (await publishedDeck(mari, "maris-deck")).id;

  // Anna adds the deck, reviews yesterday and today, and takes one of today's back.
  await addPublishedDeck(anna, "everyday-estonian");
  const [first, second] = live.cards as [string, string];
  await gradeCard(anna, {
    cardId: first,
    mode: TERM,
    rating: 3,
    reviewedAt: new Date(Date.now() - DAY),
  });
  await gradeCard(anna, { cardId: first, mode: TERM, rating: 3 });
  const undone = await gradeCard(anna, { cardId: second, mode: TERM, rating: 1 });
  if (!undone.reviewId) throw new Error("the grade did not land");
  await undoReview(anna, undone.reviewId);
  // Ben adds it, leaves, and adds it again without reviewing.
  await addPublishedDeck(ben, "everyday-estonian");
  await leave(ben, deck.live);
  await addPublishedDeck(ben, "everyday-estonian");
  // The owner's own review is never the deck's use.
  await gradeCard(lymi, { cardId: second, mode: TERM, rating: 4 });

  await countDeckPageView(db, "everyday-estonian", "en");
  await countDeckPageView(db, "everyday-estonian", "uk");
  await countDeckPageView(db, "old-estonian", "en");
}, 60_000);

afterAll(async () => {
  await dispose();
});

describe("comparing published decks", () => {
  it("lists every deck the owner published, withdrawn and archived included, for a read-only key", async () => {
    const res = await get("/api/reports/decks?period=7d", key.read);
    expect(res.status).toBe(200);
    const body = (await res.json()) as DeckReportsOut;
    expect(body.decks.map((d) => d.deck.id).sort()).toEqual([deck.live, deck.gone].sort());
    const gone = body.decks.find((d) => d.deck.id === deck.gone);
    expect(gone?.publication.status).toBe("withdrawn");
    expect(gone?.deck.archived).toBe(true);
    expect(body.period.days).toBe(7);
    expect(body.previousPeriod.to < body.period.from).toBe(true);
    expect(body.incomplete).toBe(true);
  });

  it("counts adds, activation, use and page views", async () => {
    const body = (await (
      await get("/api/reports/decks?period=7d", key.write)
    ).json()) as DeckReportsOut;
    const live = body.decks.find((d) => d.deck.id === deck.live);
    expect(live?.members).toBe(2);
    expect(live?.current.adds).toEqual({
      events: 3,
      learners: 2,
      newLearners: 2,
      rejoins: 1,
      viaPublication: 3,
      viaLink: 0,
      viaUnknown: 0,
    });
    // Anna reviewed after adding; Ben has not, and his seven days are still running.
    expect(live?.current.activation).toMatchObject({
      cohort: 2,
      activated: 1,
      pending: 1,
      rate: 1,
    });
    expect(live?.current.use).toEqual({
      reviewers: 1,
      reviews: 2,
      returning: 1,
      importedReviews: 0,
    });
    expect(live?.current.discovery).toEqual({ pageViews: 2, pageViewsCoverage: "partial" });
    expect(live?.previous.adds.events).toBe(0);
    expect(live?.previous.discovery).toEqual({ pageViews: null, pageViewsCoverage: "none" });
    // Withdrawn and archived, so the request for its page counted nothing.
    expect(body.decks.find((d) => d.deck.id === deck.gone)?.current.discovery.pageViews).toBe(0);
  });

  it("names no learner", async () => {
    const text = await (await get("/api/reports/decks", key.read)).text();
    for (const secret of [anna.userId, "anna@lymi.test", "Anna"]) {
      expect(text).not.toContain(secret);
    }
  });

  it("shows another account nothing", async () => {
    for (const apiKey of [key.otherPublisher, key.learner]) {
      const body = (await (await get("/api/reports/decks", apiKey)).json()) as DeckReportsOut;
      expect(body.decks.map((d) => d.deck.id)).not.toContain(deck.live);
    }
  });
});

describe("one deck's report", () => {
  it("adds a row for every day of the period", async () => {
    const res = await get(`/api/reports/decks/${deck.live}?period=7d`, key.read);
    expect(res.status).toBe(200);
    const body = (await res.json()) as DeckReportOut;
    expect(body.days).toHaveLength(7);
    const today = body.days.at(-1);
    expect(today).toMatchObject({ adds: 3, reviewers: 1, reviews: 1, pageViews: 2 });
    expect(body.days.at(-2)).toMatchObject({ reviewers: 1, reviews: 1, pageViews: null });
  });

  it("keeps the previous period's dates beside its figures", async () => {
    const body = (await (
      await get(`/api/reports/decks/${deck.live}?from=2026-09-08&to=2026-09-14`, key.read)
    ).json()) as DeckReportOut;
    expect(body.previousPeriod).toEqual({ from: "2026-09-01", to: "2026-09-07", days: 7 });
    expect(body.previous.adds.events).toBe(0);
  });

  it("is not found for a deck never published, another owner's deck, or a missing one", async () => {
    for (const id of [deck.private, deck.maris, "missing"]) {
      expect((await get(`/api/reports/decks/${id}`, key.write)).status).toBe(404);
    }
    expect((await get(`/api/reports/decks/${deck.live}`, key.otherPublisher)).status).toBe(404);
  });

  it("takes a custom period and refuses one that cannot be reported", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const ok = await get(`/api/reports/decks/${deck.live}?from=${today}&to=${today}`, key.read);
    expect(ok.status).toBe(200);
    expect(((await ok.json()) as DeckReportOut).current.adds.events).toBe(3);
    for (const query of [
      `from=${today}`,
      "from=2026-01-02&to=2026-01-01",
      "from=2020-01-01&to=2021-06-01",
      "from=2999-01-01&to=2999-01-02",
      `period=7d&from=${today}&to=${today}`,
    ]) {
      expect((await get(`/api/reports/decks?${query}`, key.read)).status, query).toBe(400);
    }
  });

  it("stops answering once the key is revoked", async () => {
    await db.delete(schema.apikey).where(eq(schema.apikey.id, readKeyId));
    expect((await get("/api/reports/decks", key.read)).status).toBe(401);
  });
});

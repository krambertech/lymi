import { and, eq } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { TextProvider } from "../ai";
import { type Db, schema } from "../db";
import { type ReadwiseApi, ReadwiseRefused } from "../readwise/api";
import { createFakeReadwiseApi, DEV_READWISE_TOKEN } from "../readwise/dev-fake";
import type { AnalyticsEvent } from "./analytics";
import type { ServiceContext } from "./context";
import { createDeck } from "./decks";
import {
  connectReadwise,
  disconnectReadwise,
  getReadwise,
  pullDueReadwise,
  pullReadwiseNow,
  type ReadwiseDeps,
  updateReadwise,
} from "./readwise";
import { learner, testDb } from "./test-db";

let db: Db;
let dispose: () => Promise<void>;
const captured: AnalyticsEvent[] = [];

// The fake's books are Italian, Estonian and English; the model names them by key.
const LANGUAGES: Record<string, string> = { "9001": "it", "9002": "et", "9003": "en" };
const languages: TextProvider = {
  provider: "openai",
  model: "test",
  complete: async (request) => {
    const { decks } = JSON.parse(request.input as string) as { decks: { key: string }[] };
    return { decks: decks.map((d) => ({ key: d.key, language: LANGUAGES[d.key] ?? null })) };
  },
};

function depsWith(api: ReadwiseApi = createFakeReadwiseApi()): ReadwiseDeps {
  return { api, secret: "test-secret-of-sufficient-length", languages, enrichment: null };
}

async function reader(id: string): Promise<ServiceContext & { deckId: string }> {
  const ctx: ServiceContext = {
    ...(await learner(db, id, id)),
    analytics: { writeDataPoint: vi.fn(), capture: (event) => captured.push(event) },
  };
  const deck = await createDeck(ctx, { name: "Italiano", defaultLanguage: "it" });
  return { ...ctx, deckId: deck.id };
}

const cardsOf = (userId: string) =>
  db.select().from(schema.cards).where(eq(schema.cards.userId, userId)).orderBy(schema.cards.term);

beforeAll(async () => {
  ({ db, dispose } = await testDb());
}, 60_000);

afterAll(async () => {
  await dispose();
});

describe("connecting Readwise", () => {
  it("refuses a token Readwise turns down", async () => {
    const ctx = await reader("rw-refused");
    await expect(connectReadwise(ctx, depsWith(), "not-a-token")).rejects.toMatchObject({
      code: "invalid",
      reason: "readwise_refused",
    });
    expect(await getReadwise(ctx)).toBeNull();
  });

  it("follows the books in a language the learner's decks teach, and keeps the token sealed", async () => {
    const ctx = await reader("rw-connect");
    const view = await connectReadwise(ctx, depsWith(), DEV_READWISE_TOKEN);
    expect(view.tokenHint).toBe("0000");
    expect(view.languages).toEqual([{ language: "it", deckId: ctx.deckId }]);
    expect(view.books.map((b) => [b.id, b.language, b.followed])).toEqual(
      expect.arrayContaining([
        ["9001", "it", true],
        ["9002", "et", false],
        ["9003", "en", false],
      ]),
    );
    const [row] = await db
      .select()
      .from(schema.readwiseConnections)
      .where(eq(schema.readwiseConnections.userId, ctx.userId));
    expect(row?.tokenCipher).not.toContain(DEV_READWISE_TOKEN);
    expect(JSON.stringify(view)).not.toContain(DEV_READWISE_TOKEN);
    expect(captured).toContainEqual({
      name: "readwise_connected",
      books: 3,
      followed: 1,
      languages: 1,
      reconnected: false,
    });
  });
});

describe("a pull", () => {
  it("adds a card per word or named term, skips passages, and never adds one twice", async () => {
    const ctx = await reader("rw-pull");
    await connectReadwise(ctx, depsWith(), DEV_READWISE_TOKEN);
    const view = await pullReadwiseNow(ctx, depsWith());
    expect(view.lastPull).toMatchObject({ highlights: 4, cards: 3, skipped: 1 });

    const cards = await cardsOf(ctx.userId);
    expect(cards.map((c) => [c.term, c.example, c.exampleSource, c.createdBy])).toEqual([
      ["di sfuggita", null, null, "system"],
      ["sbadigliare", null, null, "system"],
      ["vetri", "La pioggia batteva sui vetri della cucina.", "lesson", "system"],
    ]);
    expect(cards.every((c) => c.source === "Una stagione a Torino · Marta Ferri")).toBe(true);
    expect(
      cards.every((c) => c.deckId === ctx.deckId && c.externalId?.startsWith("readwise:")),
    ).toBe(true);

    const audit = await db
      .select()
      .from(schema.auditLog)
      .where(and(eq(schema.auditLog.userId, ctx.userId), eq(schema.auditLog.entity, "card")));
    expect(audit.map((a) => [a.actor, a.actorClient, a.actorClientName])).toEqual(
      Array(3).fill(["system", "readwise", "Readwise"]),
    );
    expect(captured).toContainEqual({ name: "cards_added", count: 3, source: "readwise" });
    expect(captured).toContainEqual({
      name: "readwise_pulled",
      trigger: "manual",
      outcome: "done",
      highlights: 4,
      cards: 3,
      skipped: 1,
      duplicates: 0,
    });

    // The fake reports every highlight as just updated, as an edit in Readwise would.
    await db
      .update(schema.readwiseConnections)
      .set({ lastPullAt: new Date(0) })
      .where(eq(schema.readwiseConnections.userId, ctx.userId));
    await pullReadwiseNow(ctx, depsWith());
    expect(await cardsOf(ctx.userId)).toHaveLength(3);
  });

  it("adds a book once the learner follows it, into the deck chosen for its language", async () => {
    const ctx = await reader("rw-follow");
    const estonian = await createDeck(ctx, { name: "Eesti", defaultLanguage: "et" });
    await connectReadwise(ctx, depsWith(), DEV_READWISE_TOKEN);
    await updateReadwise(ctx, {
      books: [
        { id: "9001", followed: false },
        { id: "9002", followed: true },
      ],
      decks: { et: estonian.id },
    });
    await pullReadwiseNow(ctx, depsWith());
    const cards = await cardsOf(ctx.userId);
    expect(cards.map((c) => [c.term, c.deckId])).toEqual([["aknaklaas", estonian.id]]);
  });

  it("refuses a deck the learner does not own in that language", async () => {
    const ctx = await reader("rw-wrong-deck");
    await connectReadwise(ctx, depsWith(), DEV_READWISE_TOKEN);
    await expect(updateReadwise(ctx, { decks: { it: "someone-elses" } })).rejects.toMatchObject({
      code: "invalid",
    });
  });

  it("stops when Readwise refuses the token, until a new one is pasted", async () => {
    const ctx = await reader("rw-revoked");
    await connectReadwise(ctx, depsWith(), DEV_READWISE_TOKEN);
    const fake = createFakeReadwiseApi();
    const revoked: ReadwiseApi = {
      ...fake,
      exportPage: async () => {
        throw new ReadwiseRefused();
      },
    };
    const view = await pullReadwiseNow(ctx, depsWith(revoked));
    expect(view.status).toBe("refused");
    expect(await cardsOf(ctx.userId)).toHaveLength(0);

    const again = await connectReadwise(ctx, depsWith(), DEV_READWISE_TOKEN);
    expect(again.status).toBe("active");
    expect(captured).toContainEqual(
      expect.objectContaining({ name: "readwise_connected", reconnected: true }),
    );
  });
});

describe("a book whose language was unknown", () => {
  it("is read again on the next pull and followed once it is in a language the learner studies", async () => {
    const ctx = await reader("rw-unknown");
    await connectReadwise(ctx, { ...depsWith(), languages: null }, DEV_READWISE_TOKEN);
    expect((await getReadwise(ctx))?.books.every((b) => b.language === null)).toBe(true);

    await pullReadwiseNow(ctx, depsWith());
    const view = await getReadwise(ctx);
    expect(view?.books.find((b) => b.id === "9001")).toMatchObject({
      language: "it",
      followed: true,
    });
    expect(await cardsOf(ctx.userId)).toHaveLength(3);
  });
});

describe("the hourly pull", () => {
  it("pulls only connections that are due, once each", async () => {
    const due = await reader("rw-due");
    const later = await reader("rw-later");
    await connectReadwise(due, depsWith(), DEV_READWISE_TOKEN);
    await connectReadwise(later, depsWith(), DEV_READWISE_TOKEN);
    const at = new Date(Date.now() + 2 * 60 * 60 * 1000);
    await db
      .update(schema.readwiseConnections)
      .set({ nextPullAt: new Date(Date.now() + 3 * 60 * 60 * 1000) })
      .where(eq(schema.readwiseConnections.userId, later.userId));

    const result = await pullDueReadwise(
      db,
      () => ({ deps: depsWith(), analytics: undefined }),
      at,
    );
    expect(result.failed).toBe(0);
    expect(await cardsOf(due.userId)).toHaveLength(3);
    expect(await cardsOf(later.userId)).toHaveLength(0);
  });
});

describe("disconnecting", () => {
  it("forgets the token and the books, and leaves the cards", async () => {
    const ctx = await reader("rw-disconnect");
    await connectReadwise(ctx, depsWith(), DEV_READWISE_TOKEN);
    await pullReadwiseNow(ctx, depsWith());
    await disconnectReadwise(ctx);
    expect(await getReadwise(ctx)).toBeNull();
    const books = await db
      .select()
      .from(schema.readwiseBooks)
      .where(eq(schema.readwiseBooks.userId, ctx.userId));
    expect(books).toHaveLength(0);
    expect(await cardsOf(ctx.userId)).toHaveLength(3);
    expect(captured).toContainEqual({ name: "readwise_disconnected" });
  });
});

import { and, eq } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { TextProvider } from "../ai";
import { type Db, schema } from "../db";
import { type ReadwiseApi, ReadwiseRefused, ReadwiseUnavailable } from "../readwise/api";
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

  it("answers unavailable when Readwise is down, and saves nothing", async () => {
    const ctx = await reader("rw-down");
    const down: ReadwiseApi = {
      ...createFakeReadwiseApi(),
      accepts: async () => {
        throw new ReadwiseUnavailable(502);
      },
    };
    await expect(connectReadwise(ctx, depsWith(down), DEV_READWISE_TOKEN)).rejects.toMatchObject({
      code: "unavailable",
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

type Timed = { book: string; id: string; text: string; at: Date };

/** A Readwise that honours `updatedAfter`, `ids` and a page per highlight, as the real one pages. */
function timedApi(
  highlights: Timed[],
  options: { counts?: Record<string, number> } = {},
): ReadwiseApi {
  const fake = createFakeReadwiseApi();
  return {
    ...fake,
    books: async () =>
      (await fake.books(DEV_READWISE_TOKEN)).map((b) => ({
        ...b,
        num_highlights: options.counts?.[b.id] ?? b.num_highlights,
      })),
    exportPage: async (_token, { updatedAfter, cursor, bookIds }) => {
      const due = highlights.filter(
        (h) => h.at > updatedAfter && (!bookIds?.length || bookIds.includes(h.book)),
      );
      const index = Number(cursor ?? 0);
      const one = due[index];
      return {
        books: one
          ? [
              {
                user_book_id: one.book,
                title: one.book === "9001" ? "Una stagione a Torino" : "Sügisene linn",
                readable_title: null,
                author: null,
                is_deleted: false,
                highlights: [{ id: one.id, text: one.text, updated_at: one.at.toISOString() }],
              },
            ]
          : [],
        cursor: index + 1 < due.length ? String(index + 1) : null,
      };
    },
  };
}

const later = (ms: number) => new Date(Date.now() + ms);

async function holdPullAt(userId: string, at: Date) {
  await db
    .update(schema.readwiseConnections)
    .set({ pulledThrough: at, lastPullAt: new Date(0) })
    .where(eq(schema.readwiseConnections.userId, userId));
}

describe("highlights waiting for their book's language", () => {
  it("come in once a new highlight lets Lymi place the book", async () => {
    const ctx = await reader("rw-wait-detect");
    const unknown = { ...depsWith(), languages: null };
    await connectReadwise(ctx, unknown, DEV_READWISE_TOKEN);
    const highlights: Timed[] = [{ book: "9001", id: "a", text: "sbadigliare", at: later(1_000) }];
    await pullReadwiseNow(ctx, { ...unknown, api: timedApi(highlights) });
    expect(await cardsOf(ctx.userId)).toHaveLength(0);

    // The first highlight is now behind the pull point; only a new one shows the book again.
    await holdPullAt(ctx.userId, later(10_000));
    highlights.push({ book: "9001", id: "b", text: "di sfuggita", at: later(20_000) });
    await pullReadwiseNow(ctx, depsWith(timedApi(highlights)));
    expect((await cardsOf(ctx.userId)).map((c) => c.term)).toEqual(["di sfuggita", "sbadigliare"]);
  });

  it("come in at once when the learner sets the book's language", async () => {
    const ctx = await reader("rw-wait-set");
    const highlights: Timed[] = [{ book: "9001", id: "c", text: "sbadigliare", at: later(1_000) }];
    const unknown = { ...depsWith(timedApi(highlights)), languages: null };
    await connectReadwise(ctx, unknown, DEV_READWISE_TOKEN);
    await pullReadwiseNow(ctx, unknown);
    await holdPullAt(ctx.userId, later(10_000));

    const { view, followed } = await updateReadwise(ctx, {
      books: [{ id: "9001", language: "it" }],
    });
    expect(followed).toBe(true);
    expect(view.books.find((b) => b.id === "9001")).toMatchObject({
      language: "it",
      followed: true,
    });
    await pullReadwiseNow(ctx, unknown, { followed: true });
    expect((await cardsOf(ctx.userId)).map((c) => c.term)).toEqual(["sbadigliare"]);
    await expect(
      updateReadwise(ctx, { books: [{ id: "9002", language: "et" }] }),
    ).rejects.toMatchObject({ code: "invalid" });
  });
});

describe("pulls that would overlap", () => {
  it("run one at a time, so the same highlight never becomes two cards", async () => {
    const ctx = await reader("rw-overlap");
    await connectReadwise(ctx, depsWith(), DEV_READWISE_TOKEN);
    await Promise.all([
      pullReadwiseNow(ctx, depsWith(), { followed: true }),
      pullReadwiseNow(ctx, depsWith(), { followed: true }),
      pullReadwiseNow(ctx, depsWith(), { followed: true }),
    ]);
    expect(await cardsOf(ctx.userId)).toHaveLength(3);
    const [row] = await db
      .select()
      .from(schema.readwiseConnections)
      .where(eq(schema.readwiseConnections.userId, ctx.userId));
    expect(row?.pullingUntil).toBeNull();
  });
});

describe("a book turned off and on again", () => {
  it("brings only highlights made after it was turned back on", async () => {
    const ctx = await reader("rw-refollow");
    const highlights: Timed[] = [{ book: "9001", id: "r1", text: "sbadigliare", at: later(1_000) }];
    const deps = depsWith(timedApi(highlights));
    await connectReadwise(ctx, deps, DEV_READWISE_TOKEN);
    const { followed: off } = await updateReadwise(ctx, {
      books: [{ id: "9001", followed: false }],
    });
    expect(off).toBe(false);
    await pullReadwiseNow(ctx, deps);
    await holdPullAt(ctx.userId, later(10_000));

    const { followed } = await updateReadwise(ctx, { books: [{ id: "9001", followed: true }] });
    expect(followed).toBe(false);
    await pullReadwiseNow(ctx, deps);
    expect(await cardsOf(ctx.userId)).toHaveLength(0);
  });
});

describe("a book whose deck is gone", () => {
  it("waits, and catches up once the learner chooses another deck", async () => {
    const ctx = await reader("rw-no-deck");
    const highlights: Timed[] = [{ book: "9001", id: "d1", text: "sbadigliare", at: later(1_000) }];
    const unknown = { ...depsWith(timedApi(highlights)), languages: null };
    await connectReadwise(ctx, unknown, DEV_READWISE_TOKEN);
    const replacement = await createDeck(ctx, { name: "Italiano 2", defaultLanguage: "it" });
    // The deck Readwise was given for Italian is archived; another Italian deck remains.
    await db
      .update(schema.decks)
      .set({ archivedAt: new Date() })
      .where(eq(schema.decks.id, ctx.deckId));

    const placed = await updateReadwise(ctx, { books: [{ id: "9001", language: "it" }] });
    expect(placed.view.books.find((b) => b.id === "9001")?.followed).toBe(false);

    await updateReadwise(ctx, { books: [{ id: "9001", followed: true }] });
    await pullReadwiseNow(ctx, unknown, { followed: true });
    expect(await cardsOf(ctx.userId)).toHaveLength(0);
    const { followed } = await updateReadwise(ctx, { decks: { it: replacement.id } });
    expect(followed).toBe(true);
    await pullReadwiseNow(ctx, unknown, { followed: true });
    expect((await cardsOf(ctx.userId)).map((c) => [c.term, c.deckId])).toEqual([
      ["sbadigliare", replacement.id],
    ]);
  });
});

describe("a pull past the page cap", () => {
  it("carries on from Readwise's cursor and then moves the pull point", async () => {
    const ctx = await reader("rw-cursor");
    await connectReadwise(ctx, depsWith(), DEV_READWISE_TOKEN);
    const highlights: Timed[] = Array.from({ length: 12 }, (_, i) => ({
      book: "9001",
      id: `p${i}`,
      text: `parola${i}`,
      at: later(1_000 + i),
    }));
    const deps = depsWith(timedApi(highlights, { counts: { "9001": 12 } }));
    await pullReadwiseNow(ctx, deps);
    const [first] = await db
      .select()
      .from(schema.readwiseConnections)
      .where(eq(schema.readwiseConnections.userId, ctx.userId));
    expect(first?.pullCursor).toBe("10");
    expect(await cardsOf(ctx.userId)).toHaveLength(10);

    await db
      .update(schema.readwiseConnections)
      .set({ lastPullAt: new Date(0) })
      .where(eq(schema.readwiseConnections.userId, ctx.userId));
    const view = await pullReadwiseNow(ctx, deps);
    const [second] = await db
      .select()
      .from(schema.readwiseConnections)
      .where(eq(schema.readwiseConnections.userId, ctx.userId));
    expect(second?.pullCursor).toBeNull();
    // The point moves to when the first pull of the run began, less the two-minute overlap.
    expect(second?.pulledThrough.getTime()).toBe((first?.pullCursorFrom?.getTime() ?? 0) - 120_000);
    expect(await cardsOf(ctx.userId)).toHaveLength(12);
    expect(view.books.find((b) => b.id === "9001")?.highlights).toBe(12);
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

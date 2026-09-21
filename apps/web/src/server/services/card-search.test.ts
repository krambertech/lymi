import { CardInput, type CardSearchInput, type CardSortField } from "@lymi/core";
import { eq } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Db, schema } from "../db";
import { type CardSearchHit, searchCards } from "./card-search";
import { addCards } from "./cards";
import type { ServiceContext } from "./context";
import { createDeck } from "./decks";
import { join } from "./members";
import { gradeCard } from "./review";
import { undoReview } from "./review-days";
import { createSection } from "./sections";
import { learner, testDb } from "./test-db";

const DAY = 86_400_000;

let db: Db;
let dispose: () => Promise<void>;

beforeAll(async () => {
  ({ db, dispose } = await testDb());
}, 60_000);

afterAll(async () => {
  await dispose();
});

async function add(ctx: ServiceContext, deckId: string, cards: (string | Partial<CardInput>)[]) {
  const outcomes = await addCards(
    ctx,
    cards.map((card) =>
      CardInput.parse(typeof card === "string" ? { deckId, term: card } : { deckId, ...card }),
    ),
  );
  return outcomes.map((outcome) => {
    if (outcome.status !== "added") throw new Error(`${outcome.term} not added`);
    return outcome.card;
  });
}

async function everyPage(ctx: ServiceContext, search: CardSearchInput) {
  const hits: CardSearchHit[] = [];
  const totals: number[] = [];
  let after: string | undefined;
  for (let page = 0; page < 30; page++) {
    const result = await searchCards(ctx, { ...search, ...(after ? { after } : {}) });
    hits.push(...result.cards);
    totals.push(result.total);
    if (!result.next) {
      return { hits, ids: hits.map((hit) => hit.card.id), totals, pages: page + 1 };
    }
    after = result.next;
  }
  throw new Error("search never reached its last page");
}

const ids = async (ctx: ServiceContext, search: CardSearchInput) =>
  new Set((await everyPage(ctx, search)).ids);

describe("card search paging", () => {
  it("returns every card exactly once across pages, even when cards share a timestamp", async () => {
    const ctx = await learner(db, "paging-1", "Kateryna");
    const deck = await createDeck(ctx, { name: "Estonian", defaultLanguage: "et" });
    const cards = await add(ctx, deck.id, [
      "üks",
      "kaks",
      "kolm",
      "neli",
      "viis",
      "kuus",
      "seitse",
    ]);

    const listed = await everyPage(ctx, { deckId: deck.id, limit: 3 });

    expect(listed.pages).toBe(3);
    expect(listed.ids).toHaveLength(cards.length);
    expect(new Set(listed.ids)).toEqual(new Set(cards.map((card) => card.id)));
    expect(listed.totals).toEqual([7, 7, 7]);
  });

  it("pages a text search the same way, counting every match", async () => {
    const ctx = await learner(db, "paging-2", "Kateryna");
    const deck = await createDeck(ctx, { name: "Estonian", defaultLanguage: "et" });
    const cards = await add(ctx, deck.id, ["maja", "majas", "majad", "kass", "koer", "majake"]);
    const houses = cards.filter((card) => card.term.startsWith("maja")).map((card) => card.id);

    const listed = await everyPage(ctx, { query: "maja", limit: 2 });

    expect(listed.ids).toHaveLength(houses.length);
    expect(new Set(listed.ids)).toEqual(new Set(houses));
    expect(listed.totals.every((total) => total === houses.length)).toBe(true);
  });

  it("filters to one section", async () => {
    const ctx = await learner(db, "paging-3", "Kateryna");
    const deck = await createDeck(ctx, { name: "Estonian", defaultLanguage: "et" });
    const [tere, head, aitah] = await add(ctx, deck.id, ["tere", "head aega", "aitäh"]);
    if (!tere || !head || !aitah) throw new Error("not added");
    const greetings = await createSection(ctx, deck.id, {
      name: "Greetings",
      cardIds: [tere.id, head.id],
    });

    const found = await searchCards(ctx, { sectionId: greetings.id });

    expect(new Set(found.cards.map((row) => row.card.id))).toEqual(new Set([tere.id, head.id]));
    expect(found.total).toBe(2);
    expect(found.next).toBeNull();
    expect(
      await ids(ctx, { filter: { deckId: { eq: deck.id }, sectionId: { null: true } } }),
    ).toEqual(new Set([aitah.id]));
  });

  it("finds a card by its exact term when newer cards containing it fill the page", async () => {
    const ctx = await learner(db, "paging-4", "Kateryna");
    const deck = await createDeck(ctx, { name: "Estonian", defaultLanguage: "et" });
    const [ema] = await add(ctx, deck.id, ["ema"]);
    if (!ema) throw new Error("not added");
    await db
      .update(schema.cards)
      .set({ createdAt: new Date(Date.now() - DAY) })
      .where(eq(schema.cards.id, ema.id));
    await add(ctx, deck.id, ["tema", "emakeel", "emand", "hema", "kemaline"]);

    const bySubstring = await searchCards(ctx, { query: "ema", limit: 3 });
    expect(bySubstring.cards.map((row) => row.card.id)).not.toContain(ema.id);
    expect(bySubstring.total).toBe(6);

    const byTerm = await searchCards(ctx, { term: "  EMA ", limit: 3 });
    expect(byTerm.cards.map((row) => row.card.id)).toEqual([ema.id]);
    expect(byTerm.total).toBe(1);
    expect(byTerm.next).toBeNull();
  });

  it("refuses a cursor it did not hand out", async () => {
    const ctx = await learner(db, "paging-5", "Kateryna");
    await expect(searchCards(ctx, { after: "page-2" })).rejects.toMatchObject({
      code: "invalid",
    });
  });
});

describe("filters on card fields", () => {
  let ctx: ServiceContext;
  let deckId: string;
  let other: string;
  const card: Record<string, string> = {};

  beforeAll(async () => {
    ctx = await learner(db, "fields", "Kateryna");
    deckId = (await createDeck(ctx, { name: "Ukrainian", defaultLanguage: "uk" })).id;
    other = (await createDeck(ctx, { name: "Estonian", defaultLanguage: "et" })).id;
    const added = await add(ctx, deckId, [
      { term: "мати", meaning: "Мама", example: "Моя мати вдома.", tags: ["Family", "core"] },
      { term: "батько", meaning: "father", example: "Батько читає.", tags: ["family"] },
      { term: "сестра", meaning: "sister", tags: [] },
      { term: "брат", pronunciation: "brat", source: "Lesson 3" },
    ]);
    const [estonian] = await add(ctx, other, [{ term: "õde", meaning: "sister", language: "et" }]);
    for (const [index, name] of ["mother", "father", "sister", "brother"].entries()) {
      card[name] = added[index]?.id ?? "";
    }
    card.ode = estonian?.id ?? "";
    await db
      .update(schema.cards)
      .set({ exampleSource: "ai", createdAt: new Date(Date.now() - 3 * DAY) })
      .where(eq(schema.cards.id, card.father ?? ""));
    await db
      .update(schema.cards)
      .set({ meaningSource: "lesson" })
      .where(eq(schema.cards.id, card.mother ?? ""));
  });

  const find = (filter: CardSearchInput["filter"], extra: Partial<CardSearchInput> = {}) =>
    ids(ctx, { filter, limit: 2, ...extra });
  const named = (...names: string[]) => new Set(names.map((name) => card[name]));

  it("compares ids with eq, neq, in, nin and null", async () => {
    expect(await find({ deckId: { eq: other } })).toEqual(named("ode"));
    expect(await find({ deckId: { neq: other } })).toEqual(
      named("mother", "father", "sister", "brother"),
    );
    expect(await find({ deckId: { in: [other, "missing"] } })).toEqual(named("ode"));
    expect(await find({ deckId: { nin: [deckId] } })).toEqual(named("ode"));
    expect(await find({ language: { eq: "et" } })).toEqual(named("ode"));
    expect(await find({ sectionId: { null: false } })).toEqual(new Set());
  });

  it("compares the term in SQL by its folded key", async () => {
    expect(await find({ term: { eq: "МАТИ" } })).toEqual(named("mother"));
    expect(await find({ term: { startsWith: "Бр" } })).toEqual(named("brother"));
    expect(await find({ term: { endsWith: "ТРА" } })).toEqual(named("sister"));
    expect(await find({ term: { contains: "ать" } })).toEqual(named("father"));
    expect(await find({ term: { in: ["брат", "Õde"] } })).toEqual(named("brother", "ode"));
    expect(await find({ deckId: { eq: deckId }, term: { notContains: "а" } })).toEqual(new Set());
    expect(await find({ deckId: { eq: deckId }, term: { nin: ["мати", "батько"] } })).toEqual(
      named("sister", "brother"),
    );
  });

  it("folds Cyrillic text fields in memory, pages them and counts them exactly", async () => {
    expect(await find({ meaning: { eq: "мама" } })).toEqual(named("mother"));
    expect(await find({ example: { contains: "БАТЬКО" } })).toEqual(named("father"));
    expect(await find({ meaning: { in: ["SISTER"] } })).toEqual(named("sister", "ode"));
    expect(await find({ pronunciation: { eq: "Brat" }, source: { startsWith: "lesson" } })).toEqual(
      named("brother"),
    );
    const sisters = await everyPage(ctx, { filter: { meaning: { eq: "sister" } }, limit: 1 });
    expect(sisters.ids).toHaveLength(2);
    expect(sisters.totals).toEqual([2, 2]);
  });

  it("treats null on text as empty", async () => {
    expect(await find({ deckId: { eq: deckId }, meaning: { null: true } })).toEqual(
      named("brother"),
    );
    expect(await find({ deckId: { eq: deckId }, example: { null: false } })).toEqual(
      named("mother", "father"),
    );
  });

  it("matches tags with some and every", async () => {
    expect(await find({ tags: { some: { eq: "family" } } })).toEqual(named("mother", "father"));
    expect(await find({ deckId: { eq: deckId }, tags: { every: { eq: "family" } } })).toEqual(
      named("father", "sister", "brother"),
    );
  });

  it("compares field sources, with null for none", async () => {
    expect(await find({ exampleSource: { eq: "ai" } })).toEqual(named("father"));
    expect(await find({ meaningSource: { in: ["lesson", "ai"] } })).toEqual(named("mother"));
    expect(await find({ deckId: { eq: deckId }, pronunciationSource: { null: true } })).toEqual(
      named("mother", "father", "sister"),
    );
    expect(await find({ enrichmentStatus: { null: false } })).toEqual(new Set());
  });

  it("compares dates, absolute or relative to now", async () => {
    expect(await find({ createdAt: { lt: "-P1D" } })).toEqual(named("father"));
    expect(await find({ deckId: { eq: deckId }, createdAt: { gte: "-PT12H" } })).toEqual(
      named("mother", "sister", "brother"),
    );
    const cutoff = new Date(Date.now() - 2 * DAY).toISOString();
    expect(await find({ createdAt: { lte: cutoff } })).toEqual(named("father"));
    expect(await find({ updatedAt: { gt: "P1D" } })).toEqual(new Set());
  });
});

describe("review history", () => {
  let owner: ServiceContext;
  let member: ServiceContext;
  let deckId: string;
  const card: Record<"ema" | "isa" | "vend" | "ode" | "laps", string> = {
    ema: "",
    isa: "",
    vend: "",
    ode: "",
    laps: "",
  };

  beforeAll(async () => {
    owner = await learner(db, "reviews-owner", "Kateryna");
    member = await learner(db, "reviews-member", "Anna");
    deckId = (await createDeck(owner, { name: "Pere", defaultLanguage: "et", directions: "both" }))
      .id;
    const added = await add(owner, deckId, ["ema", "isa", "vend", "õde", "laps"]);
    for (const [index, name] of (["ema", "isa", "vend", "ode", "laps"] as const).entries()) {
      card[name] = added[index]?.id ?? "";
    }
    await join(member, deckId);

    const recognition = "recognition" as const;
    const production = "production" as const;
    // In time order, so each state takes its grades oldest first.
    const grades: [keyof typeof card, "recognition" | "production", 1 | 2 | 3 | 4, number][] = [
      ["ema", recognition, 1, 40],
      ["ema", recognition, 3, 38],
      ["ema", recognition, 1, 10],
      ["ema", production, 1, 9],
      ["isa", recognition, 3, 8],
      ["ode", recognition, 3, 7],
      ["vend", recognition, 1, 6],
      ["ode", recognition, 1, 6],
      ["ema", recognition, 3, 5],
      ["ema", production, 1, 4],
      ["isa", recognition, 4, 3.5],
      ["ode", recognition, 3, 2.5],
    ];
    for (const [name, direction, rating, daysAgo] of grades) {
      await gradeCard(owner, {
        cardId: card[name],
        direction,
        rating,
        reviewedAt: new Date(Date.now() - daysAgo * DAY),
      });
    }
    const mistake = await gradeCard(owner, {
      cardId: card.isa,
      direction: recognition,
      rating: 1,
      reviewedAt: new Date(Date.now() - 2 * DAY),
    });
    if (!mistake.reviewId) throw new Error("no review");
    await undoReview(owner, mistake.reviewId);

    // Another member's grades never count toward the owner's record.
    for (const name of ["ema", "laps"] as const) {
      for (const daysAgo of [3, 2, 1]) {
        await gradeCard(member, {
          cardId: card[name],
          direction: recognition,
          rating: 1,
          reviewedAt: new Date(Date.now() - daysAgo * DAY),
        });
      }
    }
  }, 60_000);

  const find = (filter: CardSearchInput["filter"]) =>
    ids(owner, { filter: { deckId: { eq: deckId }, ...filter }, limit: 2 });
  const named = (...names: (keyof typeof card)[]) => new Set(names.map((name) => card[name]));
  const statsOf = async (name: keyof typeof card, reviews?: { since?: string; mode?: string }) => {
    const found = await searchCards(owner, {
      filter: { term: { eq: name === "ode" ? "õde" : name }, ...(reviews ? { reviews } : {}) },
      stats: true,
    } as CardSearchInput);
    return found.cards[0]?.stats;
  };

  it("gives each card's record overall and per review mode, from the learner's accepted grades", async () => {
    const ema = await statsOf("ema");
    expect(ema).toMatchObject({ reviewCount: 6, lapses: 4, lastRating: 1, slipping: true });
    expect(ema?.dueAt).toBeInstanceOf(Date);
    expect(ema?.lastReviewedAt?.getTime()).toBeCloseTo(Date.now() - 4 * DAY, -5);
    expect(ema?.modes).toMatchObject([
      { mode: { cue: "term", target: "meaning" }, reviewCount: 4, lapses: 2, lastRating: 3 },
      { mode: { cue: "meaning", target: "term" }, reviewCount: 2, lapses: 2, lastRating: 1 },
    ]);

    // The undone Forgot is not the last grade, and the member's grades are not the owner's.
    expect(await statsOf("isa")).toMatchObject({ reviewCount: 2, lapses: 0, lastRating: 4 });
    expect(await statsOf("laps")).toMatchObject({ reviewCount: 0, lapses: 0, lastRating: null });
  });

  it("counts only reviews since a moment, and only one mode when asked", async () => {
    expect(await statsOf("ema", { since: "-P30D" })).toMatchObject({
      reviewCount: 4,
      lapses: 3,
      slipping: false,
    });
    expect(await statsOf("ema", { since: "-P30D", mode: "meaning_to_term" })).toMatchObject({
      reviewCount: 2,
      lapses: 2,
      lastRating: 1,
    });
  });

  it("filters on counts, rate, last grade, when, slipping and mode", async () => {
    expect(await find({ reviews: { lapses: { gte: 2 } } })).toEqual(named("ema"));
    expect(await find({ reviews: { since: "-P30D", lapses: { gte: 3 } } })).toEqual(named("ema"));
    expect(await find({ reviews: { since: "-P9D", lapses: { gte: 2 } } })).toEqual(new Set());
    expect(await find({ reviews: { lapseRate: { gte: 0.5 } } })).toEqual(named("ema", "vend"));
    expect(await find({ reviews: { lastRating: { in: [1] } } })).toEqual(named("ema", "vend"));
    expect(await find({ reviews: { lastRating: { eq: 4 } } })).toEqual(named("isa"));
    expect(await find({ reviews: { count: { eq: 0 } } })).toEqual(named("laps"));
    expect(await find({ reviews: { count: { gte: 1 } } })).toEqual(
      named("ema", "isa", "vend", "ode"),
    );
    expect(await find({ reviews: { lastReviewedAt: { gte: "-P3D" } } })).toEqual(named("ode"));
    expect(await find({ reviews: { lastReviewedAt: { null: true } } })).toEqual(named("laps"));
    expect(await find({ reviews: { slipping: { eq: true } } })).toEqual(named("ema"));
    expect(await find({ reviews: { mode: "meaning_to_term", count: { gte: 1 } } })).toEqual(
      named("ema"),
    );
    expect(await find({ dueAt: { null: false } })).toEqual(
      named("ema", "isa", "vend", "ode", "laps"),
    );
  });

  const sortValue = (hit: CardSearchHit, field: CardSortField): number | string | null => {
    const stats = hit.stats;
    if (!stats) throw new Error("no stats");
    switch (field) {
      case "createdAt":
        return hit.card.createdAt.getTime();
      case "archivedAt":
        return hit.card.archivedAt?.getTime() ?? null;
      case "term":
        return hit.card.normalizedTerm;
      case "lapses":
        return stats.lapses;
      case "lapseRate":
        return stats.reviewCount > 0 ? stats.lapses / stats.reviewCount : null;
      case "lastReviewedAt":
        return stats.lastReviewedAt?.getTime() ?? null;
      case "dueAt":
        return stats.dueAt?.getTime() ?? null;
    }
  };

  const fields = ["createdAt", "term", "lapses", "lapseRate", "lastReviewedAt", "dueAt"] as const;
  for (const field of fields) {
    for (const direction of ["asc", "desc"] as const) {
      it(`sorts by ${field} ${direction} across pages, every card once`, async () => {
        const listed = await everyPage(owner, {
          filter: { deckId: { eq: deckId } },
          sort: [{ field, direction }],
          stats: true,
          limit: 2,
        });
        expect(listed.ids).toHaveLength(5);
        expect(new Set(listed.ids)).toEqual(named("ema", "isa", "vend", "ode", "laps"));
        const values = listed.hits.map((hit) => sortValue(hit, field));
        const present = values.filter((value) => value !== null);
        // Cards with no value come last, whichever the direction.
        expect(values.slice(0, present.length)).toEqual(present);
        const ordered = [...present].sort((a, b) =>
          a < b ? (direction === "asc" ? -1 : 1) : a > b ? (direction === "asc" ? 1 : -1) : 0,
        );
        expect(present).toEqual(ordered);
      });
    }
  }

  it("pages a filtered sort on two keys, every match once", async () => {
    const listed = await everyPage(owner, {
      filter: { deckId: { eq: deckId }, reviews: { count: { gte: 1 } } },
      sort: [
        { field: "lapses", direction: "desc" },
        { field: "term", direction: "asc" },
      ],
      limit: 1,
    });
    expect(listed.ids).toEqual([card.ema, card.vend, card.ode, card.isa]);
    expect(listed.totals).toEqual([4, 4, 4, 4]);
  });

  it("refuses a cursor from a different sort", async () => {
    const first = await searchCards(owner, {
      filter: { deckId: { eq: deckId } },
      sort: [{ field: "lapses", direction: "desc" }],
      limit: 1,
    });
    if (!first.next) throw new Error("no next page");
    await expect(
      searchCards(owner, {
        filter: { deckId: { eq: deckId } },
        sort: [{ field: "dueAt", direction: "asc" }],
        after: first.next,
      }),
    ).rejects.toMatchObject({
      code: "invalid",
      message: expect.stringContaining("different sort"),
    });
  });
});

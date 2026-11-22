import { sql } from "drizzle-orm";
import { SQLiteAsyncDialect } from "drizzle-orm/sqlite-core";
import { describe, expect, it } from "vitest";
import { inArray, notInArray } from "./db";
import { cards, reviews } from "./schema/app";

const compile = (condition: Parameters<SQLiteAsyncDialect["sqlToQuery"]>[0]) =>
  new SQLiteAsyncDialect().sqlToQuery(condition);
const ids = Array.from({ length: 500 }, (_, i) => `card-${i}`);

describe("a list in a condition", () => {
  it("is one bound parameter however long it is", () => {
    for (const condition of [inArray(cards.id, ids), notInArray(cards.id, ids)]) {
      expect(compile(condition).params).toEqual([JSON.stringify(ids)]);
    }
  });

  it("stores each value as its column does", () => {
    const at = new Date("2026-11-22T10:00:00.500Z");
    expect(compile(inArray(reviews.reviewedAt, [at])).params).toEqual([
      JSON.stringify([reviews.reviewedAt.mapToDriverValue(at)]),
    ]);
  });

  it("matches nothing or everything when it is empty, and leaves a subquery alone", () => {
    expect(compile(inArray(cards.id, [])).sql).toBe("false");
    expect(compile(notInArray(cards.id, [])).sql).toBe("true");
    expect(compile(inArray(cards.id, sql`(select id from decks)`)).params).toEqual([]);
  });
});

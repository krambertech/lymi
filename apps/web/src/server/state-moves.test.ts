import { eq, getTableColumns, getTableName, isTable, SQLiteAsyncDialect } from "@lymi/core/db";
import type { Card, ReadwiseConnection } from "@lymi/core/schema";
import { describe, expect, it } from "vitest";
import { type Db, schema } from "./db";
import * as machines from "./state-machines";
import {
  enrichmentStatus,
  importStatus,
  inState,
  moveOnConflict,
  moveState,
  publicationStatus,
} from "./state-moves";

const where = [eq(schema.imports.id, "import")] as const;

export const compiles = (db: Db) => [
  moveState(db, importStatus, { from: "ready", to: "importing", where }),
  moveState(db, importStatus, { from: ["uploading", "ready"], to: "cancelled", where }),
  db.update(schema.imports).set({ written: 1 }),
  db.insert(schema.imports).values({} as typeof schema.imports.$inferInsert),
];

export const doesNotCompile = (
  db: Db,
  card: Partial<Card>,
  connection: Partial<ReadwiseConnection>,
) => [
  // @ts-expect-error
  moveState(db, importStatus, { to: "importing", where }),
  // @ts-expect-error
  moveState(db, importStatus, { from: "done", to: "importing", where }),
  // @ts-expect-error
  moveState(db, importStatus, { from: ["ready", "importing"], to: "cancelled", where }),
  // @ts-expect-error
  moveState(db, importStatus, { from: [], to: "cancelled", where }),
  // @ts-expect-error
  moveState(db, importStatus, { from: "ready", to: "importing", where: [] }),
  // @ts-expect-error
  moveState(db, importStatus, { from: "ready", to: "importing", set: { status: "done" }, where }),
  // @ts-expect-error
  db.update(schema.imports).set({ status: "done" }),
  // @ts-expect-error
  db.update(schema.cards).set(card),
  // @ts-expect-error
  db.update(schema.readwiseConnections).set({ ...connection, pullingUntil: null }),
  db
    .insert(schema.deckPublications)
    .values({} as typeof schema.deckPublications.$inferInsert)
    // @ts-expect-error
    .onConflictDoUpdate({ target: schema.deckPublications.deckId, set: { status: "published" } }),
];

const movedElsewhere = {
  "cards.exampleTranslationStatus":
    "written with the text it describes, which an edit clears from any state",
  "review_days.outcome":
    "settleDay compares the outcome, goal and attempts, and ReviewDay.tla models it",
  "deck_localizations.status": "an import drafts and an approval signs off from any state",
  "series_localizations.status": "an import drafts and an approval signs off from any state",
  "section_localizations.status": "an import drafts and an approval signs off from any state",
  "card_localizations.status": "an import drafts and an approval signs off from any state",
};

it("declares the moves of every status column", () => {
  const declared = Object.values(machines).map(
    ({ table, column }) => `${getTableName(table)}.${column}`,
  );
  const columns = Object.values(schema).flatMap((table) =>
    isTable(table)
      ? Object.keys(getTableColumns(table)).map((column) => `${getTableName(table)}.${column}`)
      : [],
  );
  const listed = [...declared, ...Object.keys(movedElsewhere)];
  expect(new Set(listed).size).toBe(listed.length);
  expect(columns).toEqual(expect.arrayContaining(listed));
  expect(columns.filter((name) => /status$|\.outcome$/i.test(name)).sort()).toEqual(
    listed.filter((name) => name !== "content_reports.action").sort(),
  );
});

describe("the states a move names", () => {
  const sqlOf = (guard: ReturnType<typeof inState>) =>
    new SQLiteAsyncDialect().sqlToQuery(guard).sql;

  it("matches a null state and a named one", () => {
    expect(sqlOf(inState(enrichmentStatus, [null, "failed"]))).toBe(
      '("cards"."enrichment_status" = ? or "cards"."enrichment_status" is null)',
    );
    expect(sqlOf(inState(enrichmentStatus, null))).toBe('"cards"."enrichment_status" is null');
  });

  it("guards an upsert of an existing row", () => {
    const config = moveOnConflict(publicationStatus, {
      target: schema.deckPublications.deckId,
      from: "withdrawn",
      to: "published",
    });
    expect(config.set).toEqual({ status: "published" });
    expect(config.setWhere && sqlOf(config.setWhere)).toBe('"deck_publications"."status" = ?');
  });
});

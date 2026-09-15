import { is, SQL, SQLiteAsyncDialect } from "@lymi/core/db";
import type { Db } from "./db";

const dialect = new SQLiteAsyncDialect();

/** A raw `sql` statement or a Drizzle query builder, as `db.batch` takes. */
export type BatchStatement = SQL | Parameters<Db["batch"]>[0][number];

type Built = { toSQL(): { sql: string; params: unknown[] } };

/**
 * Runs statements as one D1 batch, raw SQL included. Drizzle's own batch cannot bind a raw
 * statement's parameters, and imports need raw `json_each` inserts to stay within D1's limit
 * of 100 parameters.
 */
export function batchStatements(db: Db, statements: BatchStatement[]): Promise<D1Result[]> {
  const prepared = statements.map((statement) => {
    const { sql, params } = is(statement, SQL)
      ? dialect.sqlToQuery(statement)
      : (statement as unknown as Built).toSQL();
    return db.$client.prepare(sql).bind(...params);
  });
  return db.$client.batch(prepared);
}

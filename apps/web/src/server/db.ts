import { drizzle, type SQLiteTable } from "@lymi/core/db";
import * as schema from "@lymi/core/schema";
import type { InsertBuilder, UpdateBuilder } from "./state-moves";

const open = (d1: D1Database) => drizzle(d1, { schema });

export interface Db extends Omit<ReturnType<typeof open>, "update" | "insert" | "with"> {
  update<Table extends SQLiteTable>(table: Table): UpdateBuilder<Table>;
  insert<Table extends SQLiteTable>(table: Table): InsertBuilder<Table>;
}

export function createDb(d1: D1Database): Db {
  return open(d1) as unknown as Db;
}

export { schema };

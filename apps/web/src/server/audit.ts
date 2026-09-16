import { type Actor, newId } from "@lymi/core";
import { getTableColumns, is, SQL, sql, type Table } from "@lymi/core/db";
import type { Db } from "./db";
import { schema } from "./db";

type AuditInput = {
  userId: string;
  actor: Actor;
  /** The OAuth client or API key behind the write, when one is calling. */
  client?: string | undefined;
  /** Its name at the time of the write, so the log keeps it after the key is revoked. */
  clientName?: string | undefined;
  action: string;
  entity: "deck" | "series" | "section" | "card" | "review" | "account" | "import" | "export";
  entityId: string;
  payload?: unknown;
};

/** Prepare an audit row so a service can commit it with the write it describes. */
export function auditStatement(db: Db, entry: AuditInput) {
  return db.insert(schema.auditLog).values({
    id: newId(),
    userId: entry.userId,
    actor: entry.actor,
    actorClient: entry.client ?? null,
    actorClientName: entry.clientName ?? null,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    payload: entry.payload ?? null,
  });
}

/** An audit row that lands only if the `where` row exists in `from` when its batch reaches it. */
export function auditStatementWhen(db: Db, entry: AuditInput, from: Table, where: SQL) {
  return insertWhen(
    db,
    schema.auditLog,
    {
      id: newId(),
      userId: entry.userId,
      actor: entry.actor,
      actorClient: entry.client ?? null,
      actorClientName: entry.clientName ?? null,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      payload: JSON.stringify(entry.payload ?? null),
    },
    from,
    where,
  );
}

/**
 * Inserts one row per `from` row matching `where`. Values are keyed by column name and written in
 * `getTableColumns` order, which is the order Drizzle emits the column list in, so a column added
 * later cannot shift a value into its neighbour.
 */
export function insertWhen<T extends Table>(
  db: Db,
  table: T,
  row: { [K in keyof T["$inferInsert"]]?: unknown },
  from: Table,
  where: SQL,
) {
  const values: Record<string, SQL> = {};
  for (const [key, column] of Object.entries(getTableColumns(table))) {
    const value = (row as Record<string, unknown>)[key];
    if (value !== undefined) values[key] = sql`${value}`;
    else if (is(column.default, SQL)) values[key] = column.default;
    else values[key] = sql`${column.default ?? null}`;
  }
  return db.insert(table).select((qb) => qb.select(values).from(from).where(where) as never);
}

/** One row per write. The UI reads this to show what the API, MCP or AI changed. */
export async function audit(db: Db, entry: AuditInput) {
  await auditStatement(db, entry);
}

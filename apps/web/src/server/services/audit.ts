import { newId } from "@lymi/core";
import { getTableColumns, is, SQL, sql, type Table } from "@lymi/core/db";
import type { Db } from "../db";
import { schema } from "../db";
import type { ServiceContext } from "./context";

/**
 * An audit row is the record of one write: who made it, to what, and the ids Activity needs to
 * say where it landed. Every write goes through here so the actor, the connected app and its name
 * come from the context and no writer can leave them out. Activity reads these rows and nothing
 * else; a kind of write Activity has no sentence for is still recorded, just not shown.
 */

type Change = "create" | "update" | "archive" | "restore";

/** Every write Lymi records, keyed by what was written and what happened to it. */
export type AuditEvent =
  | {
      entity: "card";
      action:
        | Change
        | "enrich"
        | "generate_audio"
        | "approve_public_media"
        | "revoke_public_media"
        | ImageAction;
      id: string;
      /** The deck the write named, so a card moved since is not reported against its new deck. */
      deckId: string;
      details?: Details;
    }
  | {
      entity: "deck";
      action: Change | EditionAction | PublicationAction;
      id: string;
      details?: Details;
    }
  | {
      entity: "deck";
      action: "join" | "leave" | "remove_member";
      id: string;
      memberId: string;
      details?: Details;
    }
  | { entity: "deck"; action: "turn_on_join_link" | "turn_off_join_link"; id: string }
  | { entity: "series"; action: Change | "reorder"; id: string; details?: Details }
  | {
      entity: "section";
      action: Change | "reorder" | "move" | "start";
      id: string;
      details?: Details;
    }
  | { entity: "review"; action: "grade" | "undo_grade"; id: string; details?: Details }
  | {
      entity: "import";
      action: "create" | "complete" | "cancel" | "archive" | "restore";
      id: string;
      details?: Details;
    }
  | { entity: "export"; action: "create" | "complete"; id: string; details?: Details }
  | { entity: "account"; action: AccountAction; id: string; details?: Details };

type ImageAction = "set_image" | "update_image" | "archive_image" | "restore_image";
type EditionAction =
  | "import_edition"
  | "approve_edition"
  | "publish_edition"
  | "update_edition"
  | "withdraw_edition";
type PublicationAction = "publish" | "update_publication" | "withdraw_publication";
type AccountAction =
  | "avatar.upload"
  | "avatar.remove"
  | "avatar.google_refresh"
  | "send_transactional_email"
  | "send_feedback"
  | "retire_unproved_password";

type Details = Record<string, unknown>;

export type AuditEntity = AuditEvent["entity"];
export type AuditAction<E extends AuditEntity = AuditEntity> = Extract<
  AuditEvent,
  { entity: E }
>["action"];

/** Records one write as the context's learner and actor; spread a context to write as another. */
export async function audit(ctx: ServiceContext, event: AuditEvent): Promise<void> {
  await auditStatement(ctx, event);
}

/** The audit row as a statement, for the batch that holds the write it describes. */
export function auditStatement(ctx: ServiceContext, event: AuditEvent) {
  return ctx.db.insert(schema.auditLog).values(rowOf(ctx, event));
}

/** An audit row that lands only if the `where` row exists in `from` when its batch reaches it. */
export function auditStatementWhen(
  ctx: ServiceContext,
  event: AuditEvent,
  from: Table,
  where: SQL,
) {
  const row = rowOf(ctx, event);
  return insertWhen(
    ctx.db,
    schema.auditLog,
    { ...row, payload: JSON.stringify(row.payload) },
    from,
    where,
  );
}

function rowOf(ctx: ServiceContext, event: AuditEvent) {
  return {
    id: newId(),
    userId: ctx.userId,
    actor: ctx.actor,
    actorClient: ctx.client ?? null,
    actorClientName: ctx.clientName ?? null,
    action: event.action,
    entity: event.entity,
    entityId: event.id,
    payload: payloadOf(event),
  };
}

/**
 * The ids Activity reads sit beside the writer's details. The landing deck has its own key
 * because a card's history reads `deckId` in an update's details as a move to another deck.
 */
function payloadOf(event: AuditEvent): Record<string, unknown> | null {
  const details = "details" in event ? event.details : undefined;
  const ids = {
    ...("deckId" in event ? { landedIn: event.deckId } : {}),
    ...("memberId" in event ? { memberId: event.memberId } : {}),
  };
  if (!details && Object.keys(ids).length === 0) return null;
  return { ...details, ...ids };
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

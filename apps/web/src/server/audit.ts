import { type Actor, newId } from "@lymi/core";
import type { Db } from "./db";
import { schema } from "./db";

type AuditInput = {
  userId: string;
  actor: Actor;
  action: string;
  entity: "deck" | "card" | "review";
  entityId: string;
  payload?: unknown;
};

/** Prepare an audit row so a service can commit it with the write it describes. */
export function auditStatement(db: Db, entry: AuditInput) {
  return db.insert(schema.auditLog).values({
    id: newId(),
    userId: entry.userId,
    actor: entry.actor,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    payload: entry.payload ?? null,
  });
}

/** One row per write. The UI reads this to show what the API, MCP or AI changed. */
export async function audit(db: Db, entry: AuditInput) {
  await auditStatement(db, entry);
}

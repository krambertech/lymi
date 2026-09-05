import { type Actor, newId } from "@lymi/core";
import type { Db } from "./db";
import { schema } from "./db";

/** One row per write. The UI reads this to show what the API, MCP or AI changed. */
export async function audit(
  db: Db,
  entry: {
    userId: string;
    actor: Actor;
    action: string;
    entity: "deck" | "card" | "review";
    entityId: string;
    payload?: unknown;
  },
) {
  await db.insert(schema.auditLog).values({
    id: newId(),
    userId: entry.userId,
    actor: entry.actor,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId,
    payload: entry.payload ?? null,
  });
}

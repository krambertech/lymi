import type { PushEndpointInput, PushSubscriptionInput } from "@lymi/core";
import { newId } from "@lymi/core";
import { and, eq, sql } from "@lymi/core/db";
import { schema } from "../db";
import type { ServiceContext } from "./context";

export async function pushSubscriptionStatus(
  { db, userId }: ServiceContext,
  { endpoint }: PushEndpointInput,
) {
  const [row] = await db
    .select({
      reminderTime: schema.pushSubscriptions.reminderTime,
      timezone: schema.pushSubscriptions.timezone,
    })
    .from(schema.pushSubscriptions)
    .where(
      and(
        eq(schema.pushSubscriptions.userId, userId),
        eq(schema.pushSubscriptions.endpoint, endpoint),
      ),
    );
  return row
    ? { enabled: true, reminderTime: row.reminderTime, timezone: row.timezone }
    : { enabled: false, reminderTime: null, timezone: null };
}

export async function savePushSubscription(
  { db, userId }: ServiceContext,
  input: PushSubscriptionInput,
) {
  const now = new Date();
  await db
    .insert(schema.pushSubscriptions)
    .values({
      id: newId(),
      userId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      expirationTime: input.expirationTime === null ? null : new Date(input.expirationTime),
      reminderTime: input.reminderTime,
      timezone: input.timezone,
    })
    .onConflictDoUpdate({
      target: schema.pushSubscriptions.endpoint,
      set: {
        userId,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        expirationTime: input.expirationTime === null ? null : new Date(input.expirationTime),
        reminderTime: input.reminderTime,
        timezone: input.timezone,
        // A push endpoint belongs to the browser profile, not the signed-in account. If a
        // shared browser opts in as someone else, transfer ownership and its daily claim.
        lastSentLocalDate: sql`CASE
          WHEN ${schema.pushSubscriptions.userId} <> ${userId} THEN NULL
          ELSE ${schema.pushSubscriptions.lastSentLocalDate}
        END`,
        updatedAt: now,
      },
    });
  return { enabled: true, reminderTime: input.reminderTime, timezone: input.timezone };
}

export async function removePushSubscription(
  { db, userId }: ServiceContext,
  { endpoint }: PushEndpointInput,
) {
  await db
    .delete(schema.pushSubscriptions)
    .where(
      and(
        eq(schema.pushSubscriptions.userId, userId),
        eq(schema.pushSubscriptions.endpoint, endpoint),
      ),
    );
  return { ok: true as const };
}

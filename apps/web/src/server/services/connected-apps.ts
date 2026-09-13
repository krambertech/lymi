import type { Scope } from "@lymi/core";
import { and, eq, inArray, isNull } from "@lymi/core/db";
import { schema } from "../db";
import type { ServiceContext } from "./context";

/**
 * Connected apps: the MCP clients the learner has let in. Better Auth owns the consent rows
 * and the checks on them, so the route calls the plugin for those. What lives here is the
 * database either side of it — the client names a consent row does not carry, and the tokens
 * that have to be revoked for a disconnect to mean anything.
 */

/** Client names by `client_id`, for the ids given. A CIMD client has no name of its own. */
export async function clientNames(
  { db }: Pick<ServiceContext, "db">,
  clientIds: string[],
): Promise<Map<string, string | null>> {
  if (clientIds.length === 0) return new Map();
  const rows = await db
    .select({ clientId: schema.oauthClient.clientId, name: schema.oauthClient.name })
    .from(schema.oauthClient)
    .where(inArray(schema.oauthClient.clientId, clientIds));
  return new Map(rows.map((row) => [row.clientId, row.name]));
}

/** Access tokens outlive a disconnect by up to an hour, so every MCP request checks consent. */
export async function grantedScope(
  { db, userId }: Pick<ServiceContext, "db" | "userId">,
  clientId: string,
): Promise<Scope | null> {
  const rows = await db
    .select({ scopes: schema.oauthConsent.scopes })
    .from(schema.oauthConsent)
    .where(and(eq(schema.oauthConsent.clientId, clientId), eq(schema.oauthConsent.userId, userId)));
  if (rows.length === 0) return null;
  return rows.some((row) => consentScopes(row.scopes).includes("write")) ? "write" : "read";
}

/** Better Auth serialises the array before Drizzle's JSON column does, so reads yield a string. */
function consentScopes(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Deleting the consent row already stops MCP access; revoking tokens also blocks refresh and
 * keeps `/oauth2/introspect` accurate.
 */
export async function revokeClientTokens(
  { db, userId }: Pick<ServiceContext, "db" | "userId">,
  clientId: string,
) {
  const revoked = new Date();
  const mine = (table: typeof schema.oauthRefreshToken | typeof schema.oauthAccessToken) =>
    and(eq(table.clientId, clientId), eq(table.userId, userId), isNull(table.revoked));
  // D1 has no interactive transactions, so these run one after another. The refresh token
  // goes first: it is the one that decides whether the client can come back.
  await db.update(schema.oauthRefreshToken).set({ revoked }).where(mine(schema.oauthRefreshToken));
  await db.update(schema.oauthAccessToken).set({ revoked }).where(mine(schema.oauthAccessToken));
}

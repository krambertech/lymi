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

/**
 * Cut a client off from this learner.
 *
 * Deleting the consent row only decides whether the client's next authorize request prompts.
 * Access tokens are JWTs the Worker verifies against its own JWKS with no database hit, so an
 * issued one cannot be recalled and stays good until it expires, an hour at the plugin's
 * default. The refresh token is the part that can be stopped: the refresh grant checks its
 * `revoked` column. Revoke it and the client is locked out once its access token runs out.
 *
 * Access token rows are marked revoked as well. That does not gate the MCP endpoint, but it
 * keeps `/oauth2/introspect` honest about what is still live.
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

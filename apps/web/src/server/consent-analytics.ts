import { isAPIError } from "better-auth/api";
import { type AssistantClient, assistantClientOf } from "./assistant-client";

export type ConsentEvent =
  | { name: "app_connected"; client: AssistantClient; write: boolean }
  | { name: "app_connect_failed"; client: AssistantClient; reason: "declined" | "error" };

/**
 * What a learner's answer on the consent screen did, read after Better Auth's `/oauth2/consent`
 * ran. Its own before-hook has already verified the signed `oauth_query`, so the client named
 * there is the one the grant is for. Null when the answer only sent the learner back to sign in.
 */
export function consentEvent(
  body: unknown,
  returned: unknown,
  publicSiteUrl: string | undefined,
): ConsentEvent | null {
  const fields = (body ?? {}) as { oauth_query?: unknown; accept?: unknown; scope?: unknown };
  const query = new URLSearchParams(
    typeof fields.oauth_query === "string" ? fields.oauth_query : "",
  );
  const client = assistantClientOf(query.get("client_id"), publicSiteUrl);
  if (isAPIError(returned)) return { name: "app_connect_failed", client, reason: "error" };
  if (fields.accept !== true) return { name: "app_connect_failed", client, reason: "declined" };
  if (!issuedCode(returned)) return null;
  const scope = typeof fields.scope === "string" ? fields.scope : (query.get("scope") ?? "");
  return { name: "app_connected", client, write: scope.split(" ").includes("write") };
}

/** A grant ends in a redirect back to the client that carries an authorization code. */
function issuedCode(returned: unknown): boolean {
  const url = (returned as { url?: unknown } | null)?.url;
  if (typeof url !== "string") return false;
  try {
    return new URL(url).searchParams.has("code");
  } catch {
    return false;
  }
}

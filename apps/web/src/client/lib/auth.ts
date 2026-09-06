import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { createAuthClient } from "better-auth/react";
import { safeProductReturnPath } from "../../shared/origins";

/**
 * The oauthProviderClient plugin does two things for the OAuth server: it adds the current
 * page's signed `oauth_query` to sign-in calls, so a sign-in that started from an MCP
 * client's authorize request resumes that request, and it types `authClient.oauth2.*`
 * for the consent page.
 */
export const authClient = createAuthClient({
  basePath: "/api/auth",
  plugins: [oauthProviderClient()],
});

/**
 * Some sign-in responses carry a redirect back into an OAuth flow. Follow it, or return
 * false so the caller does its usual navigation.
 */
export function followOAuthRedirect(data: unknown): boolean {
  if (typeof data !== "object" || data === null) return false;
  const { redirect, url } = data as { redirect?: unknown; url?: unknown };
  if (redirect === true && typeof url === "string" && url.length > 0) {
    window.location.assign(url);
    return true;
  }
  return false;
}

/**
 * `errorCallbackURL` matters more than it looks: the invite allowlist rejects an unknown
 * account inside Google's callback, and without somewhere to send that the learner lands on
 * a raw error from the auth handler. With it they come back to the door with a sentence.
 */
export function signInWithGoogle(returnTo?: string | null) {
  const destination = safeProductReturnPath(returnTo);
  const errorCallbackURL = `/login?${new URLSearchParams({ returnTo: destination })}`;
  return authClient.signIn.social({
    provider: "google",
    callbackURL: destination,
    errorCallbackURL,
  });
}

export function signOut() {
  return authClient.signOut();
}

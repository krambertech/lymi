import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { createAuthClient } from "better-auth/react";

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

export function signInWithGoogle() {
  return authClient.signIn.social({ provider: "google", callbackURL: "/" });
}

export function signOut() {
  return authClient.signOut();
}

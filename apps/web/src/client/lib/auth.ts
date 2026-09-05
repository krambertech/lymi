import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  basePath: "/api/auth",
});

export function signInWithGoogle() {
  return authClient.signIn.social({ provider: "google", callbackURL: "/" });
}

export function signOut() {
  return authClient.signOut();
}

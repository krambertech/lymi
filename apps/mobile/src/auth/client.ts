import { expoClient } from "@better-auth/expo/client";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";

/** The Worker the app talks to. `EXPO_PUBLIC_API_URL=http://localhost:5241` points it at a local one. */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://my.lymi.app";

/** The scheme in app.json, which the Worker trusts as the phone's origin. */
const SCHEME = "lymi";

/**
 * The Worker's cookie names, which the app must keep: a loopback Worker names them after its
 * port, and production's sign-up cookie is `__Host-lymi-signup`. `apps/web/src/shared/cookies.ts`.
 */
function cookiePrefixes(url: string): string[] {
  const { hostname, port, protocol } = new URL(url);
  const loopback = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  if (!loopback) return ["lymi", "__Host-lymi"];
  return [`lymi-${port || (protocol === "https:" ? "443" : "80")}`];
}

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    expoClient({
      scheme: SCHEME,
      storagePrefix: "lymi",
      storage: SecureStore,
      cookiePrefix: cookiePrefixes(API_URL),
    }),
    emailOTPClient(),
  ],
});

/**
 * What every API request carries to be the signed-in learner: the session cookie from
 * SecureStore. Native fetch has no cookie jar of its own, so it is sent by hand.
 */
export async function sessionHeaders(): Promise<Record<string, string>> {
  const cookie = await authClient.getCookie();
  return cookie ? { cookie } : {};
}

export function useSession() {
  return authClient.useSession();
}

/** The session headers for a request React Native makes itself, such as a picture's. */
export function useSessionHeaders() {
  const [headers, setHeaders] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    let live = true;
    void sessionHeaders().then((h) => live && setHeaders(h));
    return () => {
      live = false;
    };
  }, []);
  return headers;
}

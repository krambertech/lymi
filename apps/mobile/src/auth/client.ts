import { expoClient } from "@better-auth/expo/client";
import { requireUpdate } from "@lymi/client/update-required";
import { CLIENT_HEADER, formatClientHeader, UpdateRequiredOut } from "@lymi/core";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

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

/**
 * Names this release on every request, so the Worker can tell it to update. The version is the
 * running bundle's, which an over-the-air update moves; the build is the binary's. ADR 0032.
 */
function clientHeaders(): Record<string, string> {
  const version = Constants.expoConfig?.version;
  // Without a version the Worker would take this for the oldest release, so it sends nothing.
  if (!version) return {};
  const build =
    Platform.OS === "ios"
      ? Constants.platform?.ios?.buildNumber
      : Constants.platform?.android?.versionCode?.toString();
  const platform = Platform.OS === "android" ? "android" : "ios";
  return { [CLIENT_HEADER]: formatClientHeader({ platform, version, build: build ?? undefined }) };
}

const CLIENT_HEADERS = clientHeaders();

export const authClient = createAuthClient({
  baseURL: API_URL,
  fetchOptions: {
    headers: CLIENT_HEADERS,
    // Sign-in reaches the Worker through Better Auth, so its 426 is heard here.
    onError: ({ error }) => {
      if (error.status !== 426) return;
      const body = UpdateRequiredOut.safeParse(error);
      requireUpdate({ updateUrl: body.success ? (body.data.updateUrl ?? null) : null });
    },
  },
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
 * What every API request carries: this release's name, and the session cookie from SecureStore
 * to be the signed-in learner. Native fetch has no cookie jar of its own, so it is sent by hand.
 */
export async function sessionHeaders(): Promise<Record<string, string>> {
  const cookie = await authClient.getCookie();
  return cookie ? { ...CLIENT_HEADERS, cookie } : CLIENT_HEADERS;
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

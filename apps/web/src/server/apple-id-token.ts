import type { GenericEndpointContext } from "@better-auth/core";
import { verifyProviderIdToken } from "@better-auth/core/oauth2";
import { apple } from "@better-auth/core/social-providers";

const APPLE_KEYS_URL = "https://appleid.apple.com/auth/keys";
/** Apple rotates its keys rarely; an unknown key id refetches sooner, at most once a minute. */
const KEYS_MAX_AGE_MS = 60 * 60 * 1000;
const UNKNOWN_KEY_REFETCH_MS = 60 * 1000;

type AppleKey = JsonWebKey & { kid?: string };

/** Apple's signing keys for this isolate, so a sign-in does not fetch them every time. */
let cached: { keys: AppleKey[]; fetchedAt: number } | null = null;

async function fetchAppleKeys(): Promise<AppleKey[]> {
  const response = await fetch(APPLE_KEYS_URL);
  if (!response.ok) throw new Error("Apple's signing keys are unavailable");
  const { keys } = (await response.json()) as { keys?: AppleKey[] };
  if (!keys?.length) throw new Error("Apple published no signing keys");
  cached = { keys, fetchedAt: Date.now() };
  return keys;
}

async function appleKey(kid: string | undefined): Promise<CryptoKey> {
  const age = cached ? Date.now() - cached.fetchedAt : Number.POSITIVE_INFINITY;
  let keys = age < KEYS_MAX_AGE_MS && cached ? cached.keys : await fetchAppleKeys();
  let jwk = keys.find((key) => key.kid === kid);
  if (!jwk && Date.now() - (cached?.fetchedAt ?? 0) >= UNKNOWN_KEY_REFETCH_MS) {
    keys = await fetchAppleKeys();
    jwk = keys.find((key) => key.kid === kid);
  }
  if (!jwk) throw new Error("Apple did not sign this token");
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
}

/**
 * Checks an ID token from the phone's Sign in with Apple sheet with Better Auth's own rules
 * (issuer, audience, age, nonce), against cached keys. A token without a nonce is refused, so a
 * stolen token cannot be replayed. Issue 528.
 */
export function appleIdTokenVerifier(bundleIdentifier: string) {
  const provider = apple({
    clientId: bundleIdentifier,
    clientSecret: "",
    appBundleIdentifier: bundleIdentifier,
  });
  const checker = {
    ...provider,
    idToken: { ...provider.idToken, jwks: (header: { kid?: string }) => appleKey(header.kid) },
  } as typeof provider;
  return (token: string, nonce?: string, ctx?: GenericEndpointContext): Promise<boolean> =>
    nonce ? verifyProviderIdToken(checker, token, nonce, ctx) : Promise.resolve(false);
}

/** Forgets the cached keys; tests only. */
export function forgetAppleKeys(): void {
  cached = null;
}

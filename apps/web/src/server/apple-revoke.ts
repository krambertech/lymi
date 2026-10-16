/** What Lymi needs to talk to Apple as the app: the bundle identifier and a Sign in with Apple key. */
export interface AppleKey {
  bundleIdentifier: string;
  teamId: string;
  keyId: string;
  /** The `.p8` file's PKCS #8 PEM. */
  privateKey: string;
}

export function appleKeyOf(env: {
  APPLE_APP_BUNDLE_IDENTIFIER?: string | undefined;
  APPLE_TEAM_ID?: string | undefined;
  APPLE_KEY_ID?: string | undefined;
  APPLE_PRIVATE_KEY?: string | undefined;
}): AppleKey | null {
  const { APPLE_APP_BUNDLE_IDENTIFIER, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY } = env;
  if (!APPLE_APP_BUNDLE_IDENTIFIER || !APPLE_TEAM_ID || !APPLE_KEY_ID || !APPLE_PRIVATE_KEY)
    return null;
  return {
    bundleIdentifier: APPLE_APP_BUNDLE_IDENTIFIER,
    teamId: APPLE_TEAM_ID,
    keyId: APPLE_KEY_ID,
    privateKey: APPLE_PRIVATE_KEY,
  };
}

const base64url = (bytes: Uint8Array | string) =>
  btoa(typeof bytes === "string" ? bytes : String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");

/** Apple's client secret: an ES256 JWT signed with the key, good for five minutes. */
export async function appleClientSecret(key: AppleKey, now = Date.now()): Promise<string> {
  const der = Uint8Array.from(
    atob(key.privateKey.replace(/-----[^-]+-----/g, "").replace(/\s/g, "")),
    (c) => c.charCodeAt(0),
  );
  const signer = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const iat = Math.floor(now / 1000);
  const header = base64url(JSON.stringify({ alg: "ES256", kid: key.keyId }));
  const claims = base64url(
    JSON.stringify({
      iss: key.teamId,
      iat,
      exp: iat + 300,
      aud: "https://appleid.apple.com",
      sub: key.bundleIdentifier,
    }),
  );
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    signer,
    new TextEncoder().encode(`${header}.${claims}`),
  );
  return `${header}.${claims}.${base64url(new Uint8Array(signature))}`;
}

/**
 * Trades the authorization code from a fresh Sign in with Apple for a refresh token and revokes
 * it, which ends the app's grant in the person's Apple ID settings. Apple requires this when an
 * account is deleted. False when Apple refused either call; the delete goes ahead regardless.
 */
export async function revokeAppleGrant(
  key: AppleKey,
  authorizationCode: string,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  const secret = await appleClientSecret(key);
  const exchange = await fetcher("https://appleid.apple.com/auth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: key.bundleIdentifier,
      client_secret: secret,
      code: authorizationCode,
      grant_type: "authorization_code",
    }),
  });
  if (!exchange.ok) return false;
  const { refresh_token: token } = (await exchange.json()) as { refresh_token?: string };
  if (!token) return false;
  const revoke = await fetcher("https://appleid.apple.com/auth/revoke", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: key.bundleIdentifier,
      client_secret: secret,
      token,
      token_type_hint: "refresh_token",
    }),
  });
  return revoke.ok;
}

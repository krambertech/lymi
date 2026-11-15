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

/** The key for each client a token can be issued to: the phone app, and the web's Services ID. */
export interface AppleClients {
  app: AppleKey;
  web: AppleKey | null;
}

export function appleClientsOf(
  env: Parameters<typeof appleKeyOf>[0] & { APPLE_CLIENT_ID?: string | undefined },
): AppleClients | null {
  const app = appleKeyOf(env);
  if (!app) return null;
  return {
    app,
    web: env.APPLE_CLIENT_ID ? { ...app, bundleIdentifier: env.APPLE_CLIENT_ID } : null,
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

/** Why a call to Apple did not do its job, and whether trying again could change that. */
export type AppleRefusal = { ok: false; retry: boolean; status: number | null };

async function postToApple(
  fetcher: typeof fetch,
  path: "token" | "revoke",
  body: Record<string, string>,
): Promise<Response | null> {
  try {
    return await fetcher(`https://appleid.apple.com/auth/${path}`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body),
    });
  } catch {
    return null;
  }
}

/**
 * Trades the authorization code from a fresh Sign in with Apple for a refresh token. The code is
 * spent by the first call that reaches Apple, so a refusal with a status is final.
 */
export async function exchangeAppleCode(
  key: AppleKey,
  authorizationCode: string,
  fetcher: typeof fetch = fetch,
): Promise<{ ok: true; token: string } | AppleRefusal> {
  const response = await postToApple(fetcher, "token", {
    client_id: key.bundleIdentifier,
    client_secret: await appleClientSecret(key),
    code: authorizationCode,
    grant_type: "authorization_code",
  });
  if (!response) return { ok: false, retry: true, status: null };
  if (!response.ok) return { ok: false, retry: response.status >= 500, status: response.status };
  const { refresh_token: token } = (await response.json().catch(() => ({}))) as {
    refresh_token?: string;
  };
  return token ? { ok: true, token } : { ok: false, retry: false, status: response.status };
}

/**
 * Revokes a refresh token, which ends the app's grant in the person's Apple ID settings. Apple
 * requires this when an account is deleted. `key.bundleIdentifier` must be the client the token
 * was issued to.
 */
export async function revokeAppleToken(
  key: AppleKey,
  token: string,
  fetcher: typeof fetch = fetch,
): Promise<{ ok: true } | AppleRefusal> {
  const response = await postToApple(fetcher, "revoke", {
    client_id: key.bundleIdentifier,
    client_secret: await appleClientSecret(key),
    token,
    token_type_hint: "refresh_token",
  });
  if (response?.ok) return { ok: true };
  return { ok: false, retry: true, status: response?.status ?? null };
}

async function sealingKey(key: AppleKey): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`lymi-apple-token:${key.privateKey}`),
  );
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

/** Encrypts a token for D1 with a key derived from the Sign in with Apple key, a Worker secret. */
export async function sealAppleToken(key: AppleKey, token: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      await sealingKey(key),
      new TextEncoder().encode(token),
    ),
  );
  return `${base64url(iv)}.${base64url(sealed)}`;
}

/** Null when the token was sealed with another key, as after the Apple key is rotated. */
export async function openAppleToken(key: AppleKey, sealed: string): Promise<string | null> {
  const [iv = "", data = ""] = sealed.split(".");
  const bytes = (part: string) =>
    Uint8Array.from(atob(part.replaceAll("-", "+").replaceAll("_", "/")), (c) => c.charCodeAt(0));
  try {
    const opened = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bytes(iv) },
      await sealingKey(key),
      bytes(data),
    );
    return new TextDecoder().decode(opened);
  } catch {
    return null;
  }
}

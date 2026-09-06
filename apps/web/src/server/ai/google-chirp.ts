import type { Fetch, SpeechProvider, SpeechRequest } from "./types";

const TTS_URL = "https://texttospeech.googleapis.com/v1/text:synthesize";
const CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
const DEFAULT_TOKEN_URL = "https://oauth2.googleapis.com/token";
const MAX_RESPONSE_BYTES = 8_000_000;

export type GoogleChirpBindings = {
  GOOGLE_CLOUD_TTS_CREDENTIALS?: string | undefined;
};

type ServiceAccountCredentials = {
  type: "service_account";
  project_id: string;
  private_key_id?: string | undefined;
  private_key: string;
  client_email: string;
  token_uri?: string | undefined;
};

type Token = { value: string; expiresAt: number; clientEmail: string; privateKeyId: string };
let cachedToken: Token | null = null;

export class GoogleChirpError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "GoogleChirpError";
  }
}

export interface GoogleChirpDependencies {
  locale: string;
  voice?: string | undefined;
  request?: Fetch | undefined;
  accessToken?: (() => Promise<string>) | undefined;
}

/** Cloud Text-to-Speech Chirp 3 HD. Credentials are parsed only after R2 cache misses. */
export function createGoogleChirpProvider(
  env: GoogleChirpBindings,
  dependencies: GoogleChirpDependencies,
): SpeechProvider {
  const request = dependencies.request ?? fetch;
  const voice = dependencies.voice ?? "Kore";
  const voiceName = `${dependencies.locale}-Chirp3-HD-${voice}`;

  return {
    provider: "google-chirp",
    model: "chirp-3-hd",
    voice,
    locale: dependencies.locale,
    contentType: "audio/mpeg",
    extension: "mp3",
    async speech(input: SpeechRequest): Promise<Response> {
      const credentials = readCredentials(env);
      const token = dependencies.accessToken
        ? await dependencies.accessToken()
        : await serviceAccountAccessToken(credentials, request);
      const response = await fetchWithRetry(request, TTS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "x-goog-user-project": credentials.project_id,
        },
        body: JSON.stringify({
          input: { text: input.text },
          voice: { languageCode: dependencies.locale, name: voiceName },
          audioConfig: { audioEncoding: "MP3" },
        }),
      });
      const payload = await boundedJson(response);
      const encoded = audioContent(payload);
      if (!encoded) throw new GoogleChirpError("Google Chirp returned no audio");
      try {
        return new Response(decodeBase64(encoded), { headers: { "Content-Type": "audio/mpeg" } });
      } catch (cause) {
        throw new GoogleChirpError("Google Chirp returned invalid audio", { cause });
      }
    },
  };
}

function readCredentials(env: GoogleChirpBindings): ServiceAccountCredentials {
  const raw = env.GOOGLE_CLOUD_TTS_CREDENTIALS?.trim();
  if (!raw) throw new GoogleChirpError("Google Chirp is not configured");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    throw new GoogleChirpError("Google Chirp credentials are invalid", { cause });
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("type" in parsed) ||
    parsed.type !== "service_account" ||
    !("project_id" in parsed) ||
    typeof parsed.project_id !== "string" ||
    !("private_key" in parsed) ||
    typeof parsed.private_key !== "string" ||
    !("client_email" in parsed) ||
    typeof parsed.client_email !== "string"
  ) {
    throw new GoogleChirpError("Google Chirp credentials are invalid");
  }
  return parsed as ServiceAccountCredentials;
}

async function serviceAccountAccessToken(
  credentials: ServiceAccountCredentials,
  request: Fetch,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const privateKeyId = credentials.private_key_id ?? "";
  if (
    cachedToken &&
    cachedToken.clientEmail === credentials.client_email &&
    cachedToken.privateKeyId === privateKeyId &&
    cachedToken.expiresAt > now + 60
  ) {
    return cachedToken.value;
  }

  const tokenUrl = credentials.token_uri ?? DEFAULT_TOKEN_URL;
  const assertion = await signedAssertion(credentials, tokenUrl, now);
  const response = await fetchWithRetry(request, tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const payload = await boundedJson(response);
  if (
    !payload ||
    typeof payload !== "object" ||
    !("access_token" in payload) ||
    typeof payload.access_token !== "string"
  ) {
    throw new GoogleChirpError("Google OAuth returned no access token");
  }
  const expiresIn =
    "expires_in" in payload && typeof payload.expires_in === "number" ? payload.expires_in : 3600;
  cachedToken = {
    value: payload.access_token,
    expiresAt: now + expiresIn,
    clientEmail: credentials.client_email,
    privateKeyId,
  };
  return payload.access_token;
}

async function signedAssertion(
  credentials: ServiceAccountCredentials,
  audience: string,
  issuedAt: number,
): Promise<string> {
  const header = {
    alg: "RS256",
    typ: "JWT",
    ...(credentials.private_key_id ? { kid: credentials.private_key_id } : {}),
  };
  const claims = {
    iss: credentials.client_email,
    scope: CLOUD_PLATFORM_SCOPE,
    aud: audience,
    iat: issuedAt,
    exp: issuedAt + 3600,
  };
  const unsigned = `${base64UrlJson(header)}.${base64UrlJson(claims)}`;
  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey(
      "pkcs8",
      pemBytes(credentials.private_key),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    );
  } catch (cause) {
    throw new GoogleChirpError("Google Chirp private key is invalid", { cause });
  }
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  return `${unsigned}.${base64Url(new Uint8Array(signature))}`;
}

async function fetchWithRetry(request: Fetch, url: string, init: RequestInit): Promise<Response> {
  let lastStatus = 0;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let response: Response;
    try {
      response = await request(url, { ...init, signal: AbortSignal.timeout(30_000) });
    } catch (cause) {
      if (attempt === 1) throw new GoogleChirpError("Google Chirp could not be reached", { cause });
      await pause(200);
      continue;
    }
    if (response.ok) return response;
    lastStatus = response.status;
    const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
    await response.body?.cancel();
    if (!retryable || attempt === 1) {
      throw new GoogleChirpError(`Google Chirp request failed (${response.status})`);
    }
    await pause(200 * (attempt + 1));
  }
  throw new GoogleChirpError(`Google Chirp request failed (${lastStatus})`);
}

async function boundedJson(response: Response): Promise<unknown> {
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > MAX_RESPONSE_BYTES) {
    await response.body?.cancel();
    throw new GoogleChirpError("Google Chirp returned an oversized response");
  }
  try {
    return await response.json();
  } catch (cause) {
    throw new GoogleChirpError("Google Chirp returned invalid JSON", { cause });
  }
}

function audioContent(payload: unknown): string | null {
  return payload &&
    typeof payload === "object" &&
    "audioContent" in payload &&
    typeof payload.audioContent === "string" &&
    payload.audioContent.length > 0
    ? payload.audioContent
    : null;
}

function pemBytes(pem: string): Uint8Array {
  return decodeBase64(pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, ""));
}

function base64UrlJson(value: unknown): string {
  return base64Url(new TextEncoder().encode(JSON.stringify(value)));
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Bindings and secrets the Worker expects. `wrangler types` generates the global `Env`
 * from wrangler.jsonc; this narrows the secrets, which live in .dev.vars locally and in
 * `wrangler secret` in production.
 */
export interface Bindings extends Env {
  /** Secrets are not emitted by `wrangler types` unless they exist in the local environment. */
  BETTER_AUTH_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  /** Full service-account JSON, stored as one encrypted Worker secret. */
  GOOGLE_CLOUD_TTS_CREDENTIALS?: string;
  OPENAI_API_KEY?: string;
  OPENAI_BASE_URL?: string;
  OPENAI_SPEECH_MODEL?: string;
  OPENAI_SPEECH_VOICE?: string;
  AI_GATEWAY_TOKEN?: string;
  /** Web Push is unavailable until all three VAPID values are configured as secrets. */
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
  /** The token OpenAI's plugin submission portal issues for domain verification. */
  OPENAI_APPS_CHALLENGE?: string;
}

/** True for localhost, 127.0.0.1 and [::1]. Decides every local-only capability. */
export function isLoopbackUrl(value: string): boolean {
  try {
    const hostname = new URL(value).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}

/**
 * The developer tools exist only while the product is served from a loopback origin:
 * email sign-in, the `/api/dev` routes and the persona accounts. Production's PRODUCT_URL
 * is `https://my.lymi.app`, so none of it is reachable there.
 */
export function devToolsEnabled(env: { PRODUCT_URL: string }): boolean {
  return isLoopbackUrl(env.PRODUCT_URL);
}

/** Persona accounts end in this domain. They exist only in a local D1. */
export const DEV_EMAIL_DOMAIN = "@lymi.local";

export function allowedEmails(env: Bindings): Set<string> {
  return new Set(
    (env.ALLOWED_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

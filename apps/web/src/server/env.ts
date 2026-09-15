import { isLoopbackUrl } from "../shared/origins";

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
  GEMINI_SPEECH_MODEL?: string;
  GEMINI_SPEECH_VOICE?: string;
  OPENAI_API_KEY?: string;
  OPENAI_BASE_URL?: string;
  OPENAI_SPEECH_MODEL?: string;
  OPENAI_SPEECH_VOICE?: string;
  AI_GATEWAY_TOKEN?: string;
  /** Web Push is unavailable until all three VAPID values are configured as secrets. */
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
  /** Present only on isolated pull-request Workers. */
  APP_PREVIEW?: string;
  /** Capability checked before an isolated pull-request Worker serves the product. */
  APP_PREVIEW_KEY?: string;
  /** The token OpenAI's plugin submission portal issues for domain verification. */
  OPENAI_APPS_CHALLENGE?: string;
}

/** Preview-only capabilities fail closed unless both the build flag and isolated hostname agree. */
export function appPreviewEnabled(env: {
  PRODUCT_URL: string;
  APP_PREVIEW?: string | undefined;
}): boolean {
  if (env.APP_PREVIEW !== "true") return false;
  try {
    const url = new URL(env.PRODUCT_URL);
    return (
      url.protocol === "https:" &&
      /^preview-lymi-app-pr-\d+\.[a-z0-9-]+\.workers\.dev$/.test(url.hostname) &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

export function devToolsEnabled(
  env: { PRODUCT_URL: string } & Partial<Pick<Bindings, "APP_PREVIEW" | "APP_PREVIEW_KEY">>,
): boolean {
  return isLoopbackUrl(env.PRODUCT_URL) || appPreviewEnabled(env);
}

function originOf(value: string | undefined): string | null {
  try {
    return value ? new URL(value).origin : null;
  } catch {
    return null;
  }
}

/** A loopback product follows the request's port so parallel worktrees need no `.dev.vars` edit. */
export function withServedOrigin<T extends { PRODUCT_URL: string; PUBLIC_SITE_URL?: string }>(
  requestUrl: string,
  env: T,
): T {
  const configured = originOf(env.PRODUCT_URL);
  const served = originOf(requestUrl);
  if (!configured || !served || configured === served) return env;
  if (!isLoopbackUrl(configured) || !isLoopbackUrl(served)) return env;

  const siteFollows = originOf(env.PUBLIC_SITE_URL) === configured;
  return { ...env, PRODUCT_URL: served, ...(siteFollows ? { PUBLIC_SITE_URL: served } : {}) };
}

/** Persona accounts end in this domain. They exist only in a local D1. */
export const DEV_EMAIL_DOMAIN = "@lymi.local";

export function allowedEmails(env: Bindings): Set<string> {
  return emailSet(env.ALLOWED_EMAILS);
}

/** Accounts that may exercise operational capabilities such as a production email smoke test. */
export function operatorEmails(env: Bindings): Set<string> {
  return emailSet(env.OPERATOR_EMAILS);
}

/** Accounts that may publish a deck they own to the public catalog. ADR 0020. */
export function publisherEmails(env: Bindings): Set<string> {
  return emailSet(env.PUBLISHER_EMAILS);
}

function emailSet(list: string | undefined): Set<string> {
  return new Set(
    (list ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

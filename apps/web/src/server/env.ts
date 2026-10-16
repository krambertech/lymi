import { isLoopbackUrl } from "../shared/origins";

/**
 * Bindings and secrets the Worker expects. `wrangler types` generates the global `Env`
 * from wrangler.jsonc; this narrows the secrets, which live in .dev.vars locally and in
 * `wrangler secret` in production.
 */
export interface Bindings
  extends Omit<
    Env,
    | "REQUESTS"
    | "EVENTS"
    | "POSTHOG_PROJECT_TOKEN"
    | "PHONE_MINIMUM_VERSION_IOS"
    | "PHONE_UPDATE_URL_IOS"
    | "AI_GATEWAY_ID"
    | "AI_GATEWAY_URL"
  > {
  /** Optional in local tests and loopback; previews use isolated datasets. */
  REQUESTS?: AnalyticsEngineDataset;
  EVENTS?: AnalyticsEngineDataset;
  POSTHOG_PROJECT_TOKEN?: string;
  /** Unset means every iPhone release is served. */
  PHONE_MINIMUM_VERSION_IOS?: string;
  PHONE_UPDATE_URL_IOS?: string;
  /** Secrets are not emitted by `wrangler types` unless they exist in the local environment. */
  BETTER_AUTH_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  /** The iPhone app's bundle identifier; Sign in with Apple is unavailable until it is set. */
  APPLE_APP_BUNDLE_IDENTIFIER?: string;
  /** A Sign in with Apple key, so a deleted account's Apple grant is revoked. All three or none. */
  APPLE_TEAM_ID?: string;
  APPLE_KEY_ID?: string;
  APPLE_PRIVATE_KEY?: string;
  /** A personal key with person write scope and its project, so a deleted account leaves PostHog. */
  POSTHOG_PERSONAL_API_KEY?: string;
  POSTHOG_PROJECT_ID?: string;
  /** Full service-account JSON, stored as one encrypted Worker secret. */
  GOOGLE_CLOUD_TTS_CREDENTIALS?: string;
  GEMINI_API_KEY?: string;
  ELEVENLABS_API_KEY?: string;
  ELEVENLABS_SPEECH_MODEL?: string;
  ELEVENLABS_SPEECH_VOICES?: string;
  GEMINI_SPEECH_MODEL?: string;
  GEMINI_SPEECH_VOICE?: string;
  OPENAI_API_KEY?: string;
  OPENAI_SPEECH_MODEL?: string;
  OPENAI_SPEECH_VOICE?: string;
  OPENAI_TEXT_MODEL?: string;
  /** Sends OpenAI, Anthropic, ElevenLabs and Gemini calls through AI_GATEWAY_URL; unset, they go direct. */
  AI_GATEWAY_TOKEN?: string;
  ANTHROPIC_API_KEY?: string;
  /** An organisation-wide Anthropic key needs the workspace it bills to. */
  ANTHROPIC_WORKSPACE_ID?: string;
  ANTHROPIC_LESSON_MODEL?: string;
  AI_GATEWAY_URL?: string;
  /** The AI Gateway that Workers AI calls go through; empty calls Workers AI directly. */
  AI_GATEWAY_ID?: string;
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
  /** The phone app's Team ID and bundle, `TEAMID.app.lymi`; universal links are off without it. */
  APPLE_APP_ID?: string;
  /** Comma-separated SHA-256 fingerprints of the Android app's signing certificates; app links are off without them. */
  ANDROID_CERT_FINGERPRINTS?: string;
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

/** Accounts that may exercise operational capabilities such as a production email smoke test. */
export function operatorEmails(env: Bindings): Set<string> {
  return emailSet(env.OPERATOR_EMAILS);
}

/** Accounts that may publish a deck they own to the public catalog. ADR 0020. */
export function publisherEmails(env: { PUBLISHER_EMAILS?: string | undefined }): Set<string> {
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

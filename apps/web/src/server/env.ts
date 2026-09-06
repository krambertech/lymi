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
  OPENAI_API_KEY?: string;
  /** Web Push is unavailable until all three VAPID values are configured as secrets. */
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
}

export function allowedEmails(env: Bindings): Set<string> {
  return new Set(
    (env.ALLOWED_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

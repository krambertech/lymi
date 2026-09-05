/**
 * Bindings and secrets the Worker expects. `wrangler types` generates the global `Env`
 * from wrangler.jsonc; this narrows the secrets, which live in .dev.vars locally and in
 * `wrangler secret` in production.
 */
export interface Bindings {
  DB: D1Database;
  AUDIO: R2Bucket;
  SESSIONS: KVNamespace;
  ASSETS: Fetcher;
  APP_URL: string;
  ALLOWED_EMAILS: string;
  BETTER_AUTH_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  OPENAI_API_KEY?: string;
}

export function allowedEmails(env: Bindings): Set<string> {
  return new Set(
    (env.ALLOWED_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

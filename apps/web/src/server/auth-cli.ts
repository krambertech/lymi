/**
 * Config used only by `pnpm auth:schema` (the Better Auth CLI) to generate the Drizzle
 * schema in packages/core/src/schema/auth.ts. Keep the options that affect tables in
 * sync with createAuth() in ./auth.ts. Never imported by the Worker.
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const auth = betterAuth({
  // biome-ignore lint/suspicious/noExplicitAny: the CLI never queries; it only reads the option shape
  database: drizzleAdapter({} as any, { provider: "sqlite" }),
  emailAndPassword: { enabled: true },
  socialProviders: { google: { clientId: "cli", clientSecret: "cli" } },
});

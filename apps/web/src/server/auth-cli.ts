/**
 * Config used only by `pnpm auth:schema` (the Better Auth CLI) to generate the Drizzle
 * schema in packages/core/src/schema/auth.ts. Keep the plugins and the options that affect
 * tables in sync with createAuth() in ./auth.ts. Never imported by the Worker.
 *
 * This exports a bare `{ options }` object rather than calling `betterAuth()`. The CLI only
 * reads `.options`, and constructing the instance would run plugin init (the OAuth provider
 * seeds its resources table) against a database that does not exist here.
 */
import { apiKey } from "@better-auth/api-key";
import { cimd } from "@better-auth/cimd";
import { mcp } from "@better-auth/mcp";
import type { BetterAuthOptions, BetterAuthPlugin } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { jwt } from "better-auth/plugins/jwt";

const options = {
  // biome-ignore lint/suspicious/noExplicitAny: the CLI never queries; it only reads the option shape
  database: drizzleAdapter({} as any, { provider: "sqlite", schema: {} }),
  emailAndPassword: { enabled: true },
  socialProviders: { google: { clientId: "cli", clientSecret: "cli" } },
  plugins: [
    apiKey(),
    jwt(),
    // Same cast as in auth.ts: the provider's metadata types clash with exactOptionalPropertyTypes.
    mcp({
      loginPage: "/login",
      consentPage: "/consent",
      resource: "https://cli.invalid/mcp",
    }) as unknown as BetterAuthPlugin,
    cimd({ fetchClientMetadataResource: fetch }),
  ],
} satisfies BetterAuthOptions;

export const auth = { options };

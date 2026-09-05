/**
 * Server-only entry: the D1 driver and query operators, re-exported so the whole
 * workspace shares one drizzle-orm instance. Import as "@lymi/core/db".
 * (better-auth brings kysely, which would otherwise make pnpm create a second
 * drizzle-orm build for the app and split the types.)
 */
export * from "drizzle-orm";
export { drizzle } from "drizzle-orm/d1";

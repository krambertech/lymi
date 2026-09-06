import { drizzle } from "@lymi/core/db";
import { betaSignups } from "@lymi/core/schema";

export function createDb(binding: D1Database) {
  return drizzle(binding, { schema: { betaSignups } });
}

export type Db = ReturnType<typeof createDb>;

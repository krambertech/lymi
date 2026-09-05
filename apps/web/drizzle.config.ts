import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  driver: "d1-http",
  schema: "../../packages/core/src/schema/index.ts",
  out: "./migrations",
});

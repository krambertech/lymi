import { defineConfig } from "vitest/config";

// The modules here that import nothing native, run in Node.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});

import { defineConfig } from "vitest/config";

// The app's own rules, in Node: only modules that import nothing from Electron are tested here.
export default defineConfig({ test: { include: ["src/**/*.test.ts"], environment: "node" } });

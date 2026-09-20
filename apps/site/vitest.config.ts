import { lingui, linguiTransformerBabelPreset } from "@lingui/vite-plugin";
import babel from "@rolldown/plugin-babel";
import { defineConfig } from "vitest/config";

/** The same catalog and macro handling Astro gives the pages, so a test can read the real strings. */
export default defineConfig({
  plugins: [
    lingui({ failOnMissing: true }),
    babel({ include: [/\/src\/.*\.tsx?(\?.*)?$/], presets: [linguiTransformerBabelPreset()] }),
  ],
  test: {
    include: ["src/**/*.test.ts"],
  },
});

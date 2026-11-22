import { lingui, linguiTransformerBabelPreset } from "@lingui/vite-plugin";
import babel from "@rolldown/plugin-babel";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

/** The same catalog and macro handling Astro gives the pages, so a test can read the real strings. */
export default defineConfig({
  plugins: [
    lingui({ failOnMissing: true }),
    babel({ include: [/\/src\/.*\.tsx?(\?.*)?$/], presets: [linguiTransformerBabelPreset()] }),
  ],
  test: {
    projects: [
      { extends: true, test: { name: "unit", include: ["src/**/*.test.ts"] } },
      {
        extends: true,
        optimizeDeps: {
          include: [
            "react",
            "react-dom",
            "react-dom/client",
            "vitest-browser-react",
            "@lingui/core",
            "@lingui/react",
            "motion/react",
            "lucide-react",
            "clsx",
          ],
        },
        test: {
          name: "components",
          include: ["src/**/*.browser.test.tsx"],
          browser: {
            enabled: true,
            headless: true,
            screenshotFailures: false,
            provider: playwright({ contextOptions: { reducedMotion: "reduce" } }),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
